<?php

namespace App\Services\OfferEngine\Calculators;

use App\Models\DiscountRule;
use App\Models\DiscountRuleRange;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\DTOs\DiscountResultDTO;
use App\Services\OfferEngine\Filters\EligibilityFilter;

class BogoDiscountCalculator extends BaseCalculator
{
    /**
     * Calculate BOGO (Buy X Get Y) discount.
     *
     * CRITICAL RULE: Free items are applied ONLY to getEligibleItems,
     * never to arbitrary cart items. If no eligible Y items exist in cart,
     * no discount is applied.
     */
    public function calculate(
        DiscountRule $rule,
        array $eligibleItems,
        ContextDTO $context
    ): DiscountResultDTO {
        $result = new DiscountResultDTO();

        // For BOGO, we need separate buy and get eligible items
        // These should be passed separately, but for compatibility we'll
        // use filters to determine them
        return $this->calculateWithSeparateItems(
            $rule,
            $eligibleItems, // Buy items
            $eligibleItems, // Get items (will be filtered by getGetFilters)
            $context
        );
    }

    /**
     * Calculate BOGO with separately specified buy and get items.
     *
     * @param DiscountRule $rule
     * @param CartItemDTO[] $buyItems Items eligible for "buy" condition
     * @param CartItemDTO[] $getItems Items eligible for "get" (free/discounted)
     * @param ContextDTO $context
     * @param bool $separatePools When true, buy and get items come from different pools,
     *             so buy threshold only needs to meet buyQty (not buyQty + freeQty).
     * @return DiscountResultDTO
     */
    public function calculateWithSeparateItems(
        DiscountRule $rule,
        array $buyItems,
        array $getItems,
        ContextDTO $context,
        bool $separatePools = false
    ): DiscountResultDTO {
        $result = new DiscountResultDTO();

        \Log::info("[BogoCalculator] Starting calculation", [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'buy_items_count' => count($buyItems),
            'get_items_count' => count($getItems),
        ]);

        // CRITICAL: If no get-eligible items exist, no discount is applied
        if (empty($getItems)) {
            \Log::info("[BogoCalculator] No get items - returning empty result");
            return $result;
        }

        if (empty($buyItems)) {
            \Log::info("[BogoCalculator] No buy items - returning empty result");
            return $result;
        }

        // Ensure ranges are loaded
        if (!$rule->relationLoaded('ranges')) {
            $rule->load('ranges');
        }

        // Calculate buy threshold value based on count_quantities_by setting
        $buyThresholdValue = $this->getThresholdValue($buyItems, $rule);

        // Determine BOGO parameters: either from ranges or from main rule
        $buyQty = null;
        $freeQty = null;
        $discountType = 'percentage';
        $discountValue = 100; // Default: 100% off = free

        // Check if we have ranges with free_qty
        $range = null;
        if ($rule->ranges->isNotEmpty()) {
            $range = $this->findMatchingBogoRange($rule->ranges, (int) $buyThresholdValue);
        }

        \Log::info("[BogoCalculator] Determining BOGO params", [
            'rule_id' => $rule->id,
            'buyThresholdValue' => $buyThresholdValue,
            'rule_buy_qty' => $rule->buy_qty,
            'rule_get_qty' => $rule->get_qty,
            'ranges_count' => $rule->ranges->count(),
            'has_matching_range' => $range ? true : false,
        ]);

        if ($range && $range->hasFreeQuantity()) {
            // Use range-based BOGO
            $buyQty = $range->min_qty;
            $freeQty = $range->free_qty;
            $discountType = $range->discount_type ?? 'percentage';
            $discountValue = $range->discount_value ?? 100;
            \Log::info("[BogoCalculator] Using range-based BOGO", [
                'buyQty' => $buyQty,
                'freeQty' => $freeQty,
            ]);
        } elseif ($rule->buy_qty && $rule->get_qty) {
            // Use main rule buy_qty/get_qty
            $buyQty = $rule->buy_qty;
            $freeQty = $rule->get_qty;
            // Use discount settings from main rule
            $discountType = $rule->discount_type instanceof \App\Enums\DiscountType
                ? $rule->discount_type->value
                : ($rule->discount_type ?? 'percentage');
            $discountValue = $rule->discount_value ?? 100;
            \Log::info("[BogoCalculator] Using rule buy_qty/get_qty", [
                'buyQty' => $buyQty,
                'freeQty' => $freeQty,
                'discountType' => $discountType,
                'discountValue' => $discountValue,
            ]);
        } else {
            // No BOGO configuration found
            \Log::info("[BogoCalculator] No BOGO configuration found - returning empty result", [
                'rule_buy_qty' => $rule->buy_qty,
                'rule_get_qty' => $rule->get_qty,
            ]);
            return $result;
        }

        // For separate pools (BOGO with different buy/get filters), the buy threshold
        // only needs to meet buyQty since get items come from a different pool.
        // For same pool, we need buyQty + freeQty total items.
        $minRequiredQty = $separatePools ? $buyQty : ($buyQty + $freeQty);
        \Log::info("[BogoCalculator] Checking minimum quantity", [
            'rule_id' => $rule->id,
            'buyQty' => $buyQty,
            'freeQty' => $freeQty,
            'separatePools' => $separatePools,
            'minRequiredQty' => $minRequiredQty,
            'buyThresholdValue' => $buyThresholdValue,
            'meets_minimum' => $buyThresholdValue >= $minRequiredQty,
        ]);
        if ($buyThresholdValue < $minRequiredQty) {
            \Log::info("[BogoCalculator] Cart does not meet minimum qty - returning empty result", [
                'required' => $minRequiredQty,
                'actual' => $buyThresholdValue,
            ]);
            return $result;
        }

        // Calculate total free quantity
        $totalFreeQty = $this->calculateFreeQuantityFromParams(
            $rule,
            $buyQty,
            $freeQty,
            $buyThresholdValue,
            $separatePools
        );

        if ($totalFreeQty <= 0) {
            return $result;
        }

        // Sort get items by selection strategy
        $sortedGetItems = $this->sortByStrategy($getItems, $rule->selection_strategy);

        // Expand items for per-unit processing
        $expandedGetItems = $this->eligibilityFilter->expandItems($sortedGetItems);

        // Take the items that will be free/discounted
        $freeItems = array_slice($expandedGetItems, 0, $totalFreeQty);

        if (empty($freeItems)) {
            return $result;
        }

        // Calculate discount for free items
        $totalDiscount = 0;
        $affectedVariants = [];
        $maxDiscount = $rule->max_discount_amount;

        // Group free items by variant_id
        $variantFreeQty = [];
        foreach ($freeItems as $item) {
            $variantId = $item->variant_id;
            if (!isset($variantFreeQty[$variantId])) {
                $variantFreeQty[$variantId] = [
                    'price' => $item->price,
                    'qty' => 0,
                ];
            }
            $variantFreeQty[$variantId]['qty']++;
            $affectedVariants[] = $variantId;
        }

        foreach ($variantFreeQty as $variantId => $data) {
            // Calculate discount per unit based on discount settings
            $discountPerUnit = $this->calculateDiscountAmount($data['price'], $discountType, $discountValue);
            $itemDiscount = $discountPerUnit * $data['qty'];

            // Check max discount limit
            if ($maxDiscount !== null) {
                $remainingDiscount = $maxDiscount - $totalDiscount;
                if ($remainingDiscount <= 0) {
                    break;
                }
                $itemDiscount = min($itemDiscount, $remainingDiscount);
                $discountPerUnit = $data['qty'] > 0 ? $itemDiscount / $data['qty'] : 0;
            }

            if ($itemDiscount > 0) {
                $result->addFreeItem(
                    variant_id: $variantId,
                    unit_price: $data['price'],
                    free_qty: $data['qty'],
                    discount_amount: $itemDiscount,
                    rule_id: $rule->id,
                    rule_name: $rule->name
                );

                $totalDiscount += $itemDiscount;
            }
        }

        if ($totalDiscount > 0) {
            $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
                ? $rule->rule_type->value
                : $rule->rule_type;

            $result->addAppliedRule(
                rule_id: $rule->id,
                rule_name: $rule->name,
                rule_type: $ruleType,
                discount_amount: $totalDiscount,
                affected_variants: array_unique($affectedVariants)
            );

            if ($rule->offer_message) {
                $result->addMessage($rule->offer_message);
            }
        }

        return $result;
    }

