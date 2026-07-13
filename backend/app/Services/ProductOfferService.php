<?php

namespace App\Services;

use App\Models\DiscountRule;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PromoGroup;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ProductOfferService
{
    private const CACHE_KEY = 'products_with_active_offers';
    private const ACTIVE_OFFERS_CACHE_KEY = 'active_offers_list';
    private const SALE_PRODUCTS_CACHE_KEY = 'sale_product_ids';
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Get all product IDs that have active (non-promo-code) discount rules.
     */
    public function getProductIdsWithOffers(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return $this->resolveProductIds();
        });
    }

    /**
     * Clear key product-offer caches.
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget(self::ACTIVE_OFFERS_CACHE_KEY);
        Cache::forget(self::SALE_PRODUCTS_CACHE_KEY);
    }

    /**
     * Resolve which product IDs are targeted by active discount rules.
     */
    private function resolveProductIds(): array
    {
        $now = now();

        $rules = DiscountRule::with('filters')
            ->where('is_active', true)
            ->where('requires_promo_code', false)
            ->where(function ($q) use ($now) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
            })
            ->get();

        if ($rules->isEmpty()) {
            return [];
        }

        $productIds = collect();
        foreach ($rules as $rule) {
            $productIds = $productIds->merge($this->resolveRuleProductIds($rule));
        }

        return $productIds->unique()->values()->toArray();
    }

    /**
     * Resolve product IDs from a single filter.
     */
    private function resolveFilterProductIds($filter, &$allActiveProductIds): array
    {
        $type = $filter->filter_type;
        $values = $filter->filter_values ?? [];
        if (!is_array($values)) {
            $values = array_filter(array_map('trim', explode(',', (string) $values)));
        }

        return match ($type) {
            'all' => $this->getAllActiveProductIds($allActiveProductIds),
            'product_id', 'product' => array_map('intval', $values),
            'category' => DB::table('category_product')
                ->whereIn('category_id', array_map('intval', $values))
                ->pluck('product_id')
                ->toArray(),
            'brand' => Product::whereIn('brand_id', array_map('intval', $values))
                ->pluck('id')
                ->toArray(),
            'variant_sku', 'sku' => ProductVariant::whereIn('sku', $values)
                ->where('is_active', true)
                ->pluck('product_id')
                ->toArray(),
            'tag' => DB::table('product_tag')
                ->whereIn('tag_id', array_map('intval', $values))
                ->pluck('product_id')
                ->toArray(),
            'variant_id' => ProductVariant::whereIn('id', array_map('intval', $values))
                ->where('is_active', true)
                ->pluck('product_id')
                ->toArray(),
            'sku_category' => $this->resolveProductIdsForSkuAndCategory($values, $filter->secondary_values ?? []),
            'sku_tag' => $this->resolveProductIdsForSkuAndTag($values, $filter->secondary_values ?? []),
            'promo_group' => DB::table('promo_group_sku')
                ->whereIn('promo_group_id', array_map('intval', $filter->promo_group_ids ?? $values))
                ->join('product_variants', 'promo_group_sku.product_variant_id', '=', 'product_variants.id')
                ->where('product_variants.is_active', true)
                ->pluck('product_variants.product_id')
                ->unique()
                ->toArray(),
            'attribute' => $this->resolveProductIdsForAttributeFilter($values),
            default => [],
        };
    }

    /**
     * Get product IDs for a specific discount rule.
     */
    public function getProductIdsForOffer(int $ruleId): array
    {
        return Cache::remember("offer_product_ids_{$ruleId}", self::CACHE_TTL, function () use ($ruleId) {
            $rule = DiscountRule::with('filters')->find($ruleId);

            if (!$rule || !$this->isRuleActiveNow($rule) || (bool) $rule->requires_promo_code) {
                return [];
            }

            return $this->resolveRuleProductIds($rule);
        });
    }

    /**
     * Resolve product IDs from one or more promo groups.
     */
    public function getProductIdsForPromoGroups(array $promoGroupIds): array
    {
        $ids = array_values(array_unique(array_map('intval', array_filter($promoGroupIds, fn($id) => is_numeric($id)))));

        if (empty($ids)) {
            return [];
        }

        $cacheKey = 'promo_group_product_ids_' . md5(json_encode($ids));

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($ids) {
            return DB::table('promo_group_sku')
                ->whereIn('promo_group_id', $ids)
                ->join('product_variants', 'promo_group_sku.product_variant_id', '=', 'product_variants.id')
                ->where('product_variants.is_active', true)
                ->pluck('product_variants.product_id')
                ->unique()
                ->values()
                ->toArray();
        });
    }

    /**
     * Resolve offer scope using offer_key.
     * Tries discount rule internal_code first, then promo group slug/name.
     */
    public function getProductIdsForOfferKey(string $offerKey): array
    {
        $offerKey = trim($offerKey);

        if ($offerKey === '') {
            return [];
        }

        $offerKeyLower = mb_strtolower($offerKey, 'UTF-8');
        if (in_array($offerKeyLower, ['sale', 'on_sale', 'sale-items', 'sale_items'], true)) {
            return $this->getSaleProductIds();
        }

        if (is_numeric($offerKey)) {
            return $this->getProductIdsForOffer((int) $offerKey);
        }

        $cacheKey = 'offer_key_product_ids_' . md5($offerKeyLower);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($offerKey) {
            $now = now();

            $rule = DiscountRule::with('filters')
                ->where('is_active', true)
                ->where('requires_promo_code', false)
                ->where(function ($q) use ($now) {
                    $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
                })
                ->where(function ($q) use ($now) {
                    $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
                })
                ->where(function ($q) use ($offerKey) {
                    $q->where('internal_code', $offerKey)
                        ->orWhere('name', $offerKey)
                        ->orWhere('name_ar', $offerKey);
                })
                ->first();

            if ($rule) {
                return $this->resolveRuleProductIds($rule);
            }

            $promoGroupIds = PromoGroup::query()
                ->active()
                ->where(function ($q) use ($offerKey) {
                    $q->where('slug', $offerKey)
                        ->orWhere('name', $offerKey)
                        ->orWhere('name_ar', $offerKey);
                })
                ->pluck('id')
                ->values()
                ->toArray();

            return $this->getProductIdsForPromoGroups($promoGroupIds);
        });
    }

    /**
     * Get active discount offers for the shop page filter.
     */
    public function getActiveOffers(): array
    {
        return Cache::remember(self::ACTIVE_OFFERS_CACHE_KEY, self::CACHE_TTL, function () {
            $now = now();

            $rules = DiscountRule::with(['filters', 'ranges'])
                ->where('is_active', true)
                ->where('requires_promo_code', false)
                ->where(function ($q) use ($now) {
                    $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
                })
                ->where(function ($q) use ($now) {
                    $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
                })
                ->orderBy('priority', 'desc')
                ->get();

            $offers = $rules->map(function ($rule) {
                $productIds = $this->resolveRuleProductIds($rule);
                $promoGroupIds = $this->extractPromoGroupIdsFromRule($rule);
                $ruleType = $rule->rule_type instanceof \BackedEnum
                    ? $rule->rule_type->value
                    : (string) $rule->rule_type;

                return [
                    'id' => $rule->id,
                    'rule_type' => $ruleType,
                    'offer_key' => $rule->internal_code ?: (string) $rule->id,
                    'promo_group_ids' => $promoGroupIds,
                    'name' => $rule->name,
                    'name_ar' => $rule->name_ar ?? $rule->description_ar ?? $rule->name,
                    'discount_type' => $rule->discount_type,
                    'discount_value' => $rule->discount_value,
                    'bundle_qty' => $rule->bundle_qty,
                    'offer_message' => $rule->offer_message,
                    'offer_message_ar' => $rule->offer_message_ar ?? $rule->offer_message,
                    'product_count' => count($productIds),
                    'ranges' => $rule->ranges->map(fn($r) => [
                        'min_qty' => $r->min_qty,
                        'max_qty' => $r->max_qty,
                        'discount_type' => $r->discount_type,
                        'discount_value' => $r->discount_value,
                    ])->values()->toArray(),
                ];
            })->values();

            $saleProductCount = count($this->getSaleProductIds());
            if ($saleProductCount > 0) {
                $offers->push([
                    'id' => 'sale-items',
                    'offer_key' => 'on_sale',
                    'promo_group_ids' => [],
                    'name' => 'Sale Items',
                    'name_ar' => 'منتجات التخفيض',
                    'discount_type' => 'sale',
                    'discount_value' => null,
                    'bundle_qty' => null,
                    'offer_message' => null,
                    'offer_message_ar' => null,
                    'product_count' => $saleProductCount,
                    'ranges' => [],
                    'is_sale_filter' => true,
                ]);
            }

            return $offers->toArray();
        });
    }

    /**
     * Promo groups linked via promo_group filter.
     */
    private function extractPromoGroupIdsFromRule(DiscountRule $rule): array
    {
        $promoGroupIds = [];

        foreach ($rule->filters as $filter) {
            if ($filter->filter_type === 'promo_group') {
                $ids = $filter->promo_group_ids ?? $filter->filter_values ?? [];
                $promoGroupIds = array_merge($promoGroupIds, array_map('intval', $ids));
            }
        }

        return array_values(array_unique(array_filter($promoGroupIds)));
    }

    /**
     * Resolve product IDs targeted by a specific active rule.
     */
    private function resolveRuleProductIds(DiscountRule $rule): array
    {
        $allActiveProductIds = null;
        $includeFilters = $rule->filters->where('is_exclude', false);
        $excludeFilters = $rule->filters->where('is_exclude', true);

        if ($includeFilters->isEmpty()) {
            $ruleType = $rule->rule_type instanceof \BackedEnum
                ? $rule->rule_type->value
                : (string) $rule->rule_type;

            // Rules without item-scoped filters should not become offer filters for the full catalog.
            if (in_array($ruleType, ['cart', 'shipping'], true)) {
                return [];
            }

            $ruleIncludeIds = collect($this->getAllActiveProductIds($allActiveProductIds));
        } else {
            $ruleIncludeIds = collect();
            foreach ($includeFilters as $filter) {
                $ruleIncludeIds = $ruleIncludeIds->merge(
                    $this->resolveFilterProductIds($filter, $allActiveProductIds)
                );
            }
        }

        $ruleExcludeIds = collect();
        foreach ($excludeFilters as $filter) {
            $ruleExcludeIds = $ruleExcludeIds->merge(
                $this->resolveFilterProductIds($filter, $allActiveProductIds)
            );
        }

        $ruleProductIds = $ruleExcludeIds->isNotEmpty()
            ? $ruleIncludeIds->diff($ruleExcludeIds)
            : $ruleIncludeIds;

        $activeIds = collect($this->getAllActiveProductIds($allActiveProductIds));

        return $ruleProductIds
            ->map(fn($id) => (int) $id)
            ->filter(fn($id) => $id > 0)
            ->intersect($activeIds)
            ->unique()
            ->values()
            ->toArray();
    }

    /**
     * Products that have a real discounted sale price on the product itself
     * or on at least one active variant.
     */
    public function getSaleProductIds(): array
    {
        return Cache::remember(self::SALE_PRODUCTS_CACHE_KEY, self::CACHE_TTL, function () {
            return Product::query()
                ->where('is_active', true)
                ->where(function ($q) {
                    $q->where(function ($salePrice) {
                        $salePrice->whereNotNull('sale_price')
                            ->where('sale_price', '>', 0)
                            ->whereColumn('sale_price', '<', 'price');
                    })->orWhereHas('variants', function ($variantQuery) {
                        $variantQuery->where('is_active', true)
                            ->whereNotNull('sale_price')
                            ->where('sale_price', '>', 0)
                            ->whereColumn('sale_price', '<', 'price');
                    });
                })
                ->pluck('id')
                ->values()
                ->toArray();
        });
    }

    /**
     * Combined filter: variant SKU + category IDs.
     */
    private function resolveProductIdsForSkuAndCategory(array $skus, array $categoryValues): array
    {
        $normalizedSkus = array_values(array_filter(array_map(
            fn($sku) => trim((string) $sku),
            $skus
        ), fn($sku) => $sku !== ''));

        if (empty($normalizedSkus)) {
            return [];
        }

        $skuProductIds = ProductVariant::query()
            ->whereIn('sku', $normalizedSkus)
            ->where('is_active', true)
            ->pluck('product_id')
            ->unique()
            ->values();

        if ($skuProductIds->isEmpty()) {
            return [];
        }

        $categoryIds = array_values(array_unique(array_map(
            'intval',
            array_filter((array) $categoryValues, fn($id) => is_numeric($id))
        )));

        if (empty($categoryIds)) {
            return $skuProductIds->toArray();
        }

        return DB::table('category_product')
            ->whereIn('category_id', $categoryIds)
            ->whereIn('product_id', $skuProductIds->all())
            ->pluck('product_id')
            ->unique()
            ->values()
            ->toArray();
    }

    /**
     * Combined filter: variant SKU + tag IDs.
     */
    private function resolveProductIdsForSkuAndTag(array $skus, array $tagValues): array
    {
        $normalizedSkus = array_values(array_filter(array_map(
            fn($sku) => trim((string) $sku),
            $skus
        ), fn($sku) => $sku !== ''));

        if (empty($normalizedSkus)) {
            return [];
        }

        $skuProductIds = ProductVariant::query()
            ->whereIn('sku', $normalizedSkus)
            ->where('is_active', true)
            ->pluck('product_id')
            ->unique()
            ->values();

        if ($skuProductIds->isEmpty()) {
            return [];
        }

        $tagIds = array_values(array_unique(array_map(
            'intval',
            array_filter((array) $tagValues, fn($id) => is_numeric($id))
        )));

        if (empty($tagIds)) {
            return $skuProductIds->toArray();
        }

        return DB::table('product_tag')
            ->whereIn('tag_id', $tagIds)
            ->whereIn('product_id', $skuProductIds->all())
            ->pluck('product_id')
            ->unique()
            ->values()
            ->toArray();
    }

    /**
     * Attribute filter support:
     * - numeric values are treated as attribute_value IDs
     * - string values can be "attribute_slug:value"
     */
    private function resolveProductIdsForAttributeFilter(array $values): array
    {
        $attributeValueIds = array_values(array_unique(array_map(
            'intval',
            array_filter($values, fn($value) => is_numeric($value))
        )));

        if (!empty($attributeValueIds)) {
            return ProductVariant::query()
                ->join('attribute_value_product_variant as avpv', 'product_variants.id', '=', 'avpv.product_variant_id')
                ->where('product_variants.is_active', true)
                ->whereIn('avpv.attribute_value_id', $attributeValueIds)
                ->pluck('product_variants.product_id')
                ->unique()
                ->values()
                ->toArray();
        }

        $pairs = [];
        foreach ($values as $value) {
            $raw = trim((string) $value);
            if ($raw === '' || !str_contains($raw, ':')) {
                continue;
            }

            [$attributeName, $attributeValue] = explode(':', $raw, 2);
            $attributeName = mb_strtolower(trim($attributeName), 'UTF-8');
            $attributeValue = mb_strtolower(trim($attributeValue), 'UTF-8');

            if ($attributeName === '' || $attributeValue === '') {
                continue;
            }

            $pairs[] = [$attributeName, $attributeValue];
        }

        if (empty($pairs)) {
            return [];
        }

        $productIds = collect();
        foreach ($pairs as [$attributeName, $attributeValue]) {
            $ids = ProductVariant::query()
                ->join('attribute_value_product_variant as avpv', 'product_variants.id', '=', 'avpv.product_variant_id')
                ->join('attribute_values as av', 'avpv.attribute_value_id', '=', 'av.id')
                ->join('attributes as a', 'av.attribute_id', '=', 'a.id')
                ->where('product_variants.is_active', true)
                ->where(function ($q) use ($attributeName) {
                    $q->whereRaw('LOWER(a.slug) = ?', [$attributeName])
                        ->orWhereRaw('LOWER(a.name) = ?', [$attributeName]);
                })
                ->whereRaw('LOWER(av.value) = ?', [$attributeValue])
                ->pluck('product_variants.product_id');

            $productIds = $productIds->merge($ids);
        }

        return $productIds->unique()->values()->toArray();
    }

    /**
     * Rule activity check including schedule window.
     */
    private function isRuleActiveNow(DiscountRule $rule): bool
    {
        if (!$rule->is_active) {
            return false;
        }

        $now = Carbon::now();

        if ($rule->starts_at && $rule->starts_at->gt($now)) {
            return false;
        }

        if ($rule->ends_at && $rule->ends_at->lt($now)) {
            return false;
        }

        return true;
    }

    /**
     * Get all active product IDs (lazy-loaded).
     */
    private function getAllActiveProductIds(&$allActiveProductIds): array
    {
        if ($allActiveProductIds === null) {
            $allActiveProductIds = Product::where('is_active', true)->pluck('id')->toArray();
        }

        return $allActiveProductIds;
    }
}
