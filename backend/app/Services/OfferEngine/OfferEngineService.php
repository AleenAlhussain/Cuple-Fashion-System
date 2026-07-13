<?php

namespace App\Services\OfferEngine;

use App\Models\DiscountRule;
use App\Services\OfferEngine\Calculators\BogoDiscountCalculator;
use App\Services\OfferEngine\Calculators\BulkDiscountCalculator;
use App\Services\OfferEngine\Calculators\BundleDiscountCalculator;
use App\Services\OfferEngine\Calculators\BxgxDiscountCalculator;
use App\Services\OfferEngine\Calculators\CartDiscountCalculator;
use App\Services\OfferEngine\Calculators\ProductDiscountCalculator;
use App\Services\OfferEngine\Checkers\RuleActivationChecker;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\DTOs\DiscountResultDTO;
use App\Services\OfferEngine\Filters\EligibilityFilter;
use App\Services\OfferEngine\Validators\ConditionValidator;
use Illuminate\Support\Collection;

class OfferEngineService
{
    private array $appliedStackingGroups = [];

    public function __construct(
        private readonly RuleActivationChecker $activationChecker,
        private readonly EligibilityFilter $eligibilityFilter,
        private readonly ConditionValidator $conditionValidator,
        private readonly ProductDiscountCalculator $productCalculator,
        private readonly CartDiscountCalculator $cartCalculator,
        private readonly BulkDiscountCalculator $bulkCalculator,
        private readonly BundleDiscountCalculator $bundleCalculator,
        private readonly BogoDiscountCalculator $bogoCalculator,
        private readonly BxgxDiscountCalculator $bxgxCalculator,
    ) {}

    /**
     * Calculate discounts for cart items.
     *
     * @param array $cartItems Raw cart item data
     * @param array $contextData Context data (user, country, etc.)
     * @return DiscountResultDTO
     */
    public function calculate(array $cartItems, array $contextData = []): DiscountResultDTO
    {
        $result = new DiscountResultDTO();
        $this->appliedStackingGroups = [];

        // Convert to DTOs
        $items = CartItemDTO::collection($cartItems);
        $context = ContextDTO::fromArray($contextData);

        if (empty($items)) {
            return $result;
        }

        // Get active rules ordered by priority
        $rules = $this->getActiveRules($context);

        \Log::info('[OfferEngine] Active rules found', [
            'count' => $rules->count(),
            'rules' => $rules->pluck('name', 'id')->toArray(),
        ]);

        if ($rules->isEmpty()) {
            \Log::info('[OfferEngine] No active rules found');
            return $result;
        }

        // Process each rule
        foreach ($rules as $rule) {
            $ruleResult = $this->processRule($rule, $items, $context);

            if ($ruleResult->hasDiscounts()) {
                $result->merge($ruleResult);

                // Check if this rule blocks other rules
                if ($rule->stop_other_rules) {
                    break;
                }

                // Track stacking group
                if ($rule->stacking_group) {
                    $this->appliedStackingGroups[$rule->stacking_group] = true;
                }
            }
        }

        return $result;
    }

    /**
     * Preview discounts without incrementing usage.
     * Same as calculate but marks context as preview.
     */
    public function preview(array $cartItems, array $contextData = []): DiscountResultDTO
    {
        $contextData['is_preview'] = true;
        return $this->calculate($cartItems, $contextData);
    }

    /**
     * Get active offer messages for a variant.
     */
    public function getActiveOfferMessages(int $variantId): array
    {
        $messages = [];

        $rules = DiscountRule::active()
            ->byPriority()
            ->withAllRelations()
            ->whereNotNull('offer_message')
            ->get();

        $context = ContextDTO::fromArray([]);
        $dummyItem = new CartItemDTO(
            variant_id: $variantId,
            variant_sku: '',
            price: 0,
            qty: 1,
            product_id: 0
        );

        foreach ($rules as $rule) {
            if (!$this->activationChecker->isActive($rule, $context)) {
                continue;
            }

            // Check if variant matches any filter
            $filters = $rule->filters;
            if ($filters->isEmpty()) {
                // No filters = applies to all
                $messages[] = $rule->offer_message;
                continue;
            }

            // Check if variant is eligible
            $eligibleItems = $this->eligibilityFilter->getEligibleItems([$dummyItem], $rule);
            if (!empty($eligibleItems)) {
                $messages[] = $rule->offer_message;
            }
        }

        return array_unique($messages);
    }

    /**
     * Get all currently active rules.
     */
    private function getActiveRules(ContextDTO $context): Collection
    {
        $rules = DiscountRule::active()
            ->byPriority()
            ->withAllRelations()
            ->get();

        return $rules->filter(fn($rule) => $this->activationChecker->isActive($rule, $context));
    }

