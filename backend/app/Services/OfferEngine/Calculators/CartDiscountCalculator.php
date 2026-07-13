<?php

namespace App\Services\OfferEngine\Calculators;

use App\Models\DiscountRule;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\DTOs\DiscountResultDTO;

class CartDiscountCalculator extends BaseCalculator
{
    /**
     * Calculate cart-level discount.
     * Applies discount to the entire cart subtotal.
     */
    public function calculate(
        DiscountRule $rule,
        array $eligibleItems,
        ContextDTO $context
    ): DiscountResultDTO {
        $result = new DiscountResultDTO();

        \Log::info('[CartDiscountCalculator] Starting calculation', [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'eligible_items_count' => count($eligibleItems),
        ]);

        if (empty($eligibleItems)) {
            \Log::info('[CartDiscountCalculator] No eligible items');
            return $result;
        }

        // Calculate eligible subtotal
        $eligibleSubtotal = $this->getTotalSubtotal($eligibleItems);

        \Log::info('[CartDiscountCalculator] Eligible subtotal', [
            'rule_id' => $rule->id,
            'subtotal' => $eligibleSubtotal,
        ]);

        if ($eligibleSubtotal <= 0) {
            \Log::info('[CartDiscountCalculator] Subtotal is 0 or negative');
            return $result;
        }

        // Check min_cart_total condition - cart must meet minimum threshold
        $minCartTotal = $this->getMinCartTotal($rule);
        \Log::info('[CartDiscountCalculator] Min cart total check', [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'cart_subtotal' => $eligibleSubtotal,
            'min_cart_total' => $minCartTotal,
            'meets_minimum' => $minCartTotal <= 0 || $eligibleSubtotal >= $minCartTotal,
        ]);

        if ($minCartTotal > 0 && $eligibleSubtotal < $minCartTotal) {
            \Log::info('[CartDiscountCalculator] Cart subtotal below minimum - NO DISCOUNT', [
                'rule_id' => $rule->id,
                'rule_name' => $rule->name,
                'cart_subtotal' => $eligibleSubtotal,
                'min_cart_total' => $minCartTotal,
                'difference' => $minCartTotal - $eligibleSubtotal,
            ]);
            return $result; // No discount - cart doesn't meet minimum
        }

        // Calculate discount
        $discountType = $rule->discount_type instanceof \App\Enums\DiscountType
            ? $rule->discount_type->value
            : $rule->discount_type;

        \Log::info('[CartDiscountCalculator] Calculating discount', [
            'rule_id' => $rule->id,
            'discount_type' => $discountType,
            'discount_value' => $rule->discount_value,
            'base_amount' => $eligibleSubtotal,
        ]);

        $discount = $this->calculateDiscountAmount(
            $eligibleSubtotal,
            $rule->discount_type,
            $rule->discount_value
        );

        \Log::info('[CartDiscountCalculator] Raw discount calculated', [
            'rule_id' => $rule->id,
            'raw_discount' => $discount,
        ]);

        // Apply max discount limit
        $discount = $this->applyMaxDiscountLimit($discount, $rule->max_discount_amount);

        \Log::info('[CartDiscountCalculator] Final discount after limits', [
            'rule_id' => $rule->id,
            'final_discount' => $discount,
            'max_discount_amount' => $rule->max_discount_amount,
        ]);

        if ($discount > 0) {
            $result->addCartDiscount($discount);

            $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
                ? $rule->rule_type->value
                : $rule->rule_type;

            $result->addAppliedRule(
                rule_id: $rule->id,
                rule_name: $rule->name,
                rule_type: $ruleType,
                discount_amount: $discount,
                affected_variants: array_unique(array_map(fn($item) => $item->variant_id, $eligibleItems))
            );

            if ($rule->offer_message) {
                $result->addMessage($rule->offer_message);
            }

            \Log::info('[CartDiscountCalculator] Discount applied successfully', [
                'rule_id' => $rule->id,
                'rule_name' => $rule->name,
                'discount_amount' => $discount,
            ]);
        } else {
            \Log::info('[CartDiscountCalculator] No discount applied (discount <= 0)');
        }

        return $result;
    }

    /**
     * Get the minimum cart total required for this rule.
     * Checks multiple sources: direct field, conditions, or parsed from name.
     */
    private function getMinCartTotal(DiscountRule $rule): float
    {
        // Check direct min_cart_total field
        if ($rule->min_cart_total && $rule->min_cart_total > 0) {
            return (float) $rule->min_cart_total;
        }

        // Check conditions for cart_subtotal type
        $condition = $rule->conditions()
            ->where('type', 'cart_subtotal')
            ->whereIn('operator', ['>=', '>'])
            ->first();

        if ($condition) {
            return (float) $condition->value;
        }

        // Parse from rule name (e.g., "50 AED Off Orders Over 300")
        if (preg_match('/over\s*(\d+)/i', $rule->name, $matches)) {
            return (float) $matches[1];
        }

        return 0;
    }
}
