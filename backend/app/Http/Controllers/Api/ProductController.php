<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShopLayoutSetting;
use App\Services\ProductOfferService;
use App\Services\ProductPriorityService;
use App\Services\PriceResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;

class ProductController extends BaseController
{
    /**
     * Quick search endpoint for header search bar - optimized for speed
     */
    public function quickSearch(Request $request)
    {
        $search = $request->input('search') ?? $request->input('q');

        if (!$search || strlen($search) < 2) {
            return $this->success([]);
        }

        // Optimized query with minimal data for quick search
        $products = Product::select(['id', 'name', 'name_ar', 'slug', 'sku', 'price', 'sale_price'])
            ->with([
                'images' => function ($q) {
                    $q->select(['id', 'product_id', 'image', 'is_primary'])
                      ->orderByDesc('is_primary')
                      ->orderBy('id')
                      ->limit(1);
                },
                'categories' => fn($q) => $this->storefrontVisibleCategories($q)
                    ->select(['categories.id', 'categories.name', 'categories.name_ar', 'categories.slug'])
            ])
            ->active()
            ->where(function ($q) use ($search) {
                // Exact SKU match (highest priority)
                $q->where('sku', '=', $search)
                    // Prefix matches
                    ->orWhere('name', 'like', "{$search}%")
                    ->orWhere('name', 'like', "% {$search}%")
                    ->orWhere('name_ar', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "{$search}%")
                    // Contains matches
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    // Also search variant SKUs
                    ->orWhereHas('variants', function ($vq) use ($search) {
                        $vq->where('sku', '=', $search)
                            ->orWhere('sku', 'like', "{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
            })
            ->orderByRaw("CASE
                WHEN sku = ? THEN 1
                WHEN sku LIKE ? THEN 2
                WHEN name LIKE ? THEN 3
                ELSE 4
            END", [$search, "{$search}%", "{$search}%"])
            ->limit(6)
            ->get();

        // Transform for frontend
        $results = $products->map(function ($product) {
            $image = $product->images->first();
            return [
                'id' => $product->id,
                'title' => $product->name,
                'title_ar' => $product->name_ar,
                'slug' => $product->slug,
                'price' => $product->sale_price ?? $product->price,
                'original_url' => $image?->image_url,
                'categories' => $product->categories->map(fn($c) => [
                    'name' => $c->name,
                    'name_ar' => $c->name_ar,
                    'slug' => $c->slug,
                ]),
            ];
        });

        return $this->success($results);
    }

    public function index(Request $request)
    {
        // Resolve shop layout settings for the current scope
        $layoutScope = 'shop';
        $layoutScopeId = null;
        if ($request->filled('category_id') || $request->filled('category')) {
            $layoutScope = 'category';
            $layoutScopeId = (int) ($request->input('category_id') ?: $request->input('category'));
        } elseif ($request->filled('brand')) {
            $layoutScope = 'brand';
            $layoutScopeId = (int) $request->input('brand');
        }
        $layoutSettings = ShopLayoutSetting::resolveForWebsite($layoutScope, $layoutScopeId);

        $settingsPerPage = $layoutSettings['grid']['products_per_page'] ?? 12;
        $perPage = (int) $request->input('paginate', $request->input('per_page', $settingsPerPage));
        $perPage = $perPage > 0 ? $perPage : 12;

        $userSort = $request->input('sortBy', $request->input('sort'));
        $sortBy = $userSort ?: ($layoutSettings['sorting']['default_sort'] ?? 'newest');
        $hasIds = !empty($this->normalizeArrayParam($request->input('ids')));
        $selectedColorIds = $this->extractColorIds($request);

        $cacheVersion = Cache::get('products_list_version', 1);
        $priorityEnabled = !empty($layoutSettings['priority']['enabled']) && !$userSort;
        $cacheKey = 'products_v7_' . $cacheVersion . '_' . md5(json_encode(array_merge(
            $request->only([
                'category', 'category_id', 'category_ids',
                'color', 'colors', 'size', 'sizes',
                'brand', 'min_price', 'max_price', 'price_bucket', 'price',
                'sortBy', 'sort', 'page', 'paginate', 'per_page',
                'search', 'q', 'tag', 'featured', 'in_stock', 'ids',
                'on_sale', 'offer_id', 'offer_key', 'promo_group_id', 'promo_group_ids',
            ]),
            ['_resolved_sort' => $sortBy, '_priority' => $priorityEnabled ? $layoutSettings['priority']['type'] : null]
        )));

        $products = Cache::remember($cacheKey, 600, function () use ($request, $perPage, $sortBy, $hasIds, $selectedColorIds, $layoutSettings, $userSort) {
            if ($hasIds) {
                $query = Product::query()
                    ->with([
                        'images' => fn($q) => $q->select(['id', 'product_id', 'image', 'is_primary', 'sort_order'])
                            ->orderByDesc('is_primary')->orderBy('sort_order'),
                        'variants' => fn($q) => $q->where('is_active', true),
                        'variants.attributeValues',
                        'variants.attributeValues.attribute',
                        'categories' => fn($q) => $this->storefrontVisibleCategories($q)
                            ->select(['categories.id', 'categories.name', 'categories.slug']),
                    ])
                    ->where('products.is_active', true);
            } else {
                $query = Product::query()
                    ->select([
                        'products.id',
                        'products.name',
                        'products.name_ar',
                        'products.slug',
                        'products.sku',
                        'products.price',
                        'products.sale_price',
                        'products.min_price',
                        'products.max_price',
                        'products.min_sale_price',
                        'products.max_sale_price',
                        'products.has_variants',
                        'products.stock_status',
                        'products.total_sold',
                        'products.is_trending',
                        'products.is_featured',
                        'products.is_sale_enable',
                        'products.created_at',
                    ])
                    ->with([
                        'images' => fn($q) => $q->select(['id', 'product_id', 'image', 'is_primary', 'sort_order'])
                            ->orderByDesc('is_primary')->orderBy('sort_order')->limit(2),
                        'variants' => fn($q) => $q->select(['id', 'product_id', 'price', 'sale_price'])
                            ->where('is_active', true)->limit(1),
                    ])
                    ->where('products.is_active', true);
            }

            $this->applyProductFilters($query, $request);

            $ids = $this->normalizeArrayParam($request->input('ids'));
            if (!empty($ids)) {
                $query->whereIn('products.id', $ids);
            }

            if ($request->boolean('featured')) {
                $query->where('products.is_featured', true);
            }

            if ($request->boolean('in_stock')) {
                $query->where('products.stock_status', 'in_stock');
            }

            if (!empty($selectedColorIds)) {
                $this->applySelectedColorSortingPriority($query, $selectedColorIds);
            }

            // Use priority service when user hasn't explicitly sorted
            if (!$userSort && ($layoutSettings['priority']['enabled'] ?? false)) {
                app(ProductPriorityService::class)->applyPriority(
                    $query,
                    $layoutSettings['priority'],
                    $layoutSettings['sorting'] ?? []
                );
            } else {
                $this->applySorting($query, $sortBy);
            }

            return $query->paginate($perPage);
        });

        $offerIds = app(ProductOfferService::class)->getProductIdsWithOffers();

        $selectedColorImageMap = collect();
        if (!empty($selectedColorIds)) {
            $selectedColorImageMap = $this->resolveSelectedColorImagesForProducts(
                $products->getCollection()->pluck('id')->all(),
                $selectedColorIds
            );
        }

        $products->getCollection()->each(function ($product) use ($offerIds, $selectedColorImageMap) {
            $selectedColorImageUrl = $selectedColorImageMap->get($product->id);
            $hasVariants = (bool) ($product->has_variants ?? false);

            $regularPrice = $hasVariants
                ? (float) ($product->min_price ?? $product->price ?? 0)
                : (float) ($product->price ?? 0);

            $salePrice = $hasVariants
                ? ($product->min_sale_price !== null ? (float) $product->min_sale_price : null)
                : ($product->sale_price !== null ? (float) $product->sale_price : null);

            $hasSaleDiscount = $salePrice !== null
                && $salePrice > 0
                && $regularPrice > 0
                && $salePrice < $regularPrice;

            $product->default_image_url = $product->primary_image;
            $product->selected_color_image_url = $selectedColorImageUrl;
            $product->has_selected_color_image = !empty($selectedColorImageUrl);
            $product->has_offer = in_array($product->id, $offerIds, true);
            $product->price = $regularPrice;
            $product->sale_price = $hasSaleDiscount ? $salePrice : $regularPrice;
            $product->is_sale_enable = $hasSaleDiscount;
            $product->discount = $hasSaleDiscount
                ? (int) round((($regularPrice - $salePrice) / $regularPrice) * 100)
                : 0;
        });

        return $this->paginated($products);
    }

    public function activeOffers()
    {
        $offers = app(ProductOfferService::class)->getActiveOffers();
        return $this->success($offers);
    }

    public function facets(Request $request)
    {
        $cacheVersion = Cache::get('products_list_version', 1);
        $cacheKey = 'shop_facets_v2_' . $cacheVersion . '_' . md5(json_encode($request->only([
            'category', 'category_id', 'category_ids',
            'color', 'colors', 'size', 'sizes',
            'brand', 'min_price', 'max_price', 'price_bucket', 'price',
            'search', 'q', 'tag', 'on_sale',
            'offer_id', 'offer_key', 'promo_group_id', 'promo_group_ids',
        ])));

        $facets = Cache::remember($cacheKey, 300, function () use ($request) {
            $categoriesBaseQuery = Product::query()->where('products.is_active', true);
            $this->applyProductFilters($categoriesBaseQuery, $request, ['category']);

            $colorsBaseQuery = Product::query()->where('products.is_active', true);
            $this->applyProductFilters($colorsBaseQuery, $request, ['color']);

            $sizesBaseQuery = Product::query()->where('products.is_active', true);
            $this->applyProductFilters($sizesBaseQuery, $request, ['size']);

            $priceBaseQuery = Product::query()->where('products.is_active', true);
            $this->applyProductFilters($priceBaseQuery, $request, ['price']);

            $categories = (clone $categoriesBaseQuery)
                ->join('category_product as cp', 'products.id', '=', 'cp.product_id')
                ->join('categories', 'categories.id', '=', 'cp.category_id')
                ->where('categories.is_active', true)
                ->where(function ($q) {
                    $q->whereNull('categories.is_default')->orWhere('categories.is_default', false);
                })
                ->where(function ($q) {
                    $q->whereNull('categories.slug')->orWhere('categories.slug', '!=', 'uncategorized');
                })
                ->selectRaw('categories.id, categories.name, categories.name_ar, categories.slug, categories.sort_order, COUNT(DISTINCT products.id) as count')
                ->groupBy('categories.id', 'categories.name', 'categories.name_ar', 'categories.slug', 'categories.sort_order')
                ->orderBy('categories.sort_order')
                ->orderBy('categories.name')
                ->get()
                ->map(fn($category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'name_ar' => $category->name_ar,
                    'slug' => $category->slug,
                    'count' => (int) $category->count,
                ])
                ->filter(fn($category) => $category['count'] > 0)
                ->values();

            $colors = (clone $colorsBaseQuery)
                ->join('product_variants as pv', function ($join) {
                    $join->on('pv.product_id', '=', 'products.id')->where('pv.is_active', true);
                })
                ->join('attribute_value_product_variant as avpv', 'pv.id', '=', 'avpv.product_variant_id')
                ->join('attribute_values as av', 'av.id', '=', 'avpv.attribute_value_id')
                ->join('attributes as a', function ($join) {
                    $join->on('a.id', '=', 'av.attribute_id')->where('a.slug', '=', 'color');
                })
                ->selectRaw('av.id, av.value, av.color_code, av.sort_order, COUNT(DISTINCT products.id) as count')
                ->groupBy('av.id', 'av.value', 'av.color_code', 'av.sort_order')
                ->orderBy('av.sort_order')
                ->orderBy('av.value')
                ->get()
                ->map(function ($color) {
                    return [
                        'id' => $color->id,
                        'value' => $color->value,
                        'color' => $color->value,
                        'slug' => \Illuminate\Support\Str::slug($color->value),
                        'filter_value' => (string) $color->id,
                        'color_code' => $color->color_code ?: $this->generateColorFromName($color->value),
                        'count' => (int) $color->count,
                    ];
                })
                ->filter(fn($color) => $color['count'] > 0)
                ->values();

            $sizes = (clone $sizesBaseQuery)
                ->join('product_variants as pv', function ($join) {
                    $join->on('pv.product_id', '=', 'products.id')->where('pv.is_active', true);
                })
                ->join('attribute_value_product_variant as avpv', 'pv.id', '=', 'avpv.product_variant_id')
                ->join('attribute_values as av', 'av.id', '=', 'avpv.attribute_value_id')
                ->join('attributes as a', function ($join) {
                    $join->on('a.id', '=', 'av.attribute_id')->where('a.slug', '=', 'size');
                })
                ->selectRaw('av.id, av.value, av.sort_order, COUNT(DISTINCT products.id) as count')
                ->groupBy('av.id', 'av.value', 'av.sort_order')
                ->orderBy('av.sort_order')
                ->orderBy('av.value')
                ->get()
                ->map(fn($size) => [
                    'id' => $size->id,
                    'value' => $size->value,
                    'slug' => \Illuminate\Support\Str::slug($size->value),
                    'count' => (int) $size->count,
                ])
                ->filter(fn($size) => $size['count'] > 0)
                ->values();

            $effectivePriceSql = $this->effectivePriceSql();
            $priceCounts = (clone $priceBaseQuery)
                ->selectRaw("
                    SUM(CASE WHEN {$effectivePriceSql} <= 99 THEN 1 ELSE 0 END) as le_99_count,
                    SUM(CASE WHEN {$effectivePriceSql} >= 100 AND {$effectivePriceSql} <= 149 THEN 1 ELSE 0 END) as b100_149_count,
                    SUM(CASE WHEN {$effectivePriceSql} >= 150 AND {$effectivePriceSql} <= 199 THEN 1 ELSE 0 END) as b150_199_count,
                    SUM(CASE WHEN {$effectivePriceSql} >= 200 THEN 1 ELSE 0 END) as b200_plus_count
                ")
                ->first();

            $priceBuckets = collect([
                [
                    'key' => 'le_99',
                    'label' => '≤ 99 AED',
                    'count' => (int) ($priceCounts->le_99_count ?? 0),
                ],
                [
                    'key' => '100_149',
                    'label' => '100 - 149 AED',
                    'count' => (int) ($priceCounts->b100_149_count ?? 0),
                ],
                [
                    'key' => '150_199',
                    'label' => '150 - 199 AED',
                    'count' => (int) ($priceCounts->b150_199_count ?? 0),
                ],
                [
                    'key' => '200_plus',
                    'label' => '200+ AED',
                    'count' => (int) ($priceCounts->b200_plus_count ?? 0),
                ],
            ])->filter(fn($bucket) => $bucket['count'] > 0)->values();

            return [
                'categories' => $categories,
                'colors' => $colors,
                'sizes' => $sizes,
                'price_buckets' => $priceBuckets,
            ];
        });

        return $this->success($facets);
    }

    public function show(Request $request, $idOrSlug)
    {
        $countryId = $request->input('country_id');
        $selectedVariantId = $request->input('variant_id');
        $cacheKey = "product_full_v3_{$idOrSlug}";

        // Single cache call for product + related products (10 minutes)
        $data = Cache::remember($cacheKey, 600, function () use ($idOrSlug) {
            // Optimized query with selective eager loading
            $product = Product::query()
                ->with([
                    'categories' => fn($q) => $this->storefrontVisibleCategories($q)
                        ->select(['categories.id', 'categories.name', 'categories.name_ar', 'categories.slug']),
                    'images' => fn($q) => $q->select(['id', 'product_id', 'image', 'is_primary', 'sort_order'])
                        ->orderByDesc('is_primary')->orderBy('sort_order'),
                    'variants' => fn($q) => $q->select(['id', 'product_id', 'sku', 'price', 'sale_price', 'stock_quantity', 'is_active', 'image'])
                        ->where('is_active', true),
                    'variants.attributeValues:id,attribute_id,value,color_code',
                    'variants.attributeValues.attribute:id,name,slug,style',
                    'tags:id,name,slug',
                    'brand:id,name,slug',
                ])
                ->where(function($q) use ($idOrSlug) {
                    if (is_numeric($idOrSlug)) {
                        $q->where('id', $idOrSlug)->orWhere('slug', $idOrSlug);
                    } else {
                        $q->where('slug', $idOrSlug);
                    }
                })
                ->where('is_active', true)
                ->firstOrFail();

            // Get related products in same cache
            $categoryIds = $product->categories->pluck('id');
            $relatedProducts = collect();

            if ($categoryIds->isNotEmpty()) {
                $effectivePriceSql = $this->effectivePriceSql();

                $relatedProducts = Product::query()
                    ->select(['id', 'name', 'name_ar', 'slug', 'price', 'sale_price', 'stock_status'])
                    ->with([
                        'images' => fn($q) => $q->select(['id', 'product_id', 'image', 'is_primary'])
                            ->orderByDesc('is_primary')->limit(1),
                        'variants' => fn($q) => $q->select(['id', 'product_id', 'price', 'sale_price', 'stock_quantity'])
                            ->where('is_active', true)->limit(3),
                    ])
                    ->whereHas('categories', fn($q) => $q->whereIn('categories.id', $categoryIds))
                    ->where('id', '!=', $product->id)
                    ->where('is_active', true)
                    ->orderByRaw("{$effectivePriceSql} DESC")
                    ->orderByDesc('products.created_at')
                    ->orderByDesc('products.id')
                    ->limit(8)
                    ->get();
            }

            return ['product' => $product, 'related' => $relatedProducts];
        });

        $product = $data['product'];
        $relatedProducts = $data['related'];

        $priceResolver = app(PriceResolver::class);
        $pricing = $priceResolver->resolve(
            $product,
            $product->relationLoaded('variants') ? $product->variants : null,
            $selectedVariantId ? (int) $selectedVariantId : null,
            $countryId ? (int) $countryId : null
        );

        $product->display_price = $pricing['display_price'];
        $product->display_sale_price = $pricing['display_sale_price'];
        $product->min_price = $pricing['min_price'];
        $product->max_price = $pricing['max_price'];
        $product->min_sale_price = $pricing['min_sale_price'];
        $product->max_sale_price = $pricing['max_sale_price'];
        $product->price_source = $pricing['price_source'];
        $product->has_variants = $pricing['has_variants'];

        // Backward compatibility for existing UI usage
        $product->price = $pricing['display_price'];
        $product->sale_price = $pricing['display_sale_price'];

        // Add related products to response
        $product->related_products = $relatedProducts;
        $product->cross_sell_products = collect();
        $product->upsell_products = collect();

        return $this->success($product);
    }

    public function variants(Request $request, $productId)
    {
        $cacheKey = "product_variants_{$productId}";

        $variants = Cache::remember($cacheKey, 300, function () use ($productId) {
            return ProductVariant::with(['attributeValues.attribute', 'images'])
                ->where('product_id', $productId)
                ->active()
                ->get();
        });

        return $this->success($variants);
    }

    public function featured(Request $request)
    {
        $limit = $request->input('limit', 8);
        $cacheKey = "products_featured_{$limit}";

        $products = Cache::remember($cacheKey, 300, function () use ($limit) {
            return Product::with([
                'categories' => fn($q) => $this->storefrontVisibleCategories($q),
                'images',
            ])
                ->active()
                ->featured()
                ->limit($limit)
                ->get();
        });

        return $this->success($products);
    }

    public function related(Request $request, $productId)
    {
        $limit = $request->input('limit', 8);
        $cacheKey = "product_related_v3_{$productId}_{$limit}";

        $related = Cache::remember($cacheKey, 300, function () use ($productId, $limit) {
            $product = Product::findOrFail($productId);
            $effectivePriceSql = $this->effectivePriceSql();
            $categoryIds = $product->categories()
                ->where(function ($q) {
                    $q->whereNull('categories.is_default')->orWhere('categories.is_default', false);
                })
                ->where(function ($q) {
                    $q->whereNull('categories.slug')->orWhere('categories.slug', '!=', 'uncategorized');
                })
                ->pluck('categories.id');

            return Product::with(['images'])
                ->active()
                ->where('id', '!=', $productId)
                ->whereHas('categories', function ($q) use ($categoryIds) {
                    $this->storefrontVisibleCategories($q);
                    $q->whereIn('categories.id', $categoryIds);
                })
                ->orderByRaw("{$effectivePriceSql} DESC")
                ->orderByDesc('products.created_at')
                ->orderByDesc('products.id')
                ->limit($limit)
                ->get();
        });

        return $this->success($related);
    }

    private function applyProductFilters($query, Request $request, array $skipFilters = []): void
    {
        if (!in_array('offer', $skipFilters, true)) {
            $this->applyOfferScope($query, $request);
        }

        if (!in_array('category', $skipFilters, true)) {
            $this->applyCategoryFilter(
                $query,
                $request->input('category')
                    ?? $request->input('category_id')
                    ?? $request->input('category_ids')
            );
        }

        if (!in_array('search', $skipFilters, true)) {
            $this->applyGlobalSearchFilter($query, $request->input('search') ?? $request->input('q'));
        }

        if (!in_array('color', $skipFilters, true)) {
            $this->applyColorFilter($query, $request->input('color') ?? $request->input('colors'));
        }

        if (!in_array('size', $skipFilters, true)) {
            $this->applySizeFilter($query, $request->input('size') ?? $request->input('sizes'));
        }

        if (!in_array('price', $skipFilters, true)) {
            $this->applyPriceFilter($query, $request);
        }

        if (!in_array('brand', $skipFilters, true)) {
            $this->applyBrandFilter($query, $request->input('brand'));
        }

        if (!in_array('tag', $skipFilters, true)) {
            $this->applyTagFilter($query, $request->input('tag'));
        }

        if (!in_array('on_sale', $skipFilters, true) && $request->boolean('on_sale')) {
            $this->applyOnSaleFilter($query);
        }
    }

    private function applyOfferScope($query, Request $request): void
    {
        $offerProductIds = $this->resolveOfferProductIds($request);

        // null means "offer mode not requested", empty array means "offer mode requested but nothing matches"
        if ($offerProductIds === null) {
            return;
        }

        if (empty($offerProductIds)) {
            $query->whereRaw('1 = 0');
            return;
        }

        $query->whereIn('products.id', $offerProductIds);
    }

    private function resolveOfferProductIds(Request $request): ?array
    {
        $offerService = app(ProductOfferService::class);

        $promoGroupIds = $this->normalizeIntegerArrayParam(
            $request->input('promo_group_id') ?? $request->input('promo_group_ids')
        );
        if (!empty($promoGroupIds)) {
            return $offerService->getProductIdsForPromoGroups($promoGroupIds);
        }

        $offerKey = trim((string) ($request->input('offer_key') ?? ''));
        if ($offerKey !== '') {
            return $offerService->getProductIdsForOfferKey($offerKey);
        }

        if ($request->filled('offer_id')) {
            return $offerService->getProductIdsForOffer((int) $request->input('offer_id'));
        }

        return null;
    }

    private function applyCategoryFilter($query, $category): void
    {
        $categories = $this->normalizeArrayParam($category);
        if (empty($categories)) {
            return;
        }

        $categoryIds = array_values(array_map('intval', array_filter($categories, 'is_numeric')));
        $categorySlugs = array_values(array_filter($categories, fn($value) => !is_numeric($value)));

        if (empty($categoryIds) && empty($categorySlugs)) {
            return;
        }

        $query->whereHas('categories', function ($categoryQuery) use ($categoryIds, $categorySlugs) {
            $this->storefrontVisibleCategories($categoryQuery);

            $categoryQuery->where(function ($inner) use ($categoryIds, $categorySlugs) {
                if (!empty($categoryIds)) {
                    $inner->whereIn('categories.id', $categoryIds);
                }

                if (!empty($categorySlugs)) {
                    if (!empty($categoryIds)) {
                        $inner->orWhereIn('categories.slug', $categorySlugs);
                    } else {
                        $inner->whereIn('categories.slug', $categorySlugs);
                    }
                }
            });
        });
    }

    private function applyGlobalSearchFilter($query, ?string $search): void
    {
        $search = trim((string) $search);
        if ($search === '' || mb_strlen($search, 'UTF-8') < 2) {
            return;
        }

        $query->where(function ($searchQuery) use ($search) {
            $searchQuery->where('products.name', 'like', "%{$search}%")
                ->orWhere('products.name_ar', 'like', "%{$search}%")
                ->orWhere('products.sku', 'like', "%{$search}%")
                ->orWhereHas('variants', function ($variantQuery) use ($search) {
                    $variantQuery->where('product_variants.is_active', true)
                        ->where('product_variants.sku', 'like', "%{$search}%");
                })
                ->orWhereHas('brand', function ($brandQuery) use ($search) {
                    $brandQuery->where('brands.name', 'like', "%{$search}%");
                })
                ->orWhereHas('categories', function ($categoryQuery) use ($search) {
                    $this->storefrontVisibleCategories($categoryQuery);
                    $categoryQuery->where(function ($nested) use ($search) {
                        $nested->where('categories.name', 'like', "%{$search}%")
                            ->orWhere('categories.name_ar', 'like', "%{$search}%")
                            ->orWhere('categories.slug', 'like', "%{$search}%");
                    });
                })
                ->orWhereHas('tags', function ($tagQuery) use ($search) {
                    $tagQuery->where('tags.name', 'like', "%{$search}%")
                        ->orWhere('tags.slug', 'like', "%{$search}%");
                });
        });
    }

    private function applyColorFilter($query, $colorFilter): void
    {
        $colorIds = $this->normalizeIntegerArrayParam($colorFilter);

        if (empty($colorIds)) {
            return;
        }

        $query->whereIn('products.id', function ($sub) use ($colorIds) {
            $sub->select('pv.product_id')
                ->from('product_variants as pv')
                ->join('attribute_value_product_variant as avpv', 'pv.id', '=', 'avpv.product_variant_id')
                ->whereIn('avpv.attribute_value_id', $colorIds)
                ->where('pv.is_active', true);
        });
    }

    private function applySizeFilter($query, $sizeFilter): void
    {
        $sizes = $this->normalizeArrayParam($sizeFilter);

        if (empty($sizes)) {
            return;
        }

        $query->whereIn('products.id', function ($sub) use ($sizes) {
            $sub->select('pv.product_id')
                ->from('product_variants as pv')
                ->join('attribute_value_product_variant as avpv', 'pv.id', '=', 'avpv.product_variant_id')
                ->join('attribute_values as av', 'avpv.attribute_value_id', '=', 'av.id')
                ->join('attributes as a', 'av.attribute_id', '=', 'a.id')
                ->where('a.slug', 'size')
                ->whereIn('av.value', $sizes)
                ->where('pv.is_active', true);
        });
    }

    private function applyPriceFilter($query, Request $request): void
    {
        $bucketRaw = $request->input('price_bucket') ?? $request->input('price');
        if (is_array($bucketRaw)) {
            $bucketRaw = Arr::first($bucketRaw);
        }
        $priceBucket = $this->normalizePriceBucket($bucketRaw);

        $effectivePriceSql = $this->effectivePriceSql();

        if ($priceBucket) {
            match ($priceBucket) {
                'le_99' => $query->whereRaw("{$effectivePriceSql} <= ?", [99]),
                '100_149' => $query->whereRaw("{$effectivePriceSql} >= ? AND {$effectivePriceSql} <= ?", [100, 149]),
                '150_199' => $query->whereRaw("{$effectivePriceSql} >= ? AND {$effectivePriceSql} <= ?", [150, 199]),
                '200_plus' => $query->whereRaw("{$effectivePriceSql} >= ?", [200]),
                default => null,
            };
            return;
        }

        if ($request->filled('min_price')) {
            $query->whereRaw("{$effectivePriceSql} >= ?", [(float) $request->input('min_price')]);
        }

        if ($request->filled('max_price')) {
            $query->whereRaw("{$effectivePriceSql} <= ?", [(float) $request->input('max_price')]);
        }
    }

    private function applyBrandFilter($query, $brandFilter): void
    {
        $brandIds = $this->normalizeIntegerArrayParam($brandFilter);

        if (empty($brandIds)) {
            return;
        }

        $query->whereIn('products.brand_id', $brandIds);
    }

    private function applyTagFilter($query, $tag): void
    {
        $tagValue = trim((string) $tag);
        if ($tagValue === '') {
            return;
        }

        $tagLower = mb_strtolower($tagValue, 'UTF-8');
        $query->whereHas('tags', function ($tagQuery) use ($tagValue, $tagLower) {
            $tagQuery->where('tags.slug', $tagValue)
                ->orWhere('tags.id', $tagValue)
                ->orWhereRaw('LOWER(tags.name) = ?', [$tagLower]);
        });
    }

    private function applyOnSaleFilter($query): void
    {
        $offerService = app(ProductOfferService::class);
        $offerProductIds = $offerService->getProductIdsWithOffers();
        $saleProductIds = $offerService->getSaleProductIds();
        $combinedIds = array_values(array_unique(array_merge($offerProductIds, $saleProductIds)));

        if (!empty($combinedIds)) {
            $query->whereIn('products.id', $combinedIds);
            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function applySelectedColorSortingPriority($query, array $selectedColorIds): void
    {
        if (empty($selectedColorIds)) {
            return;
        }

        $idsSql = implode(',', $selectedColorIds);

        $query->selectRaw("
            CASE WHEN EXISTS (
                SELECT 1
                FROM product_variants pv
                INNER JOIN attribute_value_product_variant avpv
                    ON pv.id = avpv.product_variant_id
                WHERE pv.product_id = products.id
                    AND pv.is_active = true
                    AND avpv.attribute_value_id IN ({$idsSql})
                    AND pv.image IS NOT NULL
                    AND pv.image <> ''
            ) THEN 1 ELSE 0 END AS has_selected_color_image_sort
        ");

        $query->orderByDesc('has_selected_color_image_sort');
    }

    private function applySorting($query, ?string $sortBy): void
    {
        $effectivePriceSql = $this->effectivePriceSql();

        switch ($sortBy) {
            case 'price_asc':
            case 'low_to_high':
            case 'low-high':
                $query->orderBy('products.price', 'asc');
                break;
            case 'price_desc':
            case 'high_to_low':
            case 'high-low':
                $query->orderBy('products.price', 'desc')
                    ->orderBy('products.created_at', 'desc')
                    ->orderByDesc('products.id');
                break;
            case 'best_seller':
            case 'top_selling':
                $query->orderBy('products.total_sold', 'desc');
                break;
            case 'name_asc':
            case 'a-z':
                $query->orderBy('products.name', 'asc');
                break;
            case 'name_desc':
            case 'z-a':
                $query->orderBy('products.name', 'desc');
                break;
            case 'oldest':
            case 'asc':
                $query->orderBy('products.created_at', 'asc');
                break;
            case 'discount-high-low':
                $query->orderByRaw('(CASE WHEN products.sale_price > 0 AND products.sale_price < products.price THEN ((products.price - products.sale_price) / products.price) * 100 ELSE 0 END) DESC');
                break;
            default: // newest, desc, or unrecognized
                $query->orderBy('products.created_at', 'desc')
                    ->orderByRaw("{$effectivePriceSql} DESC")
                    ->orderByDesc('products.id');
        }
    }

    private function resolveSelectedColorImagesForProducts(array $productIds, array $selectedColorIds)
    {
        if (empty($productIds) || empty($selectedColorIds)) {
            return collect();
        }

        $variants = ProductVariant::query()
            ->select(['product_variants.id', 'product_variants.product_id', 'product_variants.image'])
            ->join('attribute_value_product_variant as avpv', 'product_variants.id', '=', 'avpv.product_variant_id')
            ->whereIn('product_variants.product_id', $productIds)
            ->whereIn('avpv.attribute_value_id', $selectedColorIds)
            ->where('product_variants.is_active', true)
            ->whereNotNull('product_variants.image')
            ->where('product_variants.image', '!=', '')
            ->orderBy('product_variants.id')
            ->get();

        $map = collect();
        foreach ($variants as $variant) {
            if (!$map->has($variant->product_id) && $variant->image_url) {
                $map->put($variant->product_id, $variant->image_url);
            }
        }

        return $map;
    }

    private function extractColorIds(Request $request): array
    {
        return $this->normalizeIntegerArrayParam($request->input('color') ?? $request->input('colors'));
    }

    private function normalizeArrayParam($value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        $items = is_array($value) ? Arr::flatten($value) : explode(',', (string) $value);

        return array_values(array_filter(array_map(function ($item) {
            return trim((string) $item);
        }, $items), fn($item) => $item !== ''));
    }

    private function normalizeIntegerArrayParam($value): array
    {
        $values = $this->normalizeArrayParam($value);

        return array_values(array_unique(array_map(
            'intval',
            array_filter($values, fn($item) => is_numeric($item))
        )));
    }

    private function normalizePriceBucket(?string $bucket): ?string
    {
        $key = mb_strtolower(trim((string) $bucket), 'UTF-8');
        if ($key === '') {
            return null;
        }

        return match ($key) {
            'le_99', 'lte_99', '<=99', '<99', 'below_99', 'under_99', '0-99' => 'le_99',
            '100_149', '100-149' => '100_149',
            '150_199', '150-199' => '150_199',
            '200_plus', '200+', '200-' => '200_plus',
            default => null,
        };
    }

    private function effectivePriceSql(): string
    {
        return "CASE WHEN products.sale_price IS NOT NULL AND products.sale_price > 0 THEN products.sale_price ELSE products.price END";
    }

    /**
     * Generate a deterministic color when color_code is missing.
     */
    private function generateColorFromName(string $colorName): string
    {
        $hash = crc32($colorName);
        $r = max(50, min(200, ($hash & 0xFF0000) >> 16));
        $g = max(50, min(200, ($hash & 0x00FF00) >> 8));
        $b = max(50, min(200, $hash & 0x0000FF));

        return sprintf('#%02X%02X%02X', $r, $g, $b);
    }

    private function storefrontVisibleCategories($query)
    {
        return $query
            ->where(function ($q) {
                $q->whereNull('categories.is_default')->orWhere('categories.is_default', false);
            })
            ->where(function ($q) {
                $q->whereNull('categories.slug')->orWhere('categories.slug', '!=', 'uncategorized');
            });
    }
}
