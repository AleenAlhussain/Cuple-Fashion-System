<?php

namespace App\Services\OfferEngine\Validators;

use App\Models\DiscountRule;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;

class ConditionValidator
{
    /**
     * Validate all conditions for a rule.
     *
     * @param DiscountRule $rule
     * @param CartItemDTO[] $cartItems All cart items
     * @param CartItemDTO[] $eligibleItems Items eligible for this rule
     * @param ContextDTO $context
     * @return bool
     */
    public function validate(
        DiscountRule $rule,
        array $cartItems,
        array $eligibleItems,
        ContextDTO $context
    ): bool {
        // Build condition data
        $data = $this->buildConditionData($cartItems, $eligibleItems, $context, $rule);

        // Use the model's condition evaluation
        return $rule->evaluateConditions($data);
    }

    /**
     * Build condition data array from cart and context.
     */
    private function buildConditionData(
        array $cartItems,
        array $eligibleItems,
        ContextDTO $context,
        DiscountRule $rule
    ): array {
        // Calculate cart totals
        $cartQty = array_sum(array_map(fn($item) => $item->qty, $cartItems));
        $cartSubtotal = array_sum(array_map(fn($item) => $item->getSubtotal(), $cartItems));

        // Calculate eligible totals based on count_quantities_by setting
        $eligibleQty = array_sum(array_map(fn($item) => $item->qty, $eligibleItems));
        $eligibleSubtotal = array_sum(array_map(fn($item) => $item->getSubtotal(), $eligibleItems));

        return array_merge($context->toConditionData(), [
            'cart_qty' => $cartQty,
            'cart_subtotal' => $cartSubtotal,
            'eligible_qty' => $eligibleQty,
            'eligible_subtotal' => $eligibleSubtotal,
        ]);
    }

    /**
     * Get the reason why validation failed.
     */
    public function getFailureReason(
        DiscountRule $rule,
        array $cartItems,
        array $eligibleItems,
        ContextDTO $context
    ): ?string {
        if (!$rule->relationLoaded('conditions')) {
            $rule->load('conditions');
        }

        if ($rule->conditions->isEmpty()) {
            return null; // No conditions = always passes
        }

        $data = $this->buildConditionData($cartItems, $eligibleItems, $context, $rule);

        $failedConditions = [];

        foreach ($rule->conditions as $condition) {
            if (!$condition->evaluate($data)) {
                $failedConditions[] = $this->formatConditionDescription($condition, $data);
            }
        }

        if (empty($failedConditions)) {
            return null;
        }

        $matchType = $rule->condition_match_type === 'match_all'
            ? 'all conditions'
            : 'at least one condition';

        return "Failed to meet {$matchType}: " . implode(', ', $failedConditions);
    }

    /**
     * Format a condition for human-readable description.
     */
    private function formatConditionDescription($condition, array $data): string
    {
        $typeLabels = [
            'cart_qty' => 'Cart quantity',
            'cart_subtotal' => 'Cart subtotal',
            'user_role' => 'User role',
            'country' => 'Country',
            'user_id' => 'User',
            'first_order' => 'First order',
        ];

        $operatorLabels = [
            '>=' => 'at least',
            '<=' => 'at most',
            '==' => 'equal to',
            '!=' => 'not equal to',
            '>' => 'greater than',
            '<' => 'less than',
            'in' => 'one of',
            'not_in' => 'not one of',
        ];

        $type = $typeLabels[$condition->type] ?? $condition->type;
        $operator = $operatorLabels[$condition->operator] ?? $condition->operator;
        $currentValue = $data[$condition->type] ?? $data[str_replace('cart_', '', $condition->type)] ?? 'N/A';

        return "{$type} must be {$operator} {$condition->value} (currently: {$currentValue})";
    }
}
