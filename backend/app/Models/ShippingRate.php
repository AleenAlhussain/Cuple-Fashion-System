<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingRate extends Model
{
    protected $fillable = [
        'shipping_zone_id',
        'name',
        'description',
        'rule_type',
        'shipping_type',
        'fee_method',
        'min_order_amount',
        'max_order_amount',
        'min_item_qty',
        'max_item_qty',
        'rate',
        'estimated_days',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'min_order_amount' => 'decimal:2',
        'max_order_amount' => 'decimal:2',
        'min_item_qty' => 'integer',
        'max_item_qty' => 'integer',
        'rate' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function zone(): BelongsTo
    {
        return $this->belongsTo(ShippingZone::class, 'shipping_zone_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function isAvailableForAmount($amount): bool
    {
        if ($amount < $this->min_order_amount) {
            return false;
        }
        if ($this->max_order_amount && $amount > $this->max_order_amount) {
            return false;
        }
        return true;
    }
}
