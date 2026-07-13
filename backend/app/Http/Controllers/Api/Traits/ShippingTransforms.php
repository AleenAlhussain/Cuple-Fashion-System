<?php

namespace App\Http\Controllers\Api\Traits;

use App\Models\ShippingRate;
use App\Models\ShippingZone;

trait ShippingTransforms
{
    protected function transformZone(ShippingZone $zone): array
    {
        return [
            'id' => $zone->id,
            'name' => $zone->name,
            'country' => $zone->country ? $zone->country->only(['id', 'name']) : null,
            'is_active' => $zone->is_active,
            'status' => $zone->is_active ? 1 : 0,
            'shipping_rules' => $zone->rates->map(function (ShippingRate $rate) {
                return $this->transformRate($rate);
            })->values()->all(),
        ];
    }

    protected function transformRate(ShippingRate $rate): array
    {
        $feeMethod = $rate->fee_method;
        if (!$feeMethod) {
            if ($rate->rule_type === 'base_on_quantity') {
                $feeMethod = 'fixed_by_quantity';
            } elseif (
                $rate->shipping_type === 'fixed'
                && (float) ($rate->min_order_amount ?? 0) <= 0
                && empty($rate->max_order_amount)
            ) {
                $feeMethod = 'fixed_per_order';
            } else {
                $feeMethod = 'legacy';
            }
        }

        return [
            'id' => $rate->id,
            'shipping_id' => $rate->shipping_zone_id,
            'name' => $rate->name,
            'description' => $rate->description,
            'rule_type' => $rate->rule_type,
            'shipping_type' => $rate->shipping_type,
            'fee_method' => $feeMethod,
            'min' => $rate->min_order_amount,
            'max' => $rate->max_order_amount,
            'min_item_qty' => $rate->min_item_qty,
            'max_item_qty' => $rate->max_item_qty,
            'amount' => $rate->rate,
            'estimated_days' => $rate->estimated_days,
            'is_active' => $rate->is_active,
            'status' => $rate->is_active ? 1 : 0,
            'sort_order' => $rate->sort_order,
        ];
    }
}
