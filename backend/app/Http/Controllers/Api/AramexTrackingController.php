<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AramexStatusMapper;
use App\Services\AramexTrackingPayloadParser;
use App\Services\AramexTrackingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AramexTrackingController extends Controller
{
    public function __construct(
        protected AramexStatusMapper $aramexStatusMapper,
        protected AramexTrackingService $aramexTrackingService,
        protected AramexTrackingPayloadParser $payloadParser,
    ) {}

    public function track(Request $request)
    {
        $locale = $request->get('locale', app()->getLocale() ?: 'en');
        $awb = trim((string) $request->get('awb'));

        if (!$awb) {
            return response()->json([
                'success' => false,
                'message' => 'awb is required',
            ], 422);
        }

        /**
         * 1) Call Aramex Tracking Service
         * IMPORTANT: service expects array of AWBs
         */
        $response = $this->aramexTrackingService->track([$awb]);

        /**
         * 2) Normalize response to deep array safely
         */
        $responseArray = $this->toDeepArray($response);

        $carrierPayload = $this->payloadParser->extractCarrierPayload($responseArray);
        $carrierPayload = $this->payloadParser->keepOnlyAwb($carrierPayload, $awb);

        /**
         * 5) Debug logs
         */
        Log::info('[AramexTrackingController] track()', [
            'awb' => $awb,
            'normalized_keys' => array_keys($responseArray ?? []),
            'carrier_keys' => array_keys($carrierPayload ?? []),
            'has_tracking_results' => !empty(data_get($carrierPayload, 'TrackingResults')),
            'has_errors' => (bool) data_get($responseArray, 'HasErrors', false),
            'notifications' => data_get($responseArray, 'Notifications', []),
        ]);

        /**
         * 6) Run mapper
         */
        $mapped = $this->aramexStatusMapper->map($carrierPayload, $locale);

        return response()->json([
            'success' => true,
            'message' => 'Success',
            'data' => [
                'tracking_payload' => $carrierPayload,
                'aramex_status_raw' => $mapped['raw'] ?? [],
                'aramex_status_code' => data_get($mapped, 'aramex.code'),
                'aramex' => $mapped['aramex'] ?? [
                    'code' => null,
                    'name' => null,
                    'occurred_at' => null,
                    'location' => null,
                ],
                'customer_status' => $mapped['mapped'] ?? [
                    'stage' => 'PROCESSING',
                    'title' => 'Shipment is being processed',
                    'message' => 'We are waiting for the latest confirmation from Aramex.',
                    'severity' => 'warn',
                ],
                'timeline' => $mapped['timeline'] ?? [],
                'is_fallback' => (bool) ($mapped['is_fallback'] ?? true),
                'has_errors' => (bool) data_get($responseArray, 'HasErrors', false),
                'notifications' => data_get($responseArray, 'Notifications', []),
            ],
        ]);
    }

    private function toDeepArray(mixed $value): array
    {
        if (is_object($value) && method_exists($value, 'getData')) {
            try {
                $data = $value->getData(true);
                return is_array($data) ? $data : $this->deepDecode($data);
            } catch (\Throwable $e) {}
        }

        if (is_array($value)) return $this->deepDecode($value);

        return $this->deepDecode($value);
    }

    private function deepDecode(mixed $value): array
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
