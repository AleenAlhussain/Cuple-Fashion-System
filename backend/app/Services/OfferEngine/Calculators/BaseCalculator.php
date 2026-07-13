<?php

namespace App\Services\OfferEngine\Calculators;

use App\Models\DiscountRule;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\DTOs\DiscountResultDTO;
use App\Services\OfferEngine\Filters\EligibilityFilter;

abstract class BaseCalculator
{
    public function __construct(
        protected readonly EligibilityFilter $eligibilityFilter
    ) {}

    /**
     * Calculate discount for a rule.
     *
     * @param DiscountRule $rule
     * @param CartItemDTO[] $eligibleItems
     * @param ContextDTO $context
     * @return DiscountResultDTO
     */
    abstract public function calculate(
        DiscountRule $rule,
        array $eligibleItems,
        ContextDTO $context
    ): DiscountResultDTO;

    /**
     * Calculate discount amount based on type and value.
     */
    protected function calculateDiscountAmount(
        float $price,
        string|\BackedEnum $discountType,
        float $discountValue
    ): float {
        // Handle enum or string
        $type = $discountType instanceof \BackedEnum ? $discountType->value : $discountType;

        $discount = match ($type) {
            'percentage' => $price * (min(100, max(0, $discountValue)) / 100),
            'fixed_amount' => min($discountValue, $price),
            'fixed_price' => max(0, $price - max(0, $discountValue)),
            default => 0,
        };

        return round($discount, 2);
    }

    /**
     * Apply max discount amount limit.
     */
    protected function applyMaxDiscountLimit(float $discount, ?float $maxDiscount): float
    {
        if ($maxDiscount !== null && $maxDiscount > 0) {
            return min($discount, $maxDiscount);
        }
        return $discount;
    }

    /**
     * Get total quantity from items.
     */
    protected function getTotalQuantity(array $items): int
    {
        return array_sum(array_map(fn($item) => $item->qty, $items));
    }

    /**
     * Get total subtotal from items.
     */
    protected function getTotalSubtotal(array $items): float
    {
        return array_sum(array_map(fn($item) => $item->getSubtotal(), $items));
    }

    /**
     * Get the threshold value based on count_quantities_by setting.
     * When 'eligible_subtotal', uses subtotal for threshold comparison.
     * When 'eligible_qty' (default), uses quantity.
     *
     * @param array $items Eligible items
     * @param DiscountRule $rule The discount rule
     * @return float|int The threshold value to use for comparisons
     */
    protected function getThresholdValue(array $items, DiscountRule $rule): float|int
    {
        $countBy = $rule->count_quantities_by ?? 'eligible_qty';

        if ($countBy === 'eligible_subtotal') {
            return $this->getTotalSubtotal($items);
        }

        return $this->getTotalQuantity($items);
    }

    /**
     * Check if using subtotal-based counting.
     */
    protected function isSubtotalBased(DiscountRule $rule): bool
    {
        return ($rule->count_quantities_by ?? 'eligible_qty') === 'eligible_subtotal';
    }

    /**
     * Sort items by price strategy.
     *
     * @param CartItemDTO[] $items
     * @param string|\BackedEnum|null $strategy
     * @return CartItemDTO[]
     */
    protected function sortByStrategy(array $items, string|\BackedEnum|null $strategy): array
    {
        // Handle enum, string, or null
        $strategyValue = match (true) {
            $strategy instanceof \BackedEnum => $strategy->value,
            is_string($strategy) => $strategy,
            default => 'cheapest', // Default strategy
        };

        return $this->eligibilityFilter->sortByStrategy($items, $strategyValue);
    }
}