    /**
     * Process a single rule.
     */
    private function processRule(
        DiscountRule $rule,
        array $items,
        ContextDTO $context
    ): DiscountResultDTO {
        $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
            ? $rule->rule_type->value
            : $rule->rule_type;

        \Log::info("[OfferEngine] Processing rule", [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'rule_type' => $ruleType,
            'discount_type' => $rule->discount_type instanceof \App\Enums\DiscountType ? $rule->discount_type->value : $rule->discount_type,
            'discount_value' => $rule->discount_value,
            'min_cart_total' => $rule->min_cart_total,
            'has_filters' => $rule->filters->count(),
            'has_conditions' => $rule->conditions->count(),
        ]);

        // Check stacking group
        if ($rule->stacking_group && isset($this->appliedStackingGroups[$rule->stacking_group])) {
            \Log::info("[OfferEngine] Rule {$rule->id} skipped - stacking group conflict");
            return new DiscountResultDTO();
        }

        // Get eligible items based on rule type
        if ($rule->isBogo()) {
            return $this->processBogoRule($rule, $items, $context);
        }

        // BXGX: Same items for both buy and get
        if ($rule->isBxgx()) {
            return $this->processBxgxRule($rule, $items, $context);
        }

        // For non-BOGO rules
        $eligibleItems = $this->eligibilityFilter->getEligibleItems($items, $rule);

        // Log detailed filter info if no eligible items
        if (empty($eligibleItems) && $rule->filters->isNotEmpty()) {
            \Log::info("[OfferEngine] Rule {$rule->id} filter debug", [
                'filters' => $rule->filters->map(fn($f) => [
                    'type' => $f->filter_type,
                    'values' => $f->filter_values,
                    'target' => $f->target,
                    'is_exclude' => $f->is_exclude,
                ])->toArray(),
                'cart_items' => array_map(fn($item) => [
                    'product_id' => $item->product_id,
                    'variant_id' => $item->variant_id,
                    'category_ids' => $item->category_ids,
                ], $items),
            ]);
        }

        \Log::info("[OfferEngine] Rule {$rule->id} eligible items", [
            'rule_name' => $rule->name,
            'eligible_count' => count($eligibleItems),
            'total_items' => count($items),
        ]);

        if (empty($eligibleItems)) {
            \Log::info("[OfferEngine] Rule {$rule->id} no eligible items - filters excluded all items");
            return new DiscountResultDTO();
        }

        // Evaluate filter-level conditions (eligible_qty, eligible_subtotal)
        if (!$rule->evaluateFilterConditions($eligibleItems)) {
            \Log::info("[OfferEngine] Rule {$rule->id} filter conditions not met");
            return new DiscountResultDTO();
        }

        // Calculate eligible subtotal for logging
        $eligibleSubtotal = array_sum(array_map(fn($item) => $item->getSubtotal(), $eligibleItems));
        \Log::info("[OfferEngine] Rule {$rule->id} eligible subtotal: {$eligibleSubtotal}");

        // Validate conditions
        if (!$this->conditionValidator->validate($rule, $items, $eligibleItems, $context)) {
            $reason = $this->conditionValidator->getFailureReason($rule, $items, $eligibleItems, $context);
            \Log::info("[OfferEngine] Rule {$rule->id} conditions not met", [
                'reason' => $reason,
            ]);
            return new DiscountResultDTO();
        }

        \Log::info("[OfferEngine] Rule {$rule->id} conditions passed, calculating discount");

        // Calculate based on rule type
        $calcResult = $this->calculateForRuleType($rule, $eligibleItems, $context);
        \Log::info("[OfferEngine] Rule {$rule->id} calculated discount", [
            'discount' => $calcResult->getTotalDiscount(),
            'has_discounts' => $calcResult->hasDiscounts(),
        ]);
        return $calcResult;
    }