    /**
     * Calculate free quantity from explicit parameters.
     *
     * BOGO Logic: "Buy X Get Y Free" requires X+Y items to apply once.
     * For recursive: every (X+Y) items = Y free items.
     * Example: "Buy 2 Get 1 Free" with 6 items = 2 applications = 2 free items.
     */
    private function calculateFreeQuantityFromParams(
        DiscountRule $rule,
        int $buyQty,
        int $freeQty,
        float|int $buyThresholdValue,
        bool $separatePools = false
    ): int {
        // For separate pools, only need buyQty buy items (get items are in another pool).
        // For same pool, need buyQty + freeQty total items.
        $minRequiredQty = $separatePools ? $buyQty : ($buyQty + $freeQty);

        if (!$rule->is_recursive) {
            // Non-recursive: get freeQty once if minimum threshold is met
            return $buyThresholdValue >= $minRequiredQty ? $freeQty : 0;
        }

        // Recursive: calculate how many times we can apply
        // For separate pools, step = buyQty (each application consumes buyQty buy items).
        // For same pool, step = buyQty + freeQty (each application consumes both).
        $step = $rule->recursive_step ?? $minRequiredQty;

        if ($step <= 0) {
            return 0;
        }

        $applications = (int) floor($buyThresholdValue / $step);

        // Apply max_applications limit
        if ($rule->max_applications !== null && $rule->max_applications > 0) {
            $applications = min($applications, $rule->max_applications);
        }

        $totalFreeQty = $applications * $freeQty;

        // Apply max_free_qty_per_order limit
        if ($rule->max_free_qty_per_order !== null && $rule->max_free_qty_per_order > 0) {
            $totalFreeQty = min($totalFreeQty, $rule->max_free_qty_per_order);
        }

        return $totalFreeQty;
    }

