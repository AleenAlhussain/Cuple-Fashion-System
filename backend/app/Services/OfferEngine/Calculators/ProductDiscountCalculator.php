<?php

namespace App\Services\OfferEngine\Calculators;

use App\Models\DiscountRule;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\DTOs\DiscountResultDTO;

class ProductDiscountCalculator extends BaseCalculator
{
    /**
     * Calculate product discount.
     * Applies discount to eligible variants directly.
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

        // Sort items by strategy if max_affected_items is set
        if ($rule->max_affected_items !== null) {
            $eligibleItems = $this->sortByStrategy($eligibleItems, $rule->selection_strategy);
        }

        $totalDiscount = 0;
        $affectedItems = 0;
        $maxAffectedItems = $rule->max_affected_items;
        $maxDiscount = $rule->max_discount_amount;
        $affectedVariants = [];

        foreach ($eligibleItems as $item) {
            // Check max affected items limit
            if ($maxAffectedItems !== null && $affectedItems >= $maxAffectedItems) {
                break;
            }

            // Calculate discount for this item
            $itemDiscount = $this->calculateDiscountAmount(
                $item->price,
                $rule->discount_type,
                $rule->discount_value
            );

            $itemTotalDiscount = $itemDiscount * $item->qty;

            // Check max discount limit
            if ($maxDiscount !== null) {
                $remainingDiscount = $maxDiscount - $totalDiscount;
                if ($remainingDiscount <= 0) {
                    break;
                }
                $itemTotalDiscount = min($itemTotalDiscount, $remainingDiscount);
                $itemDiscount = $item->qty > 0 ? $itemTotalDiscount / $item->qty : 0;
            }

            if ($itemTotalDiscount > 0) {
                $adjustedPrice = $item->price - $itemDiscount;

                $result->addAdjustedItem(
                    variant_id: $item->variant_id,
                    original_price: $item->price,
                    adjusted_price: $adjustedPrice,
                    discount_amount: $itemTotalDiscount,
                    qty: $item->qty,
                    rule_id: $rule->id,
                    rule_name: $rule->name
                );

                $totalDiscount += $itemTotalDiscount;
                $affectedItems += $item->qty;
                $affectedVariants[] = $item->variant_id;
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
}