    /**
     * Process a BOGO rule with separate buy/get eligibility.
     */
    private function processBogoRule(
        DiscountRule $rule,
        array $items,
        ContextDTO $context
    ): DiscountResultDTO {
        \Log::info("[OfferEngine] Processing BOGO rule", [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'buy_qty' => $rule->buy_qty,
            'get_qty' => $rule->get_qty,
            'cart_items_count' => count($items),
            'cart_total_qty' => array_sum(array_map(fn($i) => $i->qty, $items)),
            'filters_count' => $rule->filters->count(),
            'filters' => $rule->filters->map(fn($f) => [
                'type' => $f->filter_type,
                'target' => $f->target,
                'values' => $f->filter_values,
            ])->toArray(),
        ]);

        // Get buy-eligible and get-eligible items separately
        $buyItems = $this->eligibilityFilter->getBuyEligibleItems($items, $rule);
        $getItems = $this->eligibilityFilter->getGetEligibleItems($items, $rule);

        \Log::info("[OfferEngine] BOGO eligible items", [
            'rule_id' => $rule->id,
            'buy_items_count' => count($buyItems),
            'buy_items_qty' => array_sum(array_map(fn($i) => $i->qty, $buyItems)),
            'get_items_count' => count($getItems),
            'get_items_qty' => array_sum(array_map(fn($i) => $i->qty, $getItems)),
        ]);

        // If no get-eligible items or buy-eligible items, no discount
        if (empty($getItems) || empty($buyItems)) {
            \Log::info("[OfferEngine] BOGO rule skipped - no eligible items", [
                'rule_id' => $rule->id,
                'has_buy_items' => !empty($buyItems),
                'has_get_items' => !empty($getItems),
            ]);
            return new DiscountResultDTO();
        }

        // Evaluate filter-level conditions against buy items
        if (!$rule->evaluateFilterConditions($buyItems)) {
            \Log::info("[OfferEngine] BOGO rule {$rule->id} filter conditions not met");
            return new DiscountResultDTO();
        }

        // Validate conditions using buy items
        if (!$this->conditionValidator->validate($rule, $items, $buyItems, $context)) {
            \Log::info("[OfferEngine] BOGO rule conditions not met", [
                'rule_id' => $rule->id,
            ]);
            return new DiscountResultDTO();
        }

        // Calculate BOGO discount with separate pools (buy/get items are different)
        $result = $this->bogoCalculator->calculateWithSeparateItems(
            $rule,
            $buyItems,
            $getItems,
            $context,
            separatePools: true
        );

        \Log::info("[OfferEngine] BOGO rule result", [
            'rule_id' => $rule->id,
            'discount' => $result->getTotalDiscount(),
            'has_discounts' => $result->hasDiscounts(),
        ]);

        return $result;
    }

    /**
     * Process a BXGX rule (Buy X Get X - same product pool).
     */
    private function processBxgxRule(
        DiscountRule $rule,
        array $items,
        ContextDTO $context
    ): DiscountResultDTO {
        // For BXGX, get items with 'both' target or standard eligibility
        $eligibleItems = $this->eligibilityFilter->getBothEligibleItems($items, $rule);

        if (empty($eligibleItems)) {
            // Fall back to standard eligibility if no 'both' filters
            $eligibleItems = $this->eligibilityFilter->getEligibleItems($items, $rule);
        }

        if (empty($eligibleItems)) {
            return new DiscountResultDTO();
        }

        // Evaluate filter-level conditions
        if (!$rule->evaluateFilterConditions($eligibleItems)) {
            \Log::info("[OfferEngine] BXGX rule {$rule->id} filter conditions not met");
            return new DiscountResultDTO();
        }

        // Validate conditions
        if (!$this->conditionValidator->validate($rule, $items, $eligibleItems, $context)) {
            return new DiscountResultDTO();
        }

        return $this->bxgxCalculator->calculate($rule, $eligibleItems, $context);
    }

    /**
     * Calculate discount based on rule type.
     */
    private function calculateForRuleType(
        DiscountRule $rule,
        array $eligibleItems,
        ContextDTO $context
    ): DiscountResultDTO {
        $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
            ? $rule->rule_type->value
            : $rule->rule_type;

        return match ($ruleType) {
            'product' => $this->productCalculator->calculate($rule, $eligibleItems, $context),
            'cart' => $this->cartCalculator->calculate($rule, $eligibleItems, $context),
            'bulk' => $this->bulkCalculator->calculate($rule, $eligibleItems, $context),
            'bundle' => $this->bundleCalculator->calculate($rule, $eligibleItems, $context),
            'bogo' => $this->bogoCalculator->calculate($rule, $eligibleItems, $context),
            'bxgx' => $this->bxgxCalculator->calculate($rule, $eligibleItems, $context),
            default => new DiscountResultDTO(),
        };
    }

    /**
     * Get statistics for all discount rules.
     */
    public function getStatistics(): array
    {
        $totalRules = DiscountRule::count();
        $activeRules = DiscountRule::active()->count();

        $thisMonthUsages = \App\Models\DiscountRuleUsage::thisMonth();
        $totalDiscountsThisMonth = $thisMonthUsages->sum('discount_amount');

        $mostUsedRules = DiscountRule::withCount('usages')
            ->orderBy('usages_count', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'rule_type']);

        return [
            'total_rules' => $totalRules,
            'active_rules' => $activeRules,
            'total_discounts_this_month' => round($totalDiscountsThisMonth, 2),
            'most_used_rules' => $mostUsedRules->map(fn($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'rule_type' => $r->rule_type instanceof \App\Enums\DiscountRuleType ? $r->rule_type->value : $r->rule_type,
                'usages_count' => $r->usages_count,
            ])->toArray(),
        ];
    }
}
