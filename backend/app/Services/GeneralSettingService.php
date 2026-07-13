<?php

namespace App\Services;

use App\Models\Setting;

class GeneralSettingService
{
    public function getPaymentFee(?string $paymentMethod): float
    {
        if (!$this->isCashOnDelivery($paymentMethod)) {
            return 0.0;
        }

        $general = $this->getGeneralSettings();
        $fee = $general['cod_fee'] ?? null;

        if ($fee === null || $fee === '') {
            return 0.0;
        }

        return is_numeric($fee) ? (float) $fee : 0.0;
    }

    public function getGeneralSettings(): array
    {
        $values = $this->parseJson(Setting::get('values', '{}'));
        $generalFromValues = $values['general'] ?? [];

        $generalOverride = $this->parseJson(Setting::get('general', '{}'));

        return array_merge($generalFromValues, $generalOverride);
    }

    protected function parseJson(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return [];
            }

            $decoded = json_decode($trimmed, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    protected function isCashOnDelivery(?string $method): bool
    {
        if (!$method) {
            return false;
        }

        return strtolower($method) === 'cod';
    }
}
