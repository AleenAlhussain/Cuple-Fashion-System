<?php

namespace App\Services;

use App\Models\ShippingZone;
use App\Models\ShippingRate;

class ShippingCalculator
{
    public function calculateForCountry(int $countryId, float $subtotal, ?int $itemsQuantity = null): array
    {
        if ($subtotal <= 0) {
            return $this->emptyResult();
        }

        $zone = ShippingZone::with(['rates' => function ($query) {
            $query->orderBy('sort_order');
        }, 'country:id,name'])
            ->active()
            ->where('country_id', $countryId)
            ->first();

        if (!$zone) {
            return $this->emptyResult();
        }

        $rate = $this->selectRate($zone, $subtotal, $itemsQuantity);
        if (!$rate) {
            return $this->emptyResult($zone);
        }

        return [
            'shipping_amount' => $this->calculateAmount($rate, $subtotal),
            'zone' => $zone,
            'rate' => $rate,
        ];
    }

    private function selectRate(ShippingZone $zone, float $subtotal, ?int $itemsQuantity = null): ?ShippingRate
    {
        $rates = $zone->rates->where('is_active', true)->values();

        if (($itemsQuantity ?? 0) > 0) {
            foreach ($rates as $rate) {
                if ($this->resolveFeeMethod($rate) !== 'fixed_by_quantity') {
                    continue;
                }
                if ($this->matchesQuantityRange($rate, (int) $itemsQuantity)) {
                    return $rate;
                }
            }
        }

        foreach ($rates as $rate) {
            if ($this->resolveFeeMethod($rate) === 'fixed_per_order') {
                return $rate;
            }
        }

        foreach ($rates as $rate) {
            if ($this->resolveFeeMethod($rate) === 'legacy' && $this->matchesOrderAmount($rate, $subtotal)) {
                return $rate;
            }
        }

        return null;
    }

    private function matchesOrderAmount(ShippingRate $rate, float $subtotal): bool
    {
        $min = $rate->min_order_amount ?? 0;
        $max = $rate->max_order_amount;

        if ($min > 0 && $subtotal < $min) {
            return false;
        }

        if ($max > 0 && $subtotal > $max) {
            return false;
        }

        return true;
    }

    private function matchesQuantityRange(ShippingRate $rate, int $itemsQuantity): bool
    {
        $min = (int) ($rate->min_item_qty ?? 0);
        $max = (int) ($rate->max_item_qty ?? 0);

        if ($min > 0 && $itemsQuantity < $min) {
            return false;
        }

        if ($max > 0 && $itemsQuantity > $max) {
            return false;
        }

        return true;
    }

    private function resolveFeeMethod(ShippingRate $rate): string
    {
        if (in_array($rate->fee_method, ['fixed_per_order', 'fixed_by_quantity', 'legacy'], true)) {
            return $rate->fee_method;
        }

        if ($rate->rule_type === 'base_on_quantity') {
            return 'fixed_by_quantity';
        }

        if (
            $rate->shipping_type === 'fixed'
            && (float) ($rate->min_order_amount ?? 0) <= 0
            && empty($rate->max_order_amount)
        ) {
            return 'fixed_per_order';
        }

        return 'legacy';
    }

    private function calculateAmount(ShippingRate $rate, float $subtotal): float
    {
        $shippingType = $rate->shipping_type;
        if ($shippingType === 'free') {
            return 0.0;
        }

        if ($shippingType === 'percentage') {
            return round($subtotal * ($rate->rate / 100), 2);
        }

        return round($rate->rate, 2);
    }

    private function emptyResult(?ShippingZone $zone = null): array
    {
        return [
            'shipping_amount' => 0.0,
            'zone' => $zone,
            'rate' => null,
        ];
    }
}
