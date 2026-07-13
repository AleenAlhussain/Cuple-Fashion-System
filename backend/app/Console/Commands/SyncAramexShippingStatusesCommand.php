<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\AramexTrackingPayloadParser;
use App\Services\AramexTrackingService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class SyncAramexShippingStatusesCommand extends Command
{
    protected const LOG_MARKER = 'NEW_CODE_2026_02_04';
    protected $signature = 'aramex:sync-statuses {--chunk=25} {--max-age-days=14} {--order-id=} {--include-delivered}';
    protected $description = 'Sync Aramex tracking stages into orders.status with forward-only transitions.';

    public function __construct(
        protected AramexTrackingService $trackingService,
        protected AramexTrackingPayloadParser $payloadParser
    ) {
        parent::__construct();
    }

    public function handle()
    {
        $chunkSize = (int) $this->option('chunk');
        $maxAgeDays = (int) $this->option('max-age-days');
        $orderId = $this->option('order-id') ? (int) $this->option('order-id') : null;
        $includeDelivered = (bool) $this->option('include-delivered');

        Log::info('[AramexSync] START', [
            'marker' => self::LOG_MARKER,
            'chunk' => $chunkSize,
            'max_age_days' => $maxAgeDays,
            'order_id' => $orderId,
            'include_delivered' => $includeDelivered,
        ]);

        $query = Order::query()
            ->whereRaw('LOWER(carrier) = ?', ['aramex'])
            ->whereNotNull('tracking_number')
            ->where('status', '!=', 'cancelled');

        $statuses = ['shipped', 'out-for-delivery'];
        if ($includeDelivered) {
            $statuses[] = 'delivered';
        }

        $query->whereIn('status', $statuses);

        if ($orderId) {
            $query->where('id', $orderId);
        } elseif ($maxAgeDays > 0) {
            $query->where('shipped_at', '>=', Carbon::now()->subDays($maxAgeDays));
        }

        $query->chunkById($chunkSize, function ($orders) {
            foreach ($orders as $order) {
                $this->syncOrder($order);
            }
        });

        Log::info('[AramexSync] END', [
            'marker' => self::LOG_MARKER,
            'order_id' => $orderId,
        ]);

        return 0;
    }

    protected function syncOrder(Order $order): void
    {
        Log::info('[AramexSync] ENTER syncOrder()', [
            'marker' => self::LOG_MARKER,
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'order_status' => $order->status,
            'awb' => (string) $order->tracking_number,
        ]);

        try {
            $awb = (string) $order->tracking_number;

            // 1) Fetch tracking from Aramex
            $response = $this->trackingService->track([$awb]);

            // 2) Normalize carrier payload
            $payload = $this->payloadParser->extractCarrierPayload($this->toDeepArray($response));

            if (empty($payload)) {
                Log::info('[AramexSync] EMPTY payload (no carrier payload extracted)', [
                    'order_id' => $order->id,
                    'awb' => $awb,
                    'marker' => self::LOG_MARKER,
                ]);
                return;
            }

            // 3) Keep only this AWB
            $payload = $this->payloadParser->keepOnlyAwb($payload, $awb);

            // 4) Extract raw Aramex events safely (handles KV wrapper + list)
            $trackingResults = data_get($payload, 'TrackingResults');
            $trackingResultsType = get_debug_type($trackingResults);
            $trackingResultsIsList = is_array($trackingResults) && array_is_list($trackingResults);
            $trackingResultsKeysSample = is_array($trackingResults) ? array_slice(array_keys($trackingResults), 0, 5) : null;
            $events = $this->extractAramexEvents($payload);

            Log::info('[AramexSync] payload debug', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'order_status' => $order->status,
                'awb' => $awb,
                'trackingresults_type' => $trackingResultsType,
                'trackingresults_is_list' => $trackingResultsIsList,
                'trackingresults_keys_sample' => $trackingResultsKeysSample,
                'events_count' => count($events),
                'codes_sample' => collect($events)
                    ->map(fn ($e) => data_get($e, 'UpdateCode'))
                    ->filter()
                    ->values()
                    ->take(5)
                    ->all(),
                'first_desc' => data_get($events[0] ?? null, 'UpdateDescription'),
                'first_dt' => data_get($events[0] ?? null, 'UpdateDateTime'),
                'marker' => self::LOG_MARKER,
            ]);

            if (empty($events)) {
                // لا نحدّث شيء إذا ما في events
                return;
            }

            // 5) Compute strongest stage from events (forward-only)
            [$strongest, $deliveredAt, $warningMessage] = $this->computeStrongestFromEvents($events);

            Log::info('[AramexSync] strongest computed', [
                'marker' => self::LOG_MARKER,
                'order_id' => $order->id,
                'awb' => $awb,
                'strongest' => $strongest,
                'delivered_at_raw' => $deliveredAt,
                'warning' => $warningMessage,
            ]);

            // 6) Apply forward-only update
            $update = [];

            // منطق بسيط:
            // - إذا وصلت Delivered => delivered + delivered_at
            // - إذا Out For Delivery => نرفع status فقط لو الحالي shipped
            if ($strongest === 'DELIVERED') {
                $update['status'] = 'delivered';
                $update['delivered_at'] = $this->parseDate($deliveredAt) ?? Carbon::now();
            } elseif ($strongest === 'OUT_FOR_DELIVERY' && $order->status === 'shipped') {
                $update['status'] = 'out-for-delivery';
            }

            if (!empty($update)) {
                $oldStatus = $order->status;
                $order->update($update);

                Log::info('[AramexSync] order updated', [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'awb' => $awb,
                    'old_status' => $oldStatus,
                    'new_status' => $order->status,
                    'update_payload' => $update,
                    'marker' => self::LOG_MARKER,
                ]);
            } else {
                Log::info('[AramexSync] no status upgrade (forward-only)', [
                    'order_id' => $order->id,
                    'awb' => $awb,
                    'current_status' => $order->status,
                    'strongest' => $strongest,
                    'marker' => self::LOG_MARKER,
                ]);
            }

            if ($warningMessage) {
                $this->recordWarning($order, $warningMessage);
                Log::info('[AramexSync] warning saved to admin_notes', [
                    'order_id' => $order->id,
                    'awb' => $awb,
                    'warning' => $warningMessage,
                    'marker' => self::LOG_MARKER,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('[AramexSync] failed', [
                'order_id' => $order->id ?? null,
                'awb' => $order->tracking_number ?? null,
                'error' => $e->getMessage(),
                'marker' => self::LOG_MARKER,
            ]);
        }
    }

    /**
     * Compute strongest shipping stage from Aramex raw events list.
     *
     * @return array{0:string,1:?string,2:?string} [strongestStage, deliveredAtISO, warningMessage]
     */
    protected function computeStrongestFromEvents(array $events): array
    {
        $strongest = 'SHIPPED';
        $deliveredAt = null;
        $warningMessage = null;

        foreach ($events as $e) {
            $code = strtoupper((string) data_get($e, 'UpdateCode', ''));
            $desc = strtolower((string) data_get($e, 'UpdateDescription', ''));
            $dt = (string) (data_get($e, 'UpdateDateTime') ?? '');

            // Delivered (strongest)
            if ($code === 'SH005' || str_contains($desc, 'delivered')) {
                $strongest = 'DELIVERED';
                $deliveredAt = $dt ?: $deliveredAt;
                break;
            }

            // Out for delivery
            if ($code === 'SH003' || str_contains($desc, 'out for delivery')) {
                if ($strongest !== 'DELIVERED') {
                    $strongest = 'OUT_FOR_DELIVERY';
                }
            }

            // Warnings
            if (!$warningMessage && $this->isWarningEvent($code, $desc)) {
                $warningMessage = $this->buildWarningMessage($code, (string) data_get($e, 'UpdateDescription', ''));
            }
        }

        return [$strongest, $deliveredAt, $warningMessage];
    }

    protected function isWarningEvent(string $code, string $desc): bool
    {
        $hayCode = strtolower($code);
        $hayDesc = strtolower($desc);

        $keywords = ['hold', 'attempt', 'custom', 'return', 'lost', 'confiscated', 'delay', 'failed', 'refused'];
        foreach ($keywords as $needle) {
            if (str_contains($hayCode, $needle) || str_contains($hayDesc, $needle)) {
                return true;
            }
        }
        return false;
    }

    protected function buildWarningMessage(string $code, string $desc): string
    {
        $code = trim($code);
        $desc = trim($desc);
        return trim("Aramex warning detected: {$code} - {$desc}");
    }

    protected function recordWarning(Order $order, string $message): void
    {
        if (!$message)
            return;

        $existing = $order->admin_notes ?? '';
        if (str_contains($existing, $message)) {
            return;
        }

        $note = '[' . now()->format('Y-m-d H:i') . '] ' . $message;
        $order->admin_notes = trim(($existing ? $existing . "\n" : '') . $note);
        $order->saveQuietly();
    }

    protected function parseDate(?string $value): ?Carbon
    {
        if (!$value)
            return null;

        try {
            return Carbon::parse($value);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Extract raw Aramex events from payload. Handles:
     * - TrackingResults as list
     * - TrackingResults as KV map (KeyValueOfstringArrayOfTrackingResult...)
     * - Value->TrackingResult nesting
     */
    protected function extractAramexEvents(array $payload): array
    {
        $trackingResults = data_get($payload, 'TrackingResults');
        if (!is_array($trackingResults) || empty($trackingResults)) {
            return [];
        }

        $rows = array_values($trackingResults);
        $events = [];

        foreach ($rows as $row) {
            $events = array_merge($events, $this->extractEventsFromTrackingResultRow($row));
        }

        return $this->filterEventRows($events);
    }

    protected function extractEventsFromTrackingResultRow(mixed $row): array
    {
        if (!is_array($row))
            return [];

        // Sometimes nested one more level
        if (count($row) === 1) {
            $only = reset($row);
            if (is_array($only) && (isset($only['Value']) || isset($only['TrackingResult']))) {
                $row = $only;
            }
        }

        $value = data_get($row, 'Value', $row);

        $events = data_get($value, 'TrackingResult');
        if (!$events) {
            $events = data_get($row, 'TrackingResult');
        }

        // Normalize single event to list
        if (is_array($events) && !array_is_list($events)) {
            if (isset($events['UpdateCode']) || isset($events['UpdateDescription']) || isset($events['UpdateDateTime'])) {
                return [$events];
            }
        }

        return is_array($events) ? $events : [];
    }

    protected function filterEventRows(array $events): array
    {
        return array_values(array_filter($events, function ($e) {
            return is_array($e) && (
                array_key_exists('UpdateCode', $e) ||
                array_key_exists('UpdateDescription', $e) ||
                array_key_exists('UpdateDateTime', $e)
            );
        }));
    }

    /**
     * Safely convert SOAP/objects/responses into deep arrays.
     */
    protected function toDeepArray(mixed $value): array
    {
        if (is_object($value) && method_exists($value, 'getData')) {
            try {
                $data = $value->getData(true);
                return is_array($data) ? $data : $this->deepDecode($data);
            } catch (\Throwable $e) {
                // ignore
            }
        }

        if (is_array($value)) {
            return $this->deepDecode($value);
        }

        return $this->deepDecode($value);
    }

    protected function deepDecode(mixed $value): array
    {
        try {
            $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $arr = json_decode($json ?: '[]', true);
            return is_array($arr) ? $arr : [];
        } catch (\Throwable $e) {
            return [];
        }
    }
}
