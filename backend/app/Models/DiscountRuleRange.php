<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountRuleRange extends Model
{
    use HasFactory;
    protected $fillable = [
        'discount_rule_id',
        'min_qty',
        'max_qty',
        'discount_type',
        'discount_value',
        'free_qty',
    ];

    protected $casts = [
        'min_qty' => 'integer',
        'max_qty' => 'integer',
        'discount_value' => 'decimal:2',
        'free_qty' => 'integer',
    ];

    /**
     * Get the discount rule this range belongs to.
     */
    public function discountRule(): BelongsTo
    {
        return $this->belongsTo(DiscountRule::class);
    }

    /**
     * Check if a quantity falls within this range.
     */
    public function matchesQuantity(int $qty): bool
    {
        if ($qty < $this->min_qty) {
            return false;
        }

        if ($this->max_qty !== null && $qty > $this->max_qty) {
            return false;
        }

        return true;
    }

    /**
     * Calculate discount amount for a given price.
     *
     * @param float $price The original price
     * @return float The discount amount (not the final price)
     */
    public function calculateDiscount(float $price): float
    {
        if ($price <= 0) {
            return 0;
        }

        $discount = match($this->discount_type) {
            'percentage' => $this->calculatePercentageDiscount($price),
            'fixed_amount' => $this->calculateFixedAmountDiscount($price),
            'fixed_price' => $this->calculateFixedPriceDiscount($price),
            default => 0,
        };

        // Ensure discount doesn't exceed the price
        return min($discount, $price);
    }

    /**
     * Calculate percentage discount.
     */
    private function calculatePercentageDiscount(float $price): float
    {
        $percentage = max(0, min(100, $this->discount_value)); // Clamp between 0-100
        return $price * ($percentage / 100);
    }

    /**
     * Calculate fixed amount discount.
     */
    private function calculateFixedAmountDiscount(float $price): float
    {
        return min((float) $this->discount_value, $price);
    }

    /**
     * Calculate fixed price discount (discount = original - fixed price).
     */
    private function calculateFixedPriceDiscount(float $price): float
    {
        $fixedPrice = max(0, (float) $this->discount_value);
        return max(0, $price - $fixedPrice);
    }

    /**
     * Get the final price after applying this discount.
     */
    public function getFinalPrice(float $price): float
    {
        return max(0, $price - $this->calculateDiscount($price));
    }

    /**
     * Check if this range has free quantity (for BOGO).
     */
    public function hasFreeQuantity(): bool
    {
        return $this->free_qty !== null && $this->free_qty > 0;
    }

    /**
     * Get a human-readable description of this range.
     */
    public function getDescriptionAttribute(): string
    {
        $qty = $this->max_qty
            ? "{$this->min_qty}-{$this->max_qty}"
            : "{$this->min_qty}+";

        $discount = match($this->discount_type) {
            'percentage' => "{$this->discount_value}%",
            'fixed_amount' => "{$this->discount_value} off",
            'fixed_price' => "@ {$this->discount_value}",
            default => $this->discount_value,
        };

        if ($this->hasFreeQuantity()) {
            return "Buy {$qty}, get {$this->free_qty} free";
        }

        return "Qty {$qty}: {$discount}";
    }
}