    /**
     * Find the matching BOGO range based on buy quantity.
     */
    private function findMatchingBogoRange($ranges, int $buyQty): ?DiscountRuleRange
    {
        // Find the best matching range (highest min_qty that the buy quantity meets)
        return $ranges
            ->filter(fn($range) => $range->matchesQuantity($buyQty) && $range->hasFreeQuantity())
            ->last();
    }

    /**
     * Calculate total free quantity for BOGO.
     *
     * BOGO Logic: "Buy X Get Y Free" requires X+Y items to apply once.
     * For recursive: every (X+Y) items = Y free items.
     *
     * @param DiscountRule $rule
     * @param DiscountRuleRange $range
     * @param float|int $buyThresholdValue The threshold value (qty or subtotal based on count_quantities_by)
     * @return int
     */
    private function calculateFreeQuantity(
        DiscountRule $rule,
        DiscountRuleRange $range,
        float|int $buyThresholdValue
    ): int {
        $freeQtyPerApplication = $range->free_qty;
        // Minimum items needed = min_qty (buy qty) + free_qty
        $minRequiredQty = $range->min_qty + $freeQtyPerApplication;

        if (!$rule->is_recursive) {
            // Non-recursive: get free_qty once if minimum threshold is met
            return $buyThresholdValue >= $minRequiredQty ? $freeQtyPerApplication : 0;
        }

        // Recursive: calculate how many times we can apply
        // Step should include both buy and free quantities
        $step = $rule->recursive_step ?? $minRequiredQty;

        if ($step <= 0) {
            return 0;
        }

        $applications = (int) floor($buyThresholdValue / $step);

        // Apply max_applications limit
        if ($rule->max_applications !== null && $rule->max_applications > 0) {
            $applications = min($applications, $rule->max_applications);
        }

        $totalFreeQty = $applications * $freeQtyPerApplication;

        // Apply max_free_qty_per_order limit
        if ($rule->max_free_qty_per_order !== null && $rule->max_free_qty_per_order > 0) {
            $totalFreeQty = min($totalFreeQty, $rule->max_free_qty_per_order);
        }

        return $totalFreeQty;
    }

    /**
     * Calculate discount amount for a BOGO free item.
     */
    private function calculateBogoDiscount(float $price, DiscountRuleRange $range): float
    {
        // If range has discount settings, use them
        if ($range->discount_type && $range->discount_value !== null) {
            return $range->calculateDiscount($price);
        }

        // Default: 100% off (completely free)
        return $price;
    }
}
