<?php

namespace App\Services\OfferEngine;

use App\Models\DiscountRule;
use Illuminate\Support\Collection;

class StackingResolver
{
    /**
     * Stacking rules matrix
     *
     * Key: rule type
     * Value: array of types it can stack with
     */
    const STACKING_MATRIX = [
        'product' => ['bogo', 'bxgx', 'shipping'],
        'bulk' => ['shipping'],
        'bundle' => ['shipping'],
        'bogo' => ['product', 'shipping'],
        'bxgx' => ['product', 'shipping'],
        'cart' => ['shipping'],
        'shipping' => ['product', 'bulk', 'bundle', 'bogo', 'bxgx', 'cart', 'shipping'],
    ];

    /**
     * Check if two rules can stack
     */
    public function canStack(DiscountRule $rule1, DiscountRule $rule2): bool
    {
        $type1 = $this->getType($rule1);
        $type2 = $this->getType($rule2);

        // Same rule cannot stack with itself
        if ($rule1->id === $rule2->id) {
            return false;
        }

        // Check conflict groups
        if ($rule1->conflict_group && $rule1->conflict_group === $rule2->conflict_group) {
            return false;
        }

        // Same type cannot stack (except shipping)
        if ($type1 === $type2 && $type1 !== 'shipping') {
            return false;
        }

        // Check matrix
        $allowedTypes = self::STACKING_MATRIX[$type1] ?? [];
        return in_array($type2, $allowedTypes);
    }

    /**
     * Filter rules that can be applied together with already applied rules
     */
    public function resolveStackableRules(Collection $rules, array $appliedRuleIds, Collection $allRules): Collection
    {
        if (empty($appliedRuleIds)) {
            return $rules;
        }

        return $rules->filter(function ($rule) use ($appliedRuleIds, $allRules) {
            foreach ($appliedRuleIds as $appliedRuleId) {
                $appliedRule = $allRules->firstWhere('id', $appliedRuleId);
                if ($appliedRule && !$this->canStack($rule, $appliedRule)) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Get the single best rule when stacking is not allowed
     * Selects by priority first, then by potential discount amount
     */
    public function getBestRule(Collection $eligibleRules, array $items, ?callable $discountCalculator = null): ?DiscountRule
    {
        if ($eligibleRules->isEmpty()) {
            return null;
        }

        // If no calculator provided, just return highest priority
        if (!$discountCalculator) {
            return $eligibleRules->first();
        }

        // Calculate potential discount for each rule and select best
        $bestRule = null;
        $bestDiscount = 0;

        foreach ($eligibleRules as $rule) {
            $discount = $discountCalculator($rule, $items);
            if ($discount > $bestDiscount) {
                $bestDiscount = $discount;
                $bestRule = $rule;
            }
        }

        return $bestRule ?? $eligibleRules->first();
    }

    /**
     * Sort rules by stacking priority
     * Order: Product → Bulk → Bundle → BOGO → BXGX → Cart → Shipping
     */
    public function sortByStackingPriority(Collection $rules): Collection
    {
        $typeOrder = [
            'product' => 1,
            'bulk' => 2,
            'bundle' => 3,
            'bogo' => 4,
            'bxgx' => 5,
            'cart' => 6,
            'shipping' => 7,
        ];

        return $rules->sortBy([
            fn($rule) => $rule->priority ?? 0,
            fn($rule) => $typeOrder[$this->getType($rule)] ?? 99,
            fn($rule) => -($rule->type_weight ?? 0),
        ]);
    }

    /**
     * Group rules by whether they can stack together
     * Returns groups of rules that can be applied together
     */
    public function groupStackableRules(Collection $rules): array
    {
        $groups = [];
        $processed = [];

        foreach ($rules as $rule) {
            if (in_array($rule->id, $processed)) {
                continue;
            }

            $group = [$rule];
            $processed[] = $rule->id;

            foreach ($rules as $otherRule) {
                if (in_array($otherRule->id, $processed)) {
                    continue;
                }

                // Check if this rule can stack with all rules in the group
                $canStackWithGroup = true;
                foreach ($group as $groupRule) {
                    if (!$this->canStack($otherRule, $groupRule)) {
                        $canStackWithGroup = false;
                        break;
                    }
                }

                if ($canStackWithGroup) {
                    $group[] = $otherRule;
                    $processed[] = $otherRule->id;
                }
            }

            $groups[] = $group;
        }

        return $groups;
    }

    /**
     * Get the rule type as string
     */
    private function getType(DiscountRule $rule): string
    {
        return $rule->rule_type instanceof \BackedEnum
            ? $rule->rule_type->value
            : (string) $rule->rule_type;
    }
}
