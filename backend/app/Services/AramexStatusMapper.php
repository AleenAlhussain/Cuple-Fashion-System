<?php

namespace App\Services;

class AramexStatusMapper
{
    public function map(array $carrierPayload, string $locale = 'en'): array
    {
        $events = $this->extractEvents($carrierPayload);

        if (empty($events)) {
            return $this->fallback($locale);
        }

        // Normalize events to consistent shape + sort (latest first)
        $normalized = array_map([$this, 'normalizeEvent'], $events);

        usort($normalized, function ($a, $b) {
            $ta = strtotime($a['occurred_at'] ?? '') ?: 0;
            $tb = strtotime($b['occurred_at'] ?? '') ?: 0;
            return $tb <=> $ta;
        });

        $latest = $normalized[0] ?? null;

        $aramex = [
            'code' => $latest['code'] ?? null,
            'name' => $latest['name'] ?? null,
            'occurred_at' => $latest['occurred_at'] ?? null,
            'location' => $latest['location'] ?? null,
        ];

        $customer = $this->mapToCustomerStatus($latest, $locale);

        $timeline = array_map(function ($e) {
            return [
                'date' => $e['occurred_at'] ?? null,
                'location' => $e['location'] ?? null,
                'status' => $e['code'] ?? null,
                'status_description' => $e['name'] ?? null,
                'remarks' => $e['comments'] ?? null,
            ];
        }, $normalized);

        return [
            'raw' => $events,
            'aramex' => $aramex,
            'mapped' => $customer,
            'timeline' => $timeline,
            'is_fallback' => false,
        ];
    }

    /**
     * Extract events list from Aramex payload (robust).
     */
    private function extractEvents(array $payload): array
    {
        $trackingResults = data_get($payload, 'TrackingResults');

        /**
         * Case A (your sample):
         * TrackingResults.KeyValueOf... => { Key, Value: { TrackingResult: [...] or {...} } }
         */
        if (is_array($trackingResults)) {
            foreach ($trackingResults as $maybeKv) {
                $cand = data_get($maybeKv, 'Value.TrackingResult');
                $list = $this->toEventList($cand);
                if (!empty($list)) return $list;
            }
        }

        /**
         * Case B:
         * TrackingResults.TrackingResult => [...] or {...}
         */
        $cand = data_get($payload, 'TrackingResults.TrackingResult');
        $list = $this->toEventList($cand);
        if (!empty($list)) return $list;

        /**
         * Case C:
         * TrackingResult at root => [...] or {...}
         */
        $cand = data_get($payload, 'TrackingResult');
        $list = $this->toEventList($cand);
        if (!empty($list)) return $list;

        /**
         * Case D:
         * TrackingResults is already an array of events
         */
        $list = $this->toEventList($trackingResults);
        if (!empty($list)) return $list;

        return [];
    }

    /**
     * Convert candidate (null | array | assoc event | list) into a clean list of event arrays.
     * This fixes "string given" issues when TrackingResult is a single object (assoc array).
     */
    private function toEventList(mixed $cand): array
    {
        if (!is_array($cand)) return [];

        // Single event (assoc array) like { WaybillNumber, UpdateCode, ... }
        if ($this->looksLikeEvent($cand)) {
            return [$cand];
        }

        // If it's a list, filter only event-like arrays
        $out = [];
        foreach ($cand as $item) {
            if (is_array($item) && $this->looksLikeEvent($item)) {
                $out[] = $item;
            }
        }

        return $out;
    }

    /**
     * Detect if array resembles an Aramex tracking event.
     */
    private function looksLikeEvent(array $a): bool
    {
        return isset($a['UpdateCode']) || isset($a['UpdateDescription']) || isset($a['UpdateDateTime']) || isset($a['WaybillNumber']);
    }

    /**
     * Normalize one event to consistent keys.
     */
    private function normalizeEvent(array $e): array
    {
        return [
            'waybill' => (string) (data_get($e, 'WaybillNumber') ?? ''),
            'code' => data_get($e, 'UpdateCode'),
            'name' => data_get($e, 'UpdateDescription'),
            'occurred_at' => data_get($e, 'UpdateDateTime'),
            'location' => data_get($e, 'UpdateLocation'),
            'comments' => data_get($e, 'Comments'),
            'problem_code' => data_get($e, 'ProblemCode'),
            'timezone' => data_get($e, 'UpdateTimeZone'),
        ];
    }

    public function getStageFromEvent(array $event, string $locale = 'en'): array
    {
        return $this->determineStageFromCode(
            strtoupper((string) ($event['code'] ?? '')),
            (string) ($event['name'] ?? ''),
            $locale
        );
    }

    private function mapToCustomerStatus(?array $latest, string $locale): array
    {
        $code = strtoupper((string) ($latest['code'] ?? ''));
        $desc = (string) ($latest['name'] ?? '');

        return $this->determineStageFromCode($code, $desc, $locale);
    }

    private function determineStageFromCode(string $code, string $desc, string $locale): array
    {
        if ($code === 'SH005' || stripos($desc, 'delivered') !== false) {
            return [
                'stage' => 'DELIVERED',
                'title' => $this->tr($locale, 'Delivered', 'تم التسليم'),
                'message' => $this->tr($locale, 'Your shipment has been delivered.', 'تم تسليم الشحنة بنجاح.'),
                'severity' => 'success',
            ];
        }

        if ($code === 'SH003' || stripos($desc, 'out for delivery') !== false) {
            return [
                'stage' => 'OUT_FOR_DELIVERY',
                'title' => $this->tr($locale, 'Out for delivery', 'الشحنة في طريقها للتسليم'),
                'message' => $this->tr($locale, 'Courier is on the way to deliver your shipment.', 'المندوب في طريقه لتسليم الشحنة.'),
                'severity' => 'info',
            ];
        }

        if (in_array($code, ['SH314', 'SH012', 'SH047', 'SH001', 'SH203'], true)
            || stripos($desc, 'processing') !== false
            || stripos($desc, 'received') !== false
            || stripos($desc, 'record created') !== false
            || stripos($desc, 'picked up') !== false
        ) {
            return [
                'stage' => 'IN_TRANSIT',
                'title' => $this->tr($locale, 'In transit', 'الشحنة قيد النقل'),
                'message' => $this->tr($locale, 'Your shipment is moving through Aramex network.', 'شُحنتك تتحرك ضمن شبكة أرامكس.'),
                'severity' => 'info',
            ];
        }

        return [
            'stage' => 'PROCESSING',
            'title' => $this->tr($locale, 'Shipment is being processed', 'الشحنة قيد المعالجة'),
            'message' => $this->tr($locale, 'We are waiting for the latest confirmation from Aramex.', 'ننتظر آخر تحديث من أرامكس.'),
            'severity' => 'warn',
        ];
    }

    private function fallback(string $locale): array
    {
        return [
            'raw' => [],
            'aramex' => [
                'code' => null,
                'name' => null,
                'occurred_at' => null,
                'location' => null,
            ],
            'mapped' => [
                'stage' => 'PROCESSING',
                'title' => $this->tr($locale, 'Shipment is being processed', 'الشحنة قيد المعالجة'),
                'message' => $this->tr($locale, 'We are waiting for the latest confirmation from Aramex.', 'ننتظر آخر تحديث من أرامكس.'),
                'severity' => 'warn',
            ],
            'timeline' => [],
            'is_fallback' => true,
        ];
    }

    private function tr(string $locale, string $en, string $ar): string
    {
        return str_starts_with($locale, 'ar') ? $ar : $en;
    }
}
