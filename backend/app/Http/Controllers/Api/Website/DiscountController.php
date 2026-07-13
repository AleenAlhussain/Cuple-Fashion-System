<?php

namespace App\Http\Controllers\Api\Website;

use App\Http\Controllers\Controller;
use App\Models\DiscountRule;
use App\Models\Product;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\OfferEngineService;
use App\Services\OfferEngine\PromotionMessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiscountController extends Controller
{
    public function __construct(
        private readonly OfferEngineService $offerEngine,
        private readonly PromotionMessageService $promotionMessageService,
    ) {}

    /**
     * Calculate discounts for cart items.
     *
     * POST /api/website/cart/calculate-discounts
     */
    public function calculateDiscounts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|integer',
            'items.*.variant_sku' => 'sometimes|string|nullable', // Made optional - frontend generates fallback
            'items.*.price' => 'required|numeric|min:0',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.category_ids' => 'sometimes|array',
            'items.*.category_ids.*' => 'integer',
            'items.*.tag_ids' => 'sometimes|array',
            'items.*.tag_ids.*' => 'integer',
            'items.*.promo_group_ids' => 'sometimes|array',
            'items.*.promo_group_ids.*' => 'integer',
            'items.*.attributes' => 'sometimes|array',
            'items.*.line_id' => 'sometimes|string|nullable',
        ]);

        // Generate fallback SKU if not provided
        foreach ($validated['items'] as &$item) {
            if (empty($item['variant_sku'])) {
                $item['variant_sku'] = 'PROD-' . $item['product_id'] .
                    ($item['variant_id'] != $item['product_id'] ? '-V' . $item['variant_id'] : '');
            }
        }
        unset($item);

        // Enrich cart items with category_ids if missing (for filter matching)
        $validated['items'] = $this->enrichCartItemsWithCategories($validated['items']);

        \Log::info('[DiscountController] Calculating discounts', [
            'items_count' => count($validated['items']),
            'items' => $validated['items'],
        ]);

        $cartItems = CartItemDTO::collection($validated['items']);

        $context = [
            'user_id' => $request->user()?->id,
            'country' => $request->input('country', 'AE'),
            'timezone' => $request->input('timezone', 'Asia/Dubai'),
            'user_role' => $request->user()?->role,
            'is_first_order' => $this->isFirstOrder($request->user()),
            'promo_code' => $request->input('promo_code'),
        ];

        $result = $this->offerEngine->calculate($cartItems, $context);

        // Calculate cart subtotal for promotion messages
        $cartSubtotal = array_reduce($validated['items'], function ($sum, $item) {
            return $sum + ($item['price'] * $item['qty']);
        }, 0);

        \Log::info('[DiscountController] Cart subtotal calculated', [
            'subtotal' => $cartSubtotal,
            'items_prices' => array_map(fn($item) => ['price' => $item['price'], 'qty' => $item['qty']], $validated['items']),
        ]);

        // Get promotion messages (spend more to unlock discounts)
        $promotionMessages = $this->promotionMessageService->getPromotionMessages(
            $cartItems,
            $cartSubtotal,
            $context
        );

        \Log::info('[DiscountController] Result', [
            'total_discount' => $result->getTotalDiscount(),
            'applied_rules' => count($result->applied_rules),
            'promotion_messages' => count($promotionMessages),
        ]);

        $responseData = $result->toArray();
        $responseData['promotion_messages'] = $promotionMessages;

        return response()->json([
            'success' => true,
            'data' => $responseData,
        ]);
    }

    /**
     * Preview discounts without recording usage.
     *
     * POST /api/website/cart/preview-discounts
     */
    public function previewDiscounts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|integer',
            'items.*.variant_sku' => 'required|string',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.category_ids' => 'sometimes|array',
            'items.*.tag_ids' => 'sometimes|array',
            'items.*.promo_group_ids' => 'sometimes|array',
            'items.*.promo_group_ids.*' => 'integer',
            'items.*.attributes' => 'sometimes|array',
            'items.*.line_id' => 'sometimes|string|nullable',
        ]);

        // Enrich cart items with missing data
        $validated['items'] = $this->enrichCartItemsWithCategories($validated['items']);

        $cartItems = CartItemDTO::collection($validated['items']);

        $context = [
            'user_id' => $request->user()?->id,
            'country' => $request->input('country', 'AE'),
            'timezone' => $request->input('timezone', 'Asia/Dubai'),
            'user_role' => $request->user()?->role,
            'is_first_order' => $this->isFirstOrder($request->user()),
            'is_preview' => true,
            'promo_code' => $request->input('promo_code'),
        ];

        $result = $this->offerEngine->preview($cartItems, $context);

        return response()->json([
            'success' => true,
            'data' => $result->toArray(),
        ]);
    }

    /**
     * Get active offer messages for a variant.
     *
     * GET /api/website/products/{variantId}/offers
     */
    public function getVariantOffers(int $variantId): JsonResponse
    {
        $messages = $this->offerEngine->getActiveOfferMessages($variantId);

        return response()->json([
            'success' => true,
            'data' => [
                'variant_id' => $variantId,
                'offers' => $messages,
            ],
        ]);
    }

    /**
     * Get discount breakdown for a specific SKU/variant.
     *
     * GET /api/website/sku/{variantId}/discounts
     */
    public function getSkuDiscountBreakdown(Request $request, int $variantId): JsonResponse
    {
        $qty = (int) $request->input('qty', 1);

        $skuOfferEngine = new \App\Services\OfferEngine\SkuOfferEngineService();

        $context = [
            'user_id' => $request->user()?->id,
            'is_first_order' => $this->isFirstOrder($request->user()),
            'country' => $request->input('country', 'AE'),
        ];

        $result = $skuOfferEngine->getSkuDiscountBreakdown($variantId, $qty, $context);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Check if user's first order.
     */
    private function isFirstOrder($user): bool
    {
        if (!$user) {
            return false;
        }

        return $user->orders()->where('status', '!=', 'cancelled')->count() === 0;
    }

    /**
     * Enrich cart items with category_ids, tag_ids, and promo_group_ids from database if missing.
     * This ensures rules with category/tag/promo_group filters can match cart items.
     */
    private function enrichCartItemsWithCategories(array $items): array
    {
        // Find items missing category_ids or tag_ids
        $productIds = [];
        foreach ($items as $item) {
            if (empty($item['category_ids']) || empty($item['tag_ids'])) {
                $productIds[] = $item['product_id'];
            }
        }

        if (!empty($productIds)) {
            // Fetch categories and tags for products missing them
            $products = \App\Models\Product::whereIn('id', array_unique($productIds))
                ->with(['categories:id', 'tags:id'])
                ->get()
                ->keyBy('id');

            // Enrich items with category_ids and tag_ids
            foreach ($items as &$item) {
                $productId = $item['product_id'];
                if (isset($products[$productId])) {
                    $product = $products[$productId];

                    if (empty($item['category_ids'])) {
                        $item['category_ids'] = $product->categories->pluck('id')->toArray();
                    }

                    if (empty($item['tag_ids'])) {
                        $item['tag_ids'] = $product->tags ? $product->tags->pluck('id')->toArray() : [];
                    }
                }
            }
            unset($item);
        }

        // Enrich promo_group_ids from promo_group_sku pivot table (variant-level)
        $variantIds = array_filter(array_unique(array_column($items, 'variant_id')));
        if (!empty($variantIds)) {
            $promoGroupMemberships = \Illuminate\Support\Facades\DB::table('promo_group_sku')
                ->whereIn('product_variant_id', $variantIds)
                ->get()
                ->groupBy('product_variant_id');

            foreach ($items as &$item) {
                $variantId = $item['variant_id'] ?? 0;
                if (empty($item['promo_group_ids']) && isset($promoGroupMemberships[$variantId])) {
                    $item['promo_group_ids'] = $promoGroupMemberships[$variantId]->pluck('promo_group_id')->toArray();
                }
            }
            unset($item);
        }

        \Log::info('[DiscountController] Enriched cart items', [
            'products_enriched' => count($productIds),
            'variants_checked_for_promo_groups' => count($variantIds),
            'items_summary' => array_map(fn($item) => [
                'product_id' => $item['product_id'],
                'variant_id' => $item['variant_id'] ?? null,
                'category_ids' => $item['category_ids'] ?? [],
                'tag_ids' => $item['tag_ids'] ?? [],
                'promo_group_ids' => $item['promo_group_ids'] ?? [],
            ], $items),
        ]);

        return $items;
    }

    /**
     * Debug endpoint to simulate discount calculation.
     *
     * GET /api/website/cart/debug-calculate?subtotal=398
     */
    public function debugCalculate(Request $request): JsonResponse
    {
        $subtotal = (float) $request->input('subtotal', 398);
        $productId = (int) $request->input('product_id', 1);

        // Create a mock cart item
        $cartItems = [[
            'variant_id' => $productId,
            'variant_sku' => 'DEBUG-SKU',
            'price' => $subtotal,
            'qty' => 1,
            'product_id' => $productId,
            'category_ids' => [],
            'line_id' => 'debug-line-1',
        ]];

        $context = [
            'user_id' => null,
            'country' => 'AE',
            'timezone' => 'Asia/Dubai',
        ];

        // Calculate discounts
        $result = $this->offerEngine->calculate($cartItems, $context);

        return response()->json([
            'success' => true,
            'data' => [
                'input' => [
                    'subtotal' => $subtotal,
                    'product_id' => $productId,
                ],
                'result' => $result->toArray(),
                'total_discount' => $result->getTotalDiscount(),
                'applied_rules_count' => count($result->applied_rules),
                'check_logs' => 'Check storage/logs/laravel.log for [OfferEngine] and [CartDiscountCalculator] entries',
            ],
        ]);
    }

    /**
     * Debug endpoint to check/fix rule status.
     *
     * GET /api/website/cart/debug-rules
     * POST /api/website/cart/debug-rules/activate/{id}
     */
    public function debugRules(Request $request): JsonResponse
    {
        $rules = \App\Models\DiscountRule::with('conditions', 'filters')
            ->get()
            ->map(function ($rule) {
                $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
                    ? $rule->rule_type->value
                    : ($rule->getRawOriginal('rule_type') ?? (string)$rule->rule_type);

                return [
                    'id' => $rule->id,
                    'name' => $rule->name,
                    'rule_type' => $ruleType,
                    'is_active' => $rule->is_active,
                    'is_active_raw' => $rule->getRawOriginal('is_active'),
                    'discount_type' => $rule->discount_type instanceof \App\Enums\DiscountType
                        ? $rule->discount_type->value
                        : $rule->discount_type,
                    'discount_value' => $rule->discount_value,
                    'min_cart_total' => $rule->min_cart_total,
                    'filters_count' => $rule->filters->count(),
                    'conditions_count' => $rule->conditions->count(),
                    'filters' => $rule->filters->map(fn($f) => [
                        'type' => $f->filter_type,
                        'values' => $f->filter_values,
                        'target' => $f->target,
                    ])->toArray(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'rules' => $rules,
                'total' => $rules->count(),
                'active_count' => $rules->where('is_active', true)->count(),
            ],
        ]);
    }

    /**
     * Activate a specific rule (debug helper).
     *
     * POST /api/website/cart/debug-rules/activate/{id}
     */
    public function activateRule(int $id): JsonResponse
    {
        $rule = \App\Models\DiscountRule::findOrFail($id);
        $oldStatus = $rule->is_active;
        $rule->is_active = true;
        $rule->save();

        return response()->json([
            'success' => true,
            'message' => "Rule '{$rule->name}' activated",
            'data' => [
                'id' => $rule->id,
                'name' => $rule->name,
                'old_status' => $oldStatus,
                'new_status' => $rule->is_active,
            ],
        ]);
    }

    /**
     * Debug endpoint to test promotion messages.
     *
     * GET /api/website/cart/debug-promotions?subtotal=199
     */
    public function debugPromotions(Request $request): JsonResponse
    {
        $subtotal = (float) $request->input('subtotal', 179);

        // Get ALL rules (not just active) for debugging
        $allRules = \App\Models\DiscountRule::with('conditions')->get();

        $debug = [
            'subtotal' => $subtotal,
            'total_rules_in_db' => $allRules->count(),
            'all_rules' => $allRules->map(function($r) use ($subtotal) {
                $ruleType = $r->rule_type instanceof \App\Enums\DiscountRuleType
                    ? $r->rule_type->value
                    : ($r->getRawOriginal('rule_type') ?? (string)$r->rule_type);

                // Try to auto-detect min_cart_total
                $detectedMinCart = null;
                $detectionSource = null;

                if ($r->min_cart_total && $r->min_cart_total > 0) {
                    $detectedMinCart = (float) $r->min_cart_total;
                    $detectionSource = 'direct_field';
                }

                if (!$detectedMinCart && $r->conditions) {
                    foreach ($r->conditions as $c) {
                        if ($c->type === 'cart_subtotal' && in_array($c->operator, ['>=', '>'])) {
                            $detectedMinCart = (float) $c->value;
                            $detectionSource = 'condition';
                            break;
                        }
                    }
                }

                if (!$detectedMinCart && preg_match('/over\s*(\d+)/i', $r->name, $matches)) {
                    $detectedMinCart = (float) $matches[1];
                    $detectionSource = 'parsed_from_name';
                }

                $isEligibleForPromo = $r->is_active
                    && ($ruleType === 'cart' || $detectedMinCart > 0)
                    && $detectedMinCart > 0
                    && $subtotal < $detectedMinCart;

                return [
                    'id' => $r->id,
                    'name' => $r->name,
                    'is_active' => $r->is_active,
                    'rule_type_raw' => $r->getRawOriginal('rule_type'),
                    'rule_type' => $ruleType,
                    'is_cart_rule' => $ruleType === 'cart',
                    'starts_at' => $r->starts_at?->toDateTimeString(),
                    'ends_at' => $r->ends_at?->toDateTimeString(),
                    'min_cart_total_field' => $r->min_cart_total,
                    'detected_min_cart_total' => $detectedMinCart,
                    'detection_source' => $detectionSource,
                    'discount_value' => $r->discount_value,
                    'discount_type' => $r->discount_type instanceof \App\Enums\DiscountType
                        ? $r->discount_type->value
                        : $r->discount_type,
                    'conditions_count' => $r->conditions->count(),
                    'conditions' => $r->conditions->map(fn($c) => [
                        'type' => $c->type,
                        'operator' => $c->operator,
                        'value' => $c->value,
                    ])->toArray(),
                    'should_show_promo' => $isEligibleForPromo,
                    'why_not_showing' => !$r->is_active ? 'Rule is not active'
                        : ($ruleType !== 'cart' && !$detectedMinCart ? 'Not a cart rule and no min detected'
                        : (!$detectedMinCart ? 'No min_cart_total detected'
                        : ($subtotal >= $detectedMinCart ? 'Subtotal already meets minimum' : 'Should show!'))),
                ];
            })->toArray(),
        ];

        // Test promotion messages
        try {
            $messages = $this->promotionMessageService->getPromotionMessages([], $subtotal, []);
            $debug['promotion_messages'] = $messages;
            $debug['promotion_messages_count'] = count($messages);
            $debug['error'] = null;
        } catch (\Exception $e) {
            $debug['promotion_messages'] = [];
            $debug['promotion_messages_count'] = 0;
            $debug['error'] = $e->getMessage();
            $debug['trace'] = $e->getTraceAsString();
        }

        // Add Laravel log location hint
        $debug['check_logs'] = 'Check storage/logs/laravel.log for [PromotionMessageService] entries';

        return response()->json([
            'success' => true,
            'data' => $debug,
        ]);
    }

    /**
     * Debug endpoint to test BOGO rules specifically.
     *
     * GET /api/website/cart/debug-bogo?qty=3&product_id=1&price=100
     */
    public function debugBogo(Request $request): JsonResponse
    {
        $qty = (int) $request->input('qty', 3);
        $productId = (int) $request->input('product_id', 1);
        $price = (float) $request->input('price', 100);

        // Get all BOGO rules
        $bogoRules = \App\Models\DiscountRule::where('is_active', true)
            ->whereIn('rule_type', ['bogo', 'bxgx'])
            ->with(['filters', 'ranges', 'conditions'])
            ->get();

        $debug = [
            'input' => [
                'qty' => $qty,
                'product_id' => $productId,
                'price' => $price,
            ],
            'bogo_rules_found' => $bogoRules->count(),
            'rules' => $bogoRules->map(function ($rule) {
                $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
                    ? $rule->rule_type->value
                    : $rule->rule_type;

                return [
                    'id' => $rule->id,
                    'name' => $rule->name,
                    'rule_type' => $ruleType,
                    'is_active' => $rule->is_active,
                    'buy_qty' => $rule->buy_qty,
                    'get_qty' => $rule->get_qty,
                    'min_required_qty' => ($rule->buy_qty ?? 0) + ($rule->get_qty ?? 0),
                    'is_recursive' => $rule->is_recursive,
                    'discount_type' => $rule->discount_type instanceof \App\Enums\DiscountType
                        ? $rule->discount_type->value
                        : $rule->discount_type,
                    'discount_value' => $rule->discount_value,
                    'selection_strategy' => $rule->selection_strategy,
                    'filters' => $rule->filters->map(fn($f) => [
                        'type' => $f->filter_type,
                        'target' => $f->target,
                        'values' => $f->filter_values,
                        'is_exclude' => $f->is_exclude,
                    ])->toArray(),
                    'ranges' => $rule->ranges->map(fn($r) => [
                        'min_qty' => $r->min_qty,
                        'max_qty' => $r->max_qty,
                        'free_qty' => $r->free_qty,
                        'discount_type' => $r->discount_type,
                        'discount_value' => $r->discount_value,
                    ])->toArray(),
                    'conditions' => $rule->conditions->map(fn($c) => [
                        'type' => $c->type,
                        'operator' => $c->operator,
                        'value' => $c->value,
                    ])->toArray(),
                    'issue_check' => $this->checkBogoIssues($rule),
                ];
            })->toArray(),
        ];

        // Create test cart items
        $cartItems = [[
            'variant_id' => $productId,
            'variant_sku' => 'TEST-SKU-' . $productId,
            'price' => $price,
            'qty' => $qty,
            'product_id' => $productId,
            'category_ids' => [],
            'line_id' => 'test-line-1',
        ]];

        $context = [
            'user_id' => null,
            'country' => 'AE',
            'timezone' => 'Asia/Dubai',
        ];

        // Calculate discounts
        $result = $this->offerEngine->calculate($cartItems, $context);

        $debug['calculation_result'] = [
            'total_discount' => $result->getTotalDiscount(),
            'applied_rules' => $result->applied_rules,
            'free_items' => $result->free_items,
            'messages' => $result->messages,
        ];

        $debug['check_logs'] = 'Check storage/logs/laravel.log for [BogoCalculator] entries';

        return response()->json([
            'success' => true,
            'data' => $debug,
        ]);
    }

    /**
     * Check for common BOGO rule configuration issues.
     */
    private function checkBogoIssues(\App\Models\DiscountRule $rule): array
    {
        $issues = [];

        if (!$rule->buy_qty || $rule->buy_qty <= 0) {
            $issues[] = 'buy_qty is not set or is 0 - BOGO requires buy_qty > 0';
        }

        if (!$rule->get_qty || $rule->get_qty <= 0) {
            $issues[] = 'get_qty is not set or is 0 - BOGO requires get_qty > 0';
        }

        // Check filters
        $buyFilters = $rule->filters->filter(fn($f) => in_array($f->target, ['buy', 'both']));
        $getFilters = $rule->filters->filter(fn($f) => in_array($f->target, ['get', 'both']));

        if ($rule->filters->isNotEmpty()) {
            if ($buyFilters->isEmpty()) {
                $issues[] = 'Has filters but no buy filters (target=buy or both) - no items will qualify for buy';
            }
            if ($getFilters->isEmpty()) {
                $issues[] = 'Has filters but no get filters (target=get or both) - no items will qualify for get (free)';
            }
        }

        if (empty($issues)) {
            $issues[] = 'No issues detected - rule appears properly configured';
        }

        return $issues;
    }

    /**
     * Get discount bars for a product.
     * Used on product detail page to show applicable discounts.
     *
     * GET /api/website/product/{productId}/discount-bars
     */
    public function getProductDiscountBars(int $productId): JsonResponse
    {
        $product = Product::with(['categories', 'tags'])->find($productId);

        if (!$product) {
            return response()->json([
                'success' => true,
                'data' => [],
            ]);
        }

        $discountBars = [];

        // Get all active rules with discount bar enabled
        $rules = DiscountRule::where('is_active', true)
            ->where('show_discount_bar', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->with(['filters', 'ranges'])
            ->orderBy('priority', 'desc')
            ->get();

        foreach ($rules as $rule) {
            // Check if product matches rule filters
            if ($this->productMatchesRule($product, $rule)) {
                $discountBars[] = [
                    'rule_id' => $rule->id,
                    'rule_type' => $rule->rule_type instanceof \BackedEnum ? $rule->rule_type->value : $rule->rule_type,
                    'title' => $rule->bar_title,
                    'title_ar' => $rule->bar_title_ar,
                    'content' => $this->parseBarContent($rule, $product, 'en'),
                    'content_ar' => $this->parseBarContent($rule, $product, 'ar'),
                    'background_color' => $rule->bar_background_color ?? '#ef0101',
                    'text_color' => $rule->bar_text_color ?? '#ffffff',
                    'position' => $rule->bar_position ?? 'below_price',
                    'style' => $rule->bar_style ?? 'badge',
                    'discount_info' => $this->getDiscountInfo($rule),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $discountBars,
        ]);
    }

    /**
     * Check if a product matches a discount rule's filters.
     */
    private function productMatchesRule(Product $product, DiscountRule $rule): bool
    {
        // If no filters, rule applies to all products
        if ($rule->filters->isEmpty()) {
            return true;
        }

        // Get include and exclude filters
        $includeFilters = $rule->filters->filter(fn($f) => !$f->is_exclude);
        $excludeFilters = $rule->filters->filter(fn($f) => $f->is_exclude);

        // If there are exclude filters and product matches any, exclude it
        foreach ($excludeFilters as $filter) {
            if ($this->filterMatches($product, $filter)) {
                return false; // Product is excluded
            }
        }

        // If there are no include filters, product is included (unless excluded above)
        if ($includeFilters->isEmpty()) {
            return true;
        }

        // Check if product matches any include filter
        foreach ($includeFilters as $filter) {
            if ($this->filterMatches($product, $filter)) {
                return true; // Product matches at least one include filter
            }
        }

        return false;
    }

    /**
     * Check if product matches a specific filter.
     */
    private function filterMatches(Product $product, $filter): bool
    {
        $values = $filter->filter_values ?? [];
        if (empty($values)) {
            return true; // Empty filter values = match all
        }

        switch ($filter->filter_type) {
            case 'product_id':
                return in_array($product->id, array_map('intval', $values));

            case 'category':
                $productCategories = $product->categories->pluck('id')->toArray();
                return !empty(array_intersect($productCategories, array_map('intval', $values)));

            case 'tag':
                $productTags = $product->tags ? $product->tags->pluck('id')->toArray() : [];
                return !empty(array_intersect($productTags, array_map('intval', $values)));

            case 'variant_sku':
                // Check if any variant SKU matches
                $variants = $product->variants ?? [];
                foreach ($variants as $variant) {
                    if (in_array(strtolower($variant->sku ?? ''), array_map('strtolower', $values))) {
                        return true;
                    }
                }
                return false;

            default:
                return true;
        }
    }

    /**
     * Parse discount bar content with shortcodes.
     */
    private function parseBarContent(DiscountRule $rule, Product $product, string $lang = 'en'): string
    {
        $content = $lang === 'ar'
            ? ($rule->bar_content_ar ?? $rule->bar_content)
            : $rule->bar_content;

        if (empty($content)) {
            // Generate default content based on rule type
            $content = $this->generateDefaultBarContent($rule, $lang);
        }

        $discountType = $rule->discount_type instanceof \BackedEnum ? $rule->discount_type->value : $rule->discount_type;

        // Replace shortcodes
        $replacements = [
            '{{title}}' => $rule->name ?? '',
            '{{discount_value}}' => $rule->discount_value ?? 0,
            '{{discount_type}}' => $discountType === 'percentage' ? '%' : ' AED',
            '{{min_qty}}' => $rule->min_qty ?? $rule->buy_qty ?? 1,
            '{{buy_qty}}' => $rule->buy_qty ?? 1,
            '{{get_qty}}' => $rule->get_qty ?? 1,
            '{{free_qty}}' => $rule->get_qty ?? 1,
            '{{min_cart_total}}' => $rule->min_cart_total ?? 0,
            '{{product_name}}' => $product->name ?? '',
            '{{product_price}}' => $product->price ?? 0,
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $content ?? '');
    }

    /**
     * Generate default bar content based on rule type.
     */
    private function generateDefaultBarContent(DiscountRule $rule, string $lang = 'en'): string
    {
        $ruleType = $rule->rule_type instanceof \BackedEnum ? $rule->rule_type->value : $rule->rule_type;
        $discountType = $rule->discount_type instanceof \BackedEnum ? $rule->discount_type->value : $rule->discount_type;
        $discountSuffix = $discountType === 'percentage' ? '%' : ' AED';

        // Handle bulk tiers
        if ($ruleType === 'bulk' && $rule->ranges && $rule->ranges->isNotEmpty()) {
            return $this->generateBulkTiersContent($rule, $lang);
        }

        if ($lang === 'ar') {
            return match($ruleType) {
                'product' => "خصم {$rule->discount_value}{$discountSuffix}",
                'bulk' => "اشترِ " . ($rule->min_qty ?? 2) . "+ واحصل على خصم {$rule->discount_value}{$discountSuffix}",
                'bogo' => "اشترِ {$rule->buy_qty} واحصل على {$rule->get_qty} مجاناً",
                'bxgx' => "اشترِ {$rule->buy_qty} واحصل على {$rule->get_qty} مجاناً",
                'cart' => "وفر {$rule->discount_value}{$discountSuffix} على الطلبات فوق {$rule->min_cart_total} درهم",
                default => "عرض خاص!"
            };
        }

        return match($ruleType) {
            'product' => "{$rule->discount_value}{$discountSuffix} OFF",
            'bulk' => "Buy " . ($rule->min_qty ?? 2) . "+ Get {$rule->discount_value}{$discountSuffix} OFF",
            'bogo' => "Buy {$rule->buy_qty} Get {$rule->get_qty} FREE",
            'bxgx' => "Buy {$rule->buy_qty} Get {$rule->get_qty} FREE",
            'cart' => "Save {$rule->discount_value}{$discountSuffix} on orders over {$rule->min_cart_total} AED",
            default => "Special Offer!"
        };
    }

    /**
     * Generate bulk tiers content for display.
     */
    private function generateBulkTiersContent(DiscountRule $rule, string $lang = 'en'): string
    {
        $lines = [];
        $ranges = $rule->ranges->sortBy('min_qty');

        foreach ($ranges as $range) {
            $discountType = $range->discount_type ?? ($rule->discount_type instanceof \BackedEnum ? $rule->discount_type->value : $rule->discount_type);
            $suffix = $discountType === 'percentage' ? '%' : ' AED';
            $qty = $range->min_qty;
            $discount = $range->discount_value;

            if ($lang === 'ar') {
                $qtyText = $range->max_qty ? "{$qty}-{$range->max_qty}" : "{$qty}+";
                $lines[] = "{$qtyText} قطعة → خصم {$discount}{$suffix}";
            } else {
                $qtyText = $range->max_qty ? "{$qty}-{$range->max_qty} items" : "{$qty}+ items";
                $lines[] = "{$qtyText} → {$discount}{$suffix} OFF";
            }
        }

        return implode("\n", $lines);
    }

    /**
     * Get discount info for a rule.
     */
    private function getDiscountInfo(DiscountRule $rule): array
    {
        $ruleType = $rule->rule_type instanceof \BackedEnum ? $rule->rule_type->value : $rule->rule_type;
        $discountType = $rule->discount_type instanceof \BackedEnum ? $rule->discount_type->value : $rule->discount_type;

        return [
            'type' => $ruleType,
            'discount_type' => $discountType,
            'discount_value' => $rule->discount_value,
            'min_qty' => $rule->min_qty,
            'buy_qty' => $rule->buy_qty,
            'get_qty' => $rule->get_qty,
            'min_cart_total' => $rule->min_cart_total,
            'bulk_tiers' => $rule->ranges ? $rule->ranges->map(fn($r) => [
                'min_qty' => $r->min_qty,
                'max_qty' => $r->max_qty,
                'discount_type' => $r->discount_type,
                'discount_value' => $r->discount_value,
            ])->toArray() : [],
        ];
    }
}
