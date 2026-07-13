<?php

namespace App\Services\OfferEngine\Calculators;

use App\Models\DiscountRule;
use App\Models\DiscountRuleRange;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\DTOs\DiscountResultDTO;

class BulkDiscountCalculator extends BaseCalculator
{
    /**
     * Calculate bulk discount.
     * Applies discount based on quantity ranges.
     */
    public function calculate(
        DiscountRule $rule,
        array $eligibleItems,
        ContextDTO $context
    ): DiscountResultDTO {
        $result = new DiscountResultDTO();

        if (empty($eligibleItems)) {
            return $result;
        }

        // Ensure ranges are loaded
        if (!$rule->relationLoaded('ranges')) {
            $rule->load('ranges');
        }

        if ($rule->ranges->isEmpty()) {
            return $result;
        }

        // Calculate threshold value based on count_quantities_by setting
        $thresholdValue = $this->getThresholdValue($eligibleItems, $rule);
        $totalQty = $this->getTotalQuantity($eligibleItems);

        // Find matching range using threshold value
        // Note: When using subtotal mode, range min_qty is treated as min_subtotal
        $range = $rule->findMatchingRange((int) $thresholdValue);

        if (!$range) {
            return $result;
        }

        // Calculate number of applications
        $applications = $this->calculateApplications($rule, $range, $thresholdValue);

        if ($applications <= 0) {
            return $result;
        }

        // Sort items by selection strategy
        $sortedItems = $this->sortByStrategy($eligibleItems, $rule->selection_strategy);

        // Calculate and apply discounts
        $totalDiscount = 0;
        $affectedVariants = [];
        $remainingApplicationQty = $applications * ($rule->recursive_step ?? $range->min_qty);
        $maxDiscount = $rule->max_discount_amount;

        // For fixed_price bulk discount, the fixed price is the TOTAL bundle price
        // e.g., "buy 2 for 99" means 2 items together cost 99, not each item costs 99
        if ($range->discount_type === 'fixed_price') {
            // Collect items that will be in the bundle(s)
            $bundleItems = [];
            $tempRemaining = $remainingApplicationQty;
            $bundleTotalPrice = 0;

            foreach ($sortedItems as $item) {
                if ($tempRemaining <= 0) break;
                $unitsToDiscount = min($item->qty, $tempRemaining);
                $tempRemaining -= $unitsToDiscount;
                $itemTotal = $item->price * $unitsToDiscount;
                $bundleTotalPrice += $itemTotal;
                $bundleItems[] = [
                    'item' => $item,
                    'units' => $unitsToDiscount,
                    'item_total' => $itemTotal,
                ];
            }

            // Total fixed price for all applications (each application = one bundle at the fixed price)
            $totalFixedPrice = (float) $range->discount_value * $applications;
            $bundleDiscount = max(0, $bundleTotalPrice - $totalFixedPrice);

            if ($maxDiscount !== null) {
                $bundleDiscount = min($bundleDiscount, $maxDiscount);
            }

            if ($bundleDiscount > 0 && $bundleTotalPrice > 0) {
                // Distribute discount proportionally across items
                $distributedDiscount = 0;
                $lastIndex = count($bundleItems) - 1;

                foreach ($bundleItems as $i => $bundleItem) {
                    $proportion = $bundleItem['item_total'] / $bundleTotalPrice;
                    // Last item gets remainder to avoid rounding issues
                    $itemDiscount = ($i === $lastIndex)
                        ? $bundleDiscount - $distributedDiscount
                        : round($bundleDiscount * $proportion, 2);

                    $discountPerUnit = $bundleItem['units'] > 0 ? $itemDiscount / $bundleItem['units'] : 0;

                    $result->addAdjustedItem(
                        variant_id: $bundleItem['item']->variant_id,
                        original_price: $bundleItem['item']->price,
                        adjusted_price: $bundleItem['item']->price - $discountPerUnit,
                        discount_amount: $itemDiscount,
                        qty: $bundleItem['units'],
                        rule_id: $rule->id,
                        rule_name: $rule->name
                    );

                    $distributedDiscount += $itemDiscount;
                    $totalDiscount += $itemDiscount;
                    $affectedVariants[] = $bundleItem['item']->variant_id;
                }
            }
        } else {
            // Per-item discount logic for percentage and fixed_amount types
            foreach ($sortedItems as $item) {
                if ($remainingApplicationQty <= 0) {
                    break;
                }

                // Calculate how many units of this item to discount
                $unitsToDiscount = min($item->qty, $remainingApplicationQty);
                $remainingApplicationQty -= $unitsToDiscount;

                // Calculate discount per unit
                $discountPerUnit = $range->calculateDiscount($item->price);

                // Total discount for this item
                $itemDiscount = $discountPerUnit * $unitsToDiscount;

                // Check max discount limit
                if ($maxDiscount !== null) {
                    $remainingMaxDiscount = $maxDiscount - $totalDiscount;
                    if ($remainingMaxDiscount <= 0) {
                        break;
                    }
                    $itemDiscount = min($itemDiscount, $remainingMaxDiscount);
                    $discountPerUnit = $unitsToDiscount > 0 ? $itemDiscount / $unitsToDiscount : 0;
                }

                if ($itemDiscount > 0) {
                    $result->addAdjustedItem(
                        variant_id: $item->variant_id,
                        original_price: $item->price,
                        adjusted_price: $item->price - $discountPerUnit,
                        discount_amount: $itemDiscount,
                        qty: $unitsToDiscount,
                        rule_id: $rule->id,
                        rule_name: $rule->name
                    );

                    $totalDiscount += $itemDiscount;
                    $affectedVariants[] = $item->variant_id;
                }
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
     * Calculate number of applications for bulk discount.
     *
     * @param DiscountRule $rule
     * @param DiscountRuleRange $range
     * @param float|int $thresholdValue The threshold value (qty or subtotal based on count_quantities_by)
     * @return int
     */
    private function calculateApplications(
        DiscountRule $rule,
        DiscountRuleRange $range,
        float|int $thresholdValue
    ): int {
        if (!$rule->is_recursive) {
            // Non-recursive: apply once if threshold meets minimum
            return $thresholdValue >= $range->min_qty ? 1 : 0;
        }

        // Recursive: calculate how many times we can apply
        $step = $rule->recursive_step ?? $range->min_qty;

        if ($step <= 0) {
            return 0;
        }

        $applications = (int) floor($thresholdValue / $step);

        // Apply max_applications limit
        if ($rule->max_applications !== null && $rule->max_applications > 0) {
            $applications = min($applications, $rule->max_applications);
        }

        return $applications;
    }
}
