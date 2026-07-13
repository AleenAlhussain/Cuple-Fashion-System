<?php

namespace App\Services\OfferEngine;

use App\Models\DiscountRule;
use App\Models\ProductVariant;
use App\Services\OfferEngine\Calculators\ProductDiscountCalculator;
use App\Services\OfferEngine\Calculators\CartDiscountCalculator;
use App\Services\OfferEngine\Calculators\BulkDiscountCalculator;
use App\Services\OfferEngine\Calculators\BundleDiscountCalculator;
use App\Services\OfferEngine\Calculators\BogoDiscountCalculator;
use App\Services\OfferEngine\Calculators\BxgxDiscountCalculator;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\DTOs\DiscountResultDTO;
use App\Services\OfferEngine\Filters\EligibilityFilter;
use App\Services\OfferEngine\Filters\FilterMatcher;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SkuOfferEngineService
{
    private EligibilityFilter $eligibilityFilter;
    private StackingResolver $stackingResolver;

    // Calculators
    private ProductDiscountCalculator $productCalculator;
    private BulkDiscountCalculator $bulkCalculator;
    private BundleDiscountCalculator $bundleCalculator;
    private BogoDiscountCalculator $bogoCalculator;
    private BxgxDiscountCalculator $bxgxCalculator;
    private CartDiscountCalculator $cartCalculator;

    public function __construct()
    {
        $this->eligibilityFilter = new EligibilityFilter(new FilterMatcher());
        $this->stackingResolver = new StackingResolver();

        $this->productCalculator = new ProductDiscountCalculator($this->eligibilityFilter);
        $this->bulkCalculator = new BulkDiscountCalculator($this->eligibilityFilter);
        $this->bundleCalculator = new BundleDiscountCalculator($this->eligibilityFilter);
        $this->bogoCalculator = new BogoDiscountCalculator($this->eligibilityFilter);
        $this->bxgxCalculator = new BxgxDiscountCalculator($this->eligibilityFilter);
        $this->cartCalculator = new CartDiscountCalculator($this->eligibilityFilter);
    }

    /**
     * Main entry point - Calculate all discounts for cart
     *
     * @param array $cartItems Array of items with variant_id, sku, price, qty, category_ids
     * @param float $cartSubtotal
     * @param float $shippingCost
     * @param array $context Additional context (user_id, is_first_order, etc.)
     * @return array
     */
    public function calculateDiscounts(array $cartItems, float $cartSubtotal, float $shippingCost = 0, array $context = []): array
    {
        Log::info('[SkuOfferEngine] Starting calculation', [
            'items_count' => count($cartItems),
            'subtotal' => $cartSubtotal,
            'shipping' => $shippingCost,
        ]);

        // Step 1: Load active rules
        $activeRules = $this->loadActiveRules();

        if ($activeRules->isEmpty()) {
            Log::info('[SkuOfferEngine] No active rules found');
            return $this->buildEmptyResponse($cartItems, $cartSubtotal, $shippingCost);
        }

        // Step 2: Sort by priority and type weight
        $sortedRules = $this->sortRulesByPriority($activeRules);

        // Step 3: Enrich cart items with variant info and convert to DTOs
        $enrichedItems = $this->enrichCartItems($cartItems);
        $itemDTOs = $this->convertToCartItemDTOs($enrichedItems);

        // Step 4: Build context DTO
        $contextDTO = new ContextDTO(
            user_id: $context['user_id'] ?? null,
            is_first_order: $context['is_first_order'] ?? false,
            country: $context['country'] ?? 'AE',
            cart_subtotal: $cartSubtotal,
            cart_qty: array_sum(array_column($enrichedItems, 'qty')),
        );

        // Step 5: Initialize result structure
        $result = [
            'items' => $enrichedItems,
            'line_discounts' => [],
            'cart_discount' => 0,
            'shipping_discount' => 0,
            'total_discount' => 0,
            'applied_rules' => [],
            'messages' => [],
        ];

        // Step 6: Apply Line-Level (SKU) discounts
        $lineResult = $this->applyLineLevelDiscounts($itemDTOs, $sortedRules, $contextDTO);
        $result['items'] = $lineResult['items'];
        $result['line_discounts'] = $lineResult['discounts'];
        $result['applied_rules'] = array_merge($result['applied_rules'], $lineResult['applied_rules']);

        // Calculate subtotal after line discounts
        $subtotalAfterLineDiscounts = $this->calculateSubtotalAfterDiscounts($result['items']);

        // Step 7: Apply Cart-Level discounts
        $cartResult = $this->applyCartLevelDiscounts($subtotalAfterLineDiscounts, $itemDTOs, $sortedRules, $result['applied_rules'], $contextDTO);
        $result['cart_discount'] = $cartResult['discount'];
        $result['applied_rules'] = array_merge($result['applied_rules'], $cartResult['applied_rules']);

        // Step 8: Apply Shipping discounts (always stacks)
        $shippingResult = $this->applyShippingDiscounts($shippingCost, $subtotalAfterLineDiscounts, $sortedRules, $contextDTO);
        $result['shipping_discount'] = $shippingResult['discount'];
        $result['applied_rules'] = array_merge($result['applied_rules'], $shippingResult['applied_rules']);

        // Step 9: Calculate totals
        $lineDiscountTotal = array_sum(array_column($result['line_discounts'], 'amount'));
        $result['total_discount'] = $lineDiscountTotal + $result['cart_discount'] + $result['shipping_discount'];

        // Step 10: Build final breakdown
        $result['breakdown'] = $this->buildBreakdown($result);
        $result['grand_total'] = max(0, $cartSubtotal - $result['total_discount'] + $shippingCost - $result['shipping_discount']);

        Log::info('[SkuOfferEngine] Calculation complete', [
            'total_discount' => $result['total_discount'],
            'applied_rules_count' => count($result['applied_rules']),
        ]);

        return $result;
    }

    /**
     * Preview discounts without saving (for cart display)
     */
    public function previewDiscounts(array $cartItems, float $cartSubtotal, float $shippingCost = 0, array $context = []): array
    {
        return $this->calculateDiscounts($cartItems, $cartSubtotal, $shippingCost, $context);
    }

    /**
     * Load all active rules with relationships
     */
    private function loadActiveRules(): Collection
    {
        return DiscountRule::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->with(['filters', 'conditions', 'ranges', 'schedules', 'promoGroups'])
            ->get();
    }

    /**
     * Sort rules by priority and type weight
     */
    private function sortRulesByPriority(Collection $rules): Collection
    {
        return $rules->sortBy([
            ['priority', 'desc'], // Higher priority first
            ['type_weight', 'desc'], // Higher type weight first within same priority
        ])->values();
    }

    /**
     * Enrich cart items with variant/SKU information
     */
    private function enrichCartItems(array $items): array
    {
        $variantIds = array_filter(array_column($items, 'variant_id'));

        if (empty($variantIds)) {
            return $items;
        }

        $variants = ProductVariant::whereIn('id', $variantIds)
            ->with(['product.categories', 'product.tags'])
            ->get()
            ->keyBy('id');

        // Load promo group memberships
        $promoGroupMemberships = DB::table('promo_group_sku')
            ->whereIn('product_variant_id', $variantIds)
            ->get()
            ->groupBy('product_variant_id');

        foreach ($items as &$item) {
            $variantId = $item['variant_id'] ?? null;

            if ($variantId && isset($variants[$variantId])) {
                $variant = $variants[$variantId];
                $product = $variant->product;

                $item['sku'] = $variant->sku ?? $item['sku'] ?? null;
                $item['variant_sku'] = $variant->sku ?? $item['sku'] ?? null;
                $item['product_id'] = $product->id ?? $item['product_id'] ?? null;
                $item['category_ids'] = $product->categories->pluck('id')->toArray();
                $item['tag_ids'] = $product->tags->pluck('id')->toArray();
                $item['promo_group_ids'] = isset($promoGroupMemberships[$variantId])
                    ? $promoGroupMemberships[$variantId]->pluck('promo_group_id')->toArray()
                    : [];
                $item['original_price'] = $item['price'];
                $item['final_price'] = $item['price'];
                $item['discounts'] = [];
            } else {
                $item['original_price'] = $item['price'] ?? 0;
                $item['final_price'] = $item['price'] ?? 0;
                $item['discounts'] = [];
                $item['promo_group_ids'] = [];
            }
        }

        return $items;
    }

    /**
     * Convert enriched items to CartItemDTO objects
     */
    private function convertToCartItemDTOs(array $items): array
    {
        $dtos = [];
        foreach ($items as $index => $item) {
            $dtos[] = new CartItemDTO(
                variant_id: $item['variant_id'] ?? 0,
                variant_sku: $item['variant_sku'] ?? $item['sku'] ?? '',
                price: (float) ($item['price'] ?? 0),
                qty: (int) ($item['qty'] ?? 1),
                product_id: $item['product_id'] ?? null,
                category_ids: $item['category_ids'] ?? [],
                tag_ids: $item['tag_ids'] ?? [],
                attributes: $item['attributes'] ?? [],
                line_id: $item['line_id'] ?? "line_{$index}",
            );
        }
        return $dtos;
    }

    /**
     * Apply Line-Level (SKU) discounts: Product, Bulk, Bundle, BOGO, BXGX
     */
    private function applyLineLevelDiscounts(array $itemDTOs, Collection $rules, ContextDTO $context): array
    {
        $appliedRules = [];
        $discounts = [];
        $appliedRuleIds = [];
        $items = $this->dtosToArray($itemDTOs);

        // Separate rules by type
        $productRules = $rules->filter(fn($r) => $this->getRuleType($r) === 'product');
        $bulkRules = $rules->filter(fn($r) => $this->getRuleType($r) === 'bulk');
        $bundleRules = $rules->filter(fn($r) => $this->getRuleType($r) === 'bundle');
        $bogoRules = $rules->filter(fn($r) => $this->getRuleType($r) === 'bogo');
        $bxgxRules = $rules->filter(fn($r) => $this->getRuleType($r) === 'bxgx');

        // Apply in order: Product → Bulk/Bundle/BOGO/BXGX

        // 1. Product Adjustments (can stack with BOGO)
        foreach ($productRules as $rule) {
            if (!$this->canApplyRule($rule, $context)) {
                continue;
            }

            $eligibleItems = $this->eligibilityFilter->getEligibleItems($itemDTOs, $rule);

            if (!empty($eligibleItems)) {
                $result = $this->productCalculator->calculate($rule, $eligibleItems, $context);

                if ($result->getTotalDiscount() > 0) {
                    $items = $this->applyDiscountToItems($items, $result, $rule);
                    $discounts[] = [
                        'rule_id' => $rule->id,
                        'rule_name' => $rule->name,
                        'type' => 'product',
                        'amount' => $result->getTotalDiscount(),
                    ];
                    $appliedRules[] = $this->formatAppliedRule($rule, $result->getTotalDiscount());
                    $appliedRuleIds[] = $rule->id;
                }
            }
        }

        // 2. Bulk Discounts (exclusive - check stacking)
        foreach ($bulkRules as $rule) {
            if (!$this->canApplyRule($rule, $context)) {
                continue;
            }

            if (!$this->canApplyWithStackingRules($rule, $appliedRuleIds, $rules)) {
                continue;
            }

            $eligibleItems = $this->eligibilityFilter->getEligibleItems($itemDTOs, $rule);

            if (!empty($eligibleItems)) {
                $result = $this->bulkCalculator->calculate($rule, $eligibleItems, $context);

                if ($result->getTotalDiscount() > 0) {
                    $items = $this->applyDiscountToItems($items, $result, $rule);
                    $discounts[] = [
                        'rule_id' => $rule->id,
                        'rule_name' => $rule->name,
                        'type' => 'bulk',
                        'amount' => $result->getTotalDiscount(),
                    ];
                    $appliedRules[] = $this->formatAppliedRule($rule, $result->getTotalDiscount());
                    $appliedRuleIds[] = $rule->id;
                }
            }
        }

        // 3. Bundle Discounts (exclusive)
        foreach ($bundleRules as $rule) {
            if (!$this->canApplyRule($rule, $context)) {
                continue;
            }

            if (!$this->canApplyWithStackingRules($rule, $appliedRuleIds, $rules)) {
                continue;
            }

            $eligibleItems = $this->eligibilityFilter->getEligibleItems($itemDTOs, $rule);
            $result = $this->bundleCalculator->calculate($rule, $eligibleItems, $context);

            if ($result->getTotalDiscount() > 0) {
                $items = $this->applyDiscountToItems($items, $result, $rule);
                $discounts[] = [
                    'rule_id' => $rule->id,
                    'rule_name' => $rule->name,
                    'type' => 'bundle',
                    'amount' => $result->getTotalDiscount(),
                ];
                $appliedRules[] = $this->formatAppliedRule($rule, $result->getTotalDiscount());
                $appliedRuleIds[] = $rule->id;
            }
        }

        // 4. BOGO (can stack with Product Adjustment only)
        foreach ($bogoRules as $rule) {
            if (!$this->canApplyRule($rule, $context)) {
                continue;
            }

            if (!$this->canApplyWithStackingRules($rule, $appliedRuleIds, $rules)) {
                continue;
            }

            $eligibleItems = $this->eligibilityFilter->getEligibleItems($itemDTOs, $rule);
            $result = $this->bogoCalculator->calculate($rule, $eligibleItems, $context);

            if ($result->getTotalDiscount() > 0) {
                $items = $this->applyDiscountToItems($items, $result, $rule);
                $discounts[] = [
                    'rule_id' => $rule->id,
                    'rule_name' => $rule->name,
                    'type' => 'bogo',
                    'amount' => $result->getTotalDiscount(),
                ];
                $appliedRules[] = $this->formatAppliedRule($rule, $result->getTotalDiscount());
                $appliedRuleIds[] = $rule->id;
            }
        }

        // 5. BXGX
        foreach ($bxgxRules as $rule) {
            if (!$this->canApplyRule($rule, $context)) {
                continue;
            }

            if (!$this->canApplyWithStackingRules($rule, $appliedRuleIds, $rules)) {
                continue;
            }

            $eligibleItems = $this->eligibilityFilter->getEligibleItems($itemDTOs, $rule);
            $result = $this->bxgxCalculator->calculate($rule, $eligibleItems, $context);

            if ($result->getTotalDiscount() > 0) {
                $items = $this->applyDiscountToItems($items, $result, $rule);
                $discounts[] = [
                    'rule_id' => $rule->id,
                    'rule_name' => $rule->name,
                    'type' => 'bxgx',
                    'amount' => $result->getTotalDiscount(),
                ];
                $appliedRules[] = $this->formatAppliedRule($rule, $result->getTotalDiscount());
                $appliedRuleIds[] = $rule->id;
            }
        }

        return [
            'items' => $items,
            'discounts' => $discounts,
            'applied_rules' => $appliedRules,
        ];
    }

    /**
     * Apply Cart-Level discounts
     */
    private function applyCartLevelDiscounts(float $subtotal, array $itemDTOs, Collection $rules, array $alreadyApplied, ContextDTO $context): array
    {
        $cartRules = $rules->filter(fn($r) => $this->getRuleType($r) === 'cart');

        $discount = 0;
        $appliedRules = [];

        foreach ($cartRules as $rule) {
            // Cart adjustment - only one can apply
            if (!empty($appliedRules)) {
                break;
            }

            if (!$this->canApplyRule($rule, $context)) {
                continue;
            }

            // Check min cart total
            $minCartTotal = (float) ($rule->min_cart_total ?? 0);
            if ($subtotal < $minCartTotal) {
                continue;
            }

            // Check max cart total if set
            $maxCartTotal = $rule->max_cart_total ? (float) $rule->max_cart_total : null;
            if ($maxCartTotal && $subtotal > $maxCartTotal) {
                continue;
            }

            // Evaluate conditions
            if (!$rule->evaluateConditions([
                'cart_subtotal' => $subtotal,
                'cart_qty' => $context->cart_qty,
                'user_id' => $context->user_id,
                'is_first_order' => $context->is_first_order,
                'country' => $context->country,
            ])) {
                continue;
            }

            $result = $this->cartCalculator->calculate($rule, $itemDTOs, $context);

            if ($result->getTotalDiscount() > 0) {
                $discount = $result->getTotalDiscount();
                $appliedRules[] = $this->formatAppliedRule($rule, $discount);
            }
        }

        return [
            'discount' => $discount,
            'applied_rules' => $appliedRules,
        ];
    }

    /**
     * Apply Shipping discounts (always stacks)
     */
    private function applyShippingDiscounts(float $shippingCost, float $subtotal, Collection $rules, ContextDTO $context): array
    {
        $shippingRules = $rules->filter(fn($r) => $this->getRuleType($r) === 'shipping' || $r->applies_to_shipping);

        $discount = 0;
        $appliedRules = [];

        foreach ($shippingRules as $rule) {
            if (!$this->canApplyRule($rule, $context)) {
                continue;
            }

            // Check min cart total for free shipping
            $minCartTotal = (float) ($rule->min_cart_total ?? 0);
            if ($subtotal < $minCartTotal) {
                continue;
            }

            // Calculate shipping discount
            $discountValue = (float) ($rule->discount_value ?? 100);
            $discountType = $rule->discount_type instanceof \BackedEnum
                ? $rule->discount_type->value
                : ($rule->discount_type ?? 'percentage');

            if ($discountType === 'percentage') {
                $thisDiscount = $shippingCost * ($discountValue / 100);
            } else {
                $thisDiscount = min($discountValue, $shippingCost);
            }

            $discount += $thisDiscount;
            $appliedRules[] = $this->formatAppliedRule($rule, $thisDiscount);
        }

        // Cap at shipping cost
        $discount = min($discount, $shippingCost);

        return [
            'discount' => round($discount, 2),
            'applied_rules' => $appliedRules,
        ];
    }

    /**
     * Check if a rule can be applied (basic checks)
     */
    private function canApplyRule(DiscountRule $rule, ContextDTO $context): bool
    {
        // Check schedule
        if (!$rule->isCurrentlyActive()) {
            return false;
        }

        // Check usage limits
        if ($rule->hasUsageLimitReached($context->user_id)) {
            return false;
        }

        return true;
    }

    /**
     * Check if a rule can be applied based on stacking rules
     */
    private function canApplyWithStackingRules(DiscountRule $rule, array $appliedRuleIds, Collection $allRules): bool
    {
        if (empty($appliedRuleIds)) {
            return true;
        }

        foreach ($appliedRuleIds as $appliedId) {
            $appliedRule = $allRules->firstWhere('id', $appliedId);
            if ($appliedRule && !$this->stackingResolver->canStack($rule, $appliedRule)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Apply discount to items array
     */
    private function applyDiscountToItems(array $items, DiscountResultDTO $result, DiscountRule $rule): array
    {
        // Process adjusted_items from DiscountResultDTO
        if (!empty($result->adjusted_items)) {
            foreach ($result->adjusted_items as $adjustedItem) {
                foreach ($items as &$item) {
                    $itemVariantId = $item['variant_id'] ?? null;
                    $adjustedVariantId = $adjustedItem['variant_id'] ?? null;

                    if ($itemVariantId && $itemVariantId == $adjustedVariantId) {
                        $itemDiscount = $adjustedItem['discount_amount'] ?? 0;
                        $qty = $item['qty'] ?? 1;
                        $perUnitDiscount = $qty > 0 ? $itemDiscount / $qty : 0;
                        $item['final_price'] = max(0, ($item['final_price'] ?? $item['price']) - $perUnitDiscount);
                        $item['discounts'][] = [
                            'rule_id' => $rule->id,
                            'rule_name' => $rule->name,
                            'amount' => $itemDiscount,
                        ];
                    }
                }
            }
        }

        // Process free_items from DiscountResultDTO (for BOGO etc.)
        if (!empty($result->free_items)) {
            foreach ($result->free_items as $freeItem) {
                foreach ($items as &$item) {
                    $itemVariantId = $item['variant_id'] ?? null;
                    $freeVariantId = $freeItem['variant_id'] ?? null;

                    if ($itemVariantId && $itemVariantId == $freeVariantId) {
                        $itemDiscount = $freeItem['discount_amount'] ?? 0;
                        $qty = $item['qty'] ?? 1;
                        $perUnitDiscount = $qty > 0 ? $itemDiscount / $qty : 0;
                        $item['final_price'] = max(0, ($item['final_price'] ?? $item['price']) - $perUnitDiscount);
                        $item['discounts'][] = [
                            'rule_id' => $rule->id,
                            'rule_name' => $rule->name,
                            'amount' => $itemDiscount,
                            'free_qty' => $freeItem['free_qty'] ?? 0,
                        ];
                    }
                }
            }
        }

        return $items;
    }

    /**
     * Convert DTOs back to array
     */
    private function dtosToArray(array $itemDTOs): array
    {
        return array_map(fn($dto) => $dto->toArray(), $itemDTOs);
    }

    /**
     * Get rule type as string
     */
    private function getRuleType(DiscountRule $rule): string
    {
        return $rule->rule_type instanceof \BackedEnum
            ? $rule->rule_type->value
            : (string) $rule->rule_type;
    }

    /**
     * Format applied rule for response
     */
    private function formatAppliedRule(DiscountRule $rule, float $discount): array
    {
        return [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'rule_type' => $this->getRuleType($rule),
            'discount_amount' => round($discount, 2),
            'message' => $rule->offer_message,
        ];
    }

    /**
     * Calculate subtotal after discounts
     */
    private function calculateSubtotalAfterDiscounts(array $items): float
    {
        $total = 0;
        foreach ($items as $item) {
            $price = $item['final_price'] ?? $item['price'] ?? 0;
            $qty = $item['qty'] ?? 1;
            $total += $price * $qty;
        }
        return $total;
    }

    /**
     * Build breakdown for response
     */
    private function buildBreakdown(array $result): array
    {
        return [
            'line_discounts' => $result['line_discounts'],
            'cart_discount' => $result['cart_discount'],
            'shipping_discount' => $result['shipping_discount'],
            'total' => $result['total_discount'],
        ];
    }

    /**
     * Build empty response
     */
    private function buildEmptyResponse(array $items, float $subtotal, float $shippingCost): array
    {
        return [
            'items' => array_map(function ($item) {
                return array_merge($item, [
                    'original_price' => $item['price'] ?? 0,
                    'final_price' => $item['price'] ?? 0,
                    'discounts' => [],
                ]);
            }, $items),
            'line_discounts' => [],
            'cart_discount' => 0,
            'shipping_discount' => 0,
            'total_discount' => 0,
            'applied_rules' => [],
            'messages' => [],
            'breakdown' => [
                'line_discounts' => [],
                'cart_discount' => 0,
                'shipping_discount' => 0,
                'total' => 0,
            ],
            'grand_total' => $subtotal + $shippingCost,
        ];
    }

    /**
     * Get discount breakdown for a specific SKU/variant
     */
    public function getSkuDiscountBreakdown(int $variantId, int $qty = 1, array $context = []): array
    {
        $variant = ProductVariant::with(['product.categories', 'product.tags'])->find($variantId);

        if (!$variant) {
            return [
                'sku' => null,
                'original_price' => 0,
                'final_price' => 0,
                'discounts' => [],
            ];
        }

        $items = [[
            'variant_id' => $variant->id,
            'sku' => $variant->sku,
            'variant_sku' => $variant->sku,
            'price' => (float) $variant->price,
            'qty' => $qty,
            'product_id' => $variant->product_id,
            'category_ids' => $variant->product->categories->pluck('id')->toArray(),
            'tag_ids' => $variant->product->tags->pluck('id')->toArray(),
        ]];

        $result = $this->previewDiscounts($items, $variant->price * $qty, 0, $context);

        return [
            'sku' => $variant->sku,
            'original_price' => (float) $variant->price,
            'discounts' => $result['items'][0]['discounts'] ?? [],
            'final_price' => $result['items'][0]['final_price'] ?? (float) $variant->price,
            'applied_rules' => $result['applied_rules'],
        ];
    }
}
