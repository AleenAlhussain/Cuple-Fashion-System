<?php

namespace App\Services\OfferEngine\Calculators;

use App\Models\DiscountRule;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\DTOs\DiscountResultDTO;

class BundleDiscountCalculator extends BaseCalculator
{
    /**
     * Calculate bundle/set discount.
     * E.g., "2 for 99 AED" - sets a fixed price for a bundle of items.
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

        $requiredQty = $rule->bundle_qty ?? $rule->min_qty ?? 1;
        $totalQty = $this->getTotalQuantity($eligibleItems);

        // Calculate threshold value based on count_quantities_by setting
        $thresholdValue = $this->getThresholdValue($eligibleItems, $rule);

        if ($thresholdValue < $requiredQty) {
            return $result;
        }

        // Calculate number of complete bundles using threshold value
        $applications = $this->calculateApplications($rule, $thresholdValue, $requiredQty);

        if ($applications <= 0) {
            return $result;
        }

        // Sort items by selection strategy (cheapest first by default)
        $sortedItems = $this->sortByStrategy($eligibleItems, $rule->selection_strategy);

        // Expand items for per-unit processing
        $expandedItems = $this->eligibilityFilter->expandItems($sortedItems);

        // Take the items that form the bundle(s)
        $bundleQty = $applications * $requiredQty;
        $bundleItems = array_slice($expandedItems, 0, $bundleQty);

        if (empty($bundleItems)) {
            return $result;
        }

        // Calculate original subtotal of bundle items
        $originalSubtotal = array_sum(array_map(fn($item) => $item->price, $bundleItems));

        // Calculate bundle price (fixed price per bundle * number of bundles)
        $bundlePrice = ($rule->bundle_price ?? $rule->discount_value) * $applications;

        // Total discount
        $totalDiscount = max(0, $originalSubtotal - $bundlePrice);

        // Apply max discount limit
        if ($rule->max_discount_amount !== null && $rule->max_discount_amount > 0) {
            $totalDiscount = min($totalDiscount, $rule->max_discount_amount);
        }

        if ($totalDiscount <= 0) {
            return $result;
        }

        // Distribute discount proportionally across bundle items
        $discountPerItem = $totalDiscount / count($bundleItems);
        $affectedVariants = [];

        // Group by variant_id and sum up discounts
        $variantDiscounts = [];
        foreach ($bundleItems as $item) {
            $variantId = $item->variant_id;
            if (!isset($variantDiscounts[$variantId])) {
                $variantDiscounts[$variantId] = [
                    'price' => $item->price,
                    'discount' => 0,
                    'qty' => 0,
                ];
            }
            $variantDiscounts[$variantId]['discount'] += $discountPerItem;
            $variantDiscounts[$variantId]['qty']++;
            $affectedVariants[] = $variantId;
        }

        foreach ($variantDiscounts as $variantId => $data) {
            $discountPerUnit = $data['discount'] / $data['qty'];
            $result->addAdjustedItem(
                variant_id: $variantId,
                original_price: $data['price'],
                adjusted_price: $data['price'] - $discountPerUnit,
                discount_amount: $data['discount'],
                qty: $data['qty'],
                rule_id: $rule->id,
                rule_name: $rule->name
            );
        }

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

        return $result;
    }

    /**
     * Calculate number of bundle applications.
     *
     * @param DiscountRule $rule
     * @param float|int $thresholdValue The threshold value (qty or subtotal based on count_quantities_by)
     * @param int $requiredQty The required quantity/threshold per bundle
     * @return int
     */
    private function calculateApplications(DiscountRule $rule, float|int $thresholdValue, int $requiredQty): int
    {
        if ($requiredQty <= 0) {
            return 0;
        }

        if (!$rule->is_recursive) {
            // Non-recursive: apply once if requirement is met
            return $thresholdValue >= $requiredQty ? 1 : 0;
        }

        // Recursive: calculate how many complete bundles
        $applications = (int) floor($thresholdValue / $requiredQty);

        // Apply max_applications limit
        if ($rule->max_applications !== null && $rule->max_applications > 0) {
            $applications = min($applications, $rule->max_applications);
        }

        return $applications;
    }
}
