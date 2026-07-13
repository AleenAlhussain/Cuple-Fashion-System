<?php

namespace App\Services;

class AramexTrackingPayloadParser
{
    public function extractCarrierPayload(array $response): array
    {
        $payload = data_get($response, 'data.tracking_payload');
        if ($this->isValidPayload($payload)) {
            return $payload;
        }

        $payload = data_get($response, 'tracking_payload');
        if ($this->isValidPayload($payload)) {
            return $payload;
        }

        $data = data_get($response, 'data');
        if ($this->isValidPayload($data)) { // ✅ FIX
            return $data;
        }

        if ($this->isValidPayload($response)) {
            return $response;
        }

        foreach (['data.TrackShipmentsResult', 'TrackShipmentsResult', 'data.result', 'result'] as $key) {
            $cand = data_get($response, $key);
            if ($this->isValidPayload($cand)) {
                return $cand;
            }
        }

        return [];
    }

    /**
     * ✅ IMPORTANT:
     * Aramex can return TrackingResults in a KV wrapper form:
     * TrackingResults => [ { KeyValueOf... => { Key => AWB, Value => { TrackingResult => [events...] } } } ]
     *
     * We normalize it so TrackingResults becomes the events array directly.
     */
    public function keepOnlyAwb(array $payload, string $awb): array
    {
        $results = data_get($payload, 'TrackingResults');

        if (!is_array($results) || empty($results)) {
            return $payload;
        }

        // Detect KV-wrapper entries and extract by AWB
        $selectedEvents = null;

        foreach ($results as $entry) {
            if (!is_array($entry) || empty($entry)) {
                continue;
            }

            // KV wrapper: entry has a single unknown key like KeyValueOfstringArrayOfTrackingResult...
            $kv = $this->extractKv($entry);
            if (!$kv) {
                continue;
            }

            $key = (string) data_get($kv, 'Key');
            if ($key !== (string) $awb) {
                continue;
            }

            $events = data_get($kv, 'Value.TrackingResult');
            if (is_object($events)) {
                $events = json_decode(json_encode($events), true);
            }
            if (is_array($events)) {
                $selectedEvents = $events;
                break;
            }
        }

        // If we successfully extracted events for this AWB, flatten TrackingResults to those events
        if (is_array($selectedEvents)) {
            data_set($payload, 'TrackingResults', $selectedEvents);
            return $payload;
        }

        // Fallback: old structure (TrackingResults already list of results with WaybillNumber)
        $selected = collect($results)->first(function ($entry) use ($awb) {
            $candidate = (string) (
                data_get($entry, 'WaybillNumber')
                ?? data_get($entry, 'waybillNumber')
                ?? data_get($entry, 'AWB')
                ?? data_get($entry, 'awb')
            );
            return $candidate === (string) $awb;
        });

        if ($selected) {
            data_set($payload, 'TrackingResults', [$selected]);
        }

        return $payload;
    }

    private function isValidPayload(mixed $payload): bool
    {
        if (is_object($payload)) {
            $payload = json_decode(json_encode($payload), true) ?: [];
        }

        if (!is_array($payload)) {
            return false;
        }

        $results = data_get($payload, 'TrackingResults');
        if (is_object($results)) {
            $results = json_decode(json_encode($results), true);
        }

        return is_array($results) && !empty($results);
    }

    /**
     * Extract the KV wrapper content regardless of the unknown key name.
     */
    private function extractKv(array $entry): ?array
    {
        // entry like: [ "KeyValueOf..." => [ "Key" => "...", "Value" => ... ] ]
        if (count($entry) !== 1) {
            return null;
        }

        $kv = reset($entry);

        if (is_object($kv)) {
            $kv = json_decode(json_encode($kv), true);
        }

        if (!is_array($kv)) {
            return null;
        }

        // Must have Key + Value
        if (!array_key_exists('Key', $kv) || !array_key_exists('Value', $kv)) {
            return null;
        }

        return $kv;
    }
}
