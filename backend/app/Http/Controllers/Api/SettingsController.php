<?php

namespace App\Http\Controllers\Api;

use App\Models\Banner;
use App\Models\Country;
use App\Models\PaymentGateway;
use App\Models\Setting;
use App\Support\HomeBannerMediaResolver;
use App\Support\ThemeOptionMediaResolver;
use App\Services\PriceResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Arr;

class SettingsController extends BaseController
{
    private const PAYMENT_METHOD_DEFAULTS = [
        ['name' => 'cod', 'title' => 'Cash On Delivery', 'status' => true],
        [
            'name' => 'stripe_card',
            'title' => 'Credit/Debit Cards',
            'status' => true,
            'mode' => 'live',
            'test_publishable_key' => '',
            'test_secret_key' => '',
            'live_publishable_key' => '',
            'live_secret_key' => '',
        ],
        ['name' => 'apple_pay', 'title' => 'Apple Pay', 'status' => true],
        ['name' => 'google_pay', 'title' => 'Google Pay', 'status' => true],
        ['name' => 'tabby', 'title' => 'Pay with Tabby', 'status' => true],
        ['name' => 'tamara', 'title' => 'Pay with Tamara', 'status' => true],
    ];

    private const LEGACY_PAYMENT_METHOD_KEYS = [
        'cod' => ['cod'],
        'stripe_card' => ['stripe_card', 'stripe'],
        'apple_pay' => ['apple_pay', 'stripe'],
        'google_pay' => ['google_pay', 'stripe'],
        'tabby' => ['tabby'],
        'tamara' => ['tamara'],
    ];

    /**
     * Public settings endpoint - returns all frontend settings
     * Matches the shape expected by useSettings() hook:
     * { general, activation, delivery, wallet_points, payment_methods, maintenance, analytics }
     */
    public function settings()
    {
        $data = Cache::remember('website_settings', 300, function () {
            // The main settings blob stored as JSON under "values" key
            $raw = Setting::where('key', 'values')->value('value');
            $values = [];
            if ($raw) {
                $decoded = is_string($raw) ? json_decode($raw, true) : (is_array($raw) ? $raw : []);
                if (is_array($decoded)) {
                    $values = $decoded;
                }
            }

            // Override individual top-level settings that may have been updated separately
            $generalOverride = Setting::where('key', 'general')->value('value');
            if ($generalOverride) {
                $parsed = is_string($generalOverride) ? json_decode($generalOverride, true) : [];
                if (is_array($parsed)) {
                    $values['general'] = array_merge($values['general'] ?? [], $parsed);
                }
            }

            // Merge activation settings from individual keys
            $activation = $values['activation'] ?? [];
            $activationKeys = [
                'guest_checkout', 'coupon_enable', 'point_enable',
                'wallet_enable', 'track_order', 'stock_product_hide',
            ];
            foreach ($activationKeys as $key) {
                $val = Setting::where('key', $key)->value('value');
                if ($val !== null) {
                    $activation[$key] = filter_var($val, FILTER_VALIDATE_BOOLEAN);
                }
            }
            $values['activation'] = $activation;

            // Merge points settings
            $values['wallet_points'] = [
                'signup_points' => (int) \App\Models\Point::getSignupPoints(),
                'reward_per_order_amount' => (float) \App\Models\Setting::get('points.reward_per_order_amount', \App\Models\Point::POINTS_PER_AED),
                'point_currency_ratio' => \App\Models\Point::getCurrencyRatio(),
                'max_redeem_percent' => \App\Models\Point::getMaxRedeemPercent(),
            ];

            // Merge COD fee into general
            $codFee = Setting::where('key', 'cod_fee')->value('value');
            if ($codFee !== null) {
                $values['general']['cod_fee'] = (float) $codFee;
            }

            $values['payment_methods'] = $this->normalizePaymentMethods($values['payment_methods'] ?? null);

            return $values;
        });

        return $this->success($data);
    }

    /**
     * Combined homepage data endpoint - reduces API calls for homepage
     * Returns minimal data needed for homepage display
     */
    public function homepage(Request $request)
    {
        $cacheKey = 'homepage_data_v2';

        $data = Cache::remember($cacheKey, 120, function () {
            $options = [];
            $rawOptions = Setting::where('key', 'options')->value('value');
            if (is_string($rawOptions) && $rawOptions !== '') {
                $decodedOptions = json_decode($rawOptions, true);
                if (is_array($decodedOptions)) {
                    $options = $decodedOptions;
                }
            }

            $manualLatestIds = array_values(array_unique(array_filter(array_map(
                static fn ($id) => is_numeric($id) ? (int) $id : null,
                Arr::wrap(data_get($options, 'home_latest_products.product_ids', []))
            ), static fn ($id) => $id && $id > 0)));
            $manualLatestIds = array_slice($manualLatestIds, 0, 8);

            $manualBestSellerIds = array_values(array_unique(array_filter(array_map(
                static fn ($id) => is_numeric($id) ? (int) $id : null,
                Arr::wrap(data_get($options, 'home_best_seller_products.product_ids', []))
            ), static fn ($id) => $id && $id > 0)));
            $manualBestSellerIds = array_slice($manualBestSellerIds, 0, 8);

            // Helper to transform product for homepage (minimal data)
            $transformProduct = function ($product) {
                $primaryImage = $product->images->first();
                $imageUrl = $primaryImage?->image_url;

                // Calculate final price from variants or product
                $finalPrice = $product->sale_price > 0 ? $product->sale_price : $product->price;
                if ($product->variants->isNotEmpty()) {
                    $firstVariant = $product->variants->first();
                    $finalPrice = $firstVariant->sale_price > 0 ? $firstVariant->sale_price : $firstVariant->price;
                }

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'name_ar' => $product->name_ar,
                    'slug' => $product->slug,
                    'price' => $product->price,
                    'sale_price' => $product->sale_price,
                    'final_price' => $finalPrice,
                    'stock_status' => $product->stock_status,
                    'primary_image' => $imageUrl,
                    'product_thumbnail' => $imageUrl ? ['original_url' => $imageUrl] : null,
                    'categories' => $product->categories->map(fn($c) => [
                        'id' => $c->id,
                        'name' => $c->name,
                        'name_ar' => $c->name_ar,
                        'slug' => $c->slug,
                    ]),
                    'variants' => $product->variants->map(fn($v) => [
                        'id' => $v->id,
                        'price' => $v->price,
                        'sale_price' => $v->sale_price,
                        'final_price' => $v->sale_price > 0 ? $v->sale_price : $v->price,
                        'stock_quantity' => $v->stock_quantity,
                        'attribute_values' => $v->attributeValues->map(fn($av) => [
                            'id' => $av->id,
                            'value' => $av->value,
                            'color_code' => $av->color_code,
                        ]),
                    ]),
                ];
            };

            $buildHomepageProductQuery = function (array $columns) {
                return \App\Models\Product::query()
                    ->select($columns)
                    ->with([
                        'categories' => fn($q) => $q
                            ->where(function ($cq) {
                                $cq->whereNull('categories.is_default')->orWhere('categories.is_default', false);
                            })
                            ->where(function ($cq) {
                                $cq->whereNull('categories.slug')->orWhere('categories.slug', '!=', 'uncategorized');
                            })
                            ->select(['categories.id', 'categories.name', 'categories.name_ar', 'categories.slug']),
                        'images' => fn($q) => $q->select(['id', 'product_id', 'image', 'is_primary'])
                            ->orderByDesc('is_primary')->limit(1),
                        'variants' => fn($q) => $q->select(['id', 'product_id', 'price', 'sale_price', 'stock_quantity'])
                            ->where('is_active', true)->limit(5),
                        'variants.attributeValues:id,attribute_id,value,color_code',
                    ])
                    ->where('is_active', true);
            };

            $resolveAutomaticBestSellerIds = function (int $limit = 8) {
                $buildTopSellingIds = function (?int $year = null, ?\Carbon\Carbon $startDate = null, ?\Carbon\Carbon $endDate = null) use ($limit) {
                    $query = \DB::table('order_items as oi')
                        ->join('orders as o', 'o.id', '=', 'oi.order_id')
                        ->join('products as p', 'p.id', '=', 'oi.product_id')
                        ->whereNull('o.deleted_at')
                        ->whereNull('p.deleted_at')
                        ->where('p.is_active', true);

                    if ($year !== null) {
                        $query->whereYear('o.created_at', $year);
                    } elseif ($startDate !== null) {
                        $query->whereBetween('o.created_at', [$startDate, $endDate ?? now()]);
                    }

                    return $query
                        ->select('p.id')
                        ->selectRaw('SUM(oi.quantity) as quantity')
                        ->groupBy('p.id')
                        ->orderByDesc('quantity')
                        ->limit($limit)
                        ->pluck('p.id')
                        ->map(static fn ($id) => (int) $id)
                        ->values()
                        ->all();
                };

                $bestSellerIds = $buildTopSellingIds(null, now()->startOfYear(), now());

                if (empty($bestSellerIds)) {
                    $latestOrderDate = \DB::table('orders as o')
                        ->join('order_items as oi', 'o.id', '=', 'oi.order_id')
                        ->whereNull('o.deleted_at')
                        ->max('o.created_at');

                    if ($latestOrderDate) {
                        $fallbackYear = (int) \Carbon\Carbon::parse($latestOrderDate)->format('Y');
                        $bestSellerIds = $buildTopSellingIds($fallbackYear);
                    }
                }

                if (empty($bestSellerIds)) {
                    $bestSellerIds = \App\Models\Product::query()
                        ->whereNull('deleted_at')
                        ->where('is_active', true)
                        ->where('total_sold', '>', 0)
                        ->orderByDesc('total_sold')
                        ->limit($limit)
                        ->pluck('id')
                        ->map(static fn ($id) => (int) $id)
                        ->values()
                        ->all();
                }

                return $bestSellerIds;
            };

            // Latest products (8) - minimal data
            $latestProductsQuery = $buildHomepageProductQuery(['id', 'name', 'name_ar', 'slug', 'price', 'sale_price', 'stock_status']);
            if (!empty($manualLatestIds)) {
                $latestProductsQuery
                    ->whereIn('id', $manualLatestIds)
                    ->orderByRaw('FIELD(id,' . implode(',', $manualLatestIds) . ')');
            } else {
                $latestProductsQuery
                    ->orderBy('created_at', 'desc')
                    ->limit(8);
            }

            $latestProducts = $latestProductsQuery
                ->get()
                ->map($transformProduct);

            if (!empty($manualLatestIds) && $latestProducts->isEmpty()) {
                $latestProducts = $buildHomepageProductQuery(['id', 'name', 'name_ar', 'slug', 'price', 'sale_price', 'stock_status'])
                    ->orderBy('created_at', 'desc')
                    ->limit(8)
                    ->get()
                    ->map($transformProduct);
            }

            // Best seller products (8) - use actual order-item sales to match admin top-selling widget
            $bestSellerProductsQuery = $buildHomepageProductQuery(['id', 'name', 'name_ar', 'slug', 'price', 'sale_price', 'stock_status', 'total_sold']);
            if (!empty($manualBestSellerIds)) {
                $bestSellerProductsQuery
                    ->whereIn('id', $manualBestSellerIds)
                    ->orderByRaw('FIELD(id,' . implode(',', $manualBestSellerIds) . ')');
            } else {
                $automaticBestSellerIds = $resolveAutomaticBestSellerIds(8);
                if (!empty($automaticBestSellerIds)) {
                    $bestSellerProductsQuery
                        ->whereIn('id', $automaticBestSellerIds)
                        ->orderByRaw('FIELD(id,' . implode(',', $automaticBestSellerIds) . ')');
                } else {
                    $bestSellerProductsQuery
                        ->whereRaw('1 = 0');
                }
            }

            $bestSellerProducts = $bestSellerProductsQuery
                ->get()
                ->map($transformProduct);

            if (!empty($manualBestSellerIds) && $bestSellerProducts->isEmpty()) {
                $automaticBestSellerIds = $resolveAutomaticBestSellerIds(8);
                if (!empty($automaticBestSellerIds)) {
                    $bestSellerProducts = $buildHomepageProductQuery(['id', 'name', 'name_ar', 'slug', 'price', 'sale_price', 'stock_status', 'total_sold'])
                        ->whereIn('id', $automaticBestSellerIds)
                        ->orderByRaw('FIELD(id,' . implode(',', $automaticBestSellerIds) . ')')
                        ->get()
                        ->map($transformProduct);
                } else {
                    $bestSellerProducts = collect();
                }
            }

            // Categories (6) - minimal data
            $categories = \App\Models\Category::query()
                ->select(['id', 'name', 'slug', 'image'])
                ->parents()
                ->active()
                ->storefrontVisible()
                ->hasStorefrontProducts()
                ->orderBy('sort_order')
                ->limit(6)
                ->get()
                ->map(fn($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                    'image_url' => $c->image_url,
                ]);

            return [
                'latest_products' => $latestProducts,
                'best_seller_products' => $bestSellerProducts,
                'categories' => $categories,
            ];
        });

        return $this->success($data);
    }

    public function themeOptions(Request $request)
    {
        $countryId = $request->input('country_id');
        $cacheKey = 'theme_options_v2_' . ($countryId ?: 'default');

        $response = Cache::remember($cacheKey, 300, function () use ($countryId) {
            // Get all settings
            $settings = Setting::all()->pluck('value', 'key');

            // Get stored theme options from database
            $storedOptions = [];
            if (isset($settings['options'])) {
                $storedOptions = json_decode($settings['options'], true) ?: [];
            }

            // Normalize banner URLs and fallback missing mobile media to desktop media.
            $storedBanners = data_get($storedOptions, 'home_banner.banners', []);
            if (is_array($storedBanners)) {
                data_set($storedOptions, 'home_banner.banners', HomeBannerMediaResolver::normalizeBanners($storedBanners));
            }

            $storedOptions = ThemeOptionMediaResolver::hydrate($storedOptions);


            // Get active countries
            $countries = Country::active()->get();

            // Get banners for the country
            $bannerQuery = Banner::active()->orderBy('sort_order');
            if ($countryId) {
                $bannerQuery->forCountry($countryId);
            }
            $banners = $bannerQuery->get()->groupBy('position');

            // Merge stored options with defaults
            return array_merge($storedOptions, [
                'general' => array_merge($storedOptions['general'] ?? [], [
                    'site_name' => $settings['site_name'] ?? 'Cuple Shop',
                    'site_tagline' => $settings['site_tagline'] ?? '',
                    'logo' => $settings['logo'] ?? null,
                    'favicon' => $settings['favicon'] ?? null,
                    'copyright' => $settings['copyright'] ?? '© ' . date('Y') . ' Cuple Shop',
                ]),
                'activation' => [
                    'guest_checkout' => (bool) ($settings['guest_checkout'] ?? true),
                    'coupon_system' => (bool) ($settings['coupon_system'] ?? true),
                    'wishlist' => (bool) ($settings['wishlist'] ?? true),
                    'reviews' => (bool) ($settings['reviews'] ?? true),
                ],
                'countries' => $countries,
                'banners' => [
                    'home_slider' => $banners['home_slider'] ?? [],
                    'home_banner' => $banners['home_banner'] ?? [],
                ],
            ]);
        });

        return $this->success($response);
    }

    public function countries()
    {
        $countries = Cache::remember('countries_with_states', 600, function () {
            return Country::active()
                ->with([
                    'states' => function ($q) {
                        $q->active()->orderBy('name')->with([
                            'cities' => function ($cityQuery) {
                                $cityQuery->active()->orderBy('name');
                            },
                        ]);
                    }
                ])
                ->get()
                ->map(function ($country) {
                    return [
                        'id' => $country->id,
                        'name' => $country->name,
                        'code' => $country->code,
                        'currency' => $country->currency,
                        'currency_symbol' => $country->currency_symbol,
                        'phone_code' => $country->phone_code,
                        'state' => $country->states->map(function ($state) {
                            return [
                                'id' => $state->id,
                                'name' => $state->name,
                                'cities' => $state->cities->map(function ($city) {
                                    return [
                                        'id' => $city->id,
                                        'name' => $city->name,
                                    ];
                                }),
                            ];
                        }),
                    ];
                });
        });

        return $this->success($countries);
    }

    public function banners(Request $request)
    {
        $position = $request->input('position');
        $countryId = $request->input('country_id');

        $query = Banner::active()->orderBy('sort_order');

        if ($position) {
            $query->position($position);
        }

        if ($countryId) {
            $query->forCountry($countryId);
        }

        $banners = $query->get();

        return $this->success($banners);
    }

    /**
     * Combined shop page data endpoint - reduces API calls for shop/category pages
     * Returns products, categories sidebar, and filter options in single response
     */
    public function shopPage(Request $request)
    {
        $page = $request->input('page', 1);
        $perPage = $request->input('paginate', 12);
        $sortBy = $request->input('sortBy', 'newest');
        $categorySlug = $request->input('category');
        $colorFilter = $request->input('color');
        $sizeFilter = $request->input('size');
        $countryId = $request->input('country_id');

        // Build cache key
        $cacheParams = compact('page', 'perPage', 'sortBy', 'categorySlug', 'colorFilter', 'sizeFilter', 'countryId');
        $cacheKey = 'shop_page_' . md5(json_encode($cacheParams));

        // Categories for sidebar - cached longer (10 min)
        $categories = Cache::remember('shop_categories_sidebar', 600, function () {
            return \App\Models\Category::query()
                ->select(['id', 'name', 'slug', 'parent_id'])
                ->with([
                    'children' => fn($q) => $q->select(['id', 'name', 'slug', 'parent_id'])
                        ->active()
                        ->storefrontVisible()
                        ->hasStorefrontProducts()
                        ->orderBy('sort_order')
                ])
                ->parents()
                ->active()
                ->storefrontVisible()
                ->hasStorefrontProducts()
                ->orderBy('sort_order')
                ->get();
        });

        // Get category IDs if filtering by category
        $categoryIds = collect();
        if ($categorySlug) {
            $categoryIds = Cache::remember("category_tree_{$categorySlug}", 600, function () use ($categorySlug) {
                $category = \App\Models\Category::where(function ($q) use ($categorySlug) {
                        $q->where('slug', $categorySlug)
                            ->orWhere('id', $categorySlug);
                    })
                    ->storefrontVisible()
                    ->hasStorefrontProducts()
                    ->first();
                if (!$category)
                    return collect();

                $ids = collect([$category->id]);
                $childIds = \App\Models\Category::where('parent_id', $category->id)
                    ->storefrontVisible()
                    ->hasStorefrontProducts()
                    ->pluck('id');
                while ($childIds->isNotEmpty()) {
                    $ids = $ids->merge($childIds);
                    $childIds = \App\Models\Category::whereIn('parent_id', $childIds)
                        ->storefrontVisible()
                        ->hasStorefrontProducts()
                        ->pluck('id');
                }
                return $ids->unique();
            });
        }

        // Filter options - cached based on category (5 min)
        $filterCacheKey = 'shop_filters_' . ($categorySlug ?: 'all');
        $filters = Cache::remember($filterCacheKey, 300, function () use ($categoryIds) {
            $variantQuery = \App\Models\ProductVariant::query()
                ->where('is_active', true)
                ->whereHas('product', fn($q) => $q->where('is_active', true));

            if ($categoryIds->isNotEmpty()) {
                $variantQuery->whereHas('product.categories', fn($q) => $q->whereIn('categories.id', $categoryIds));
            }

            $variantIds = $variantQuery->pluck('id');

            $colors = \App\Models\AttributeValue::query()
                ->select(['attribute_values.id', 'attribute_values.value', 'attribute_values.color_code'])
                ->join('attribute_value_product_variant', 'attribute_values.id', '=', 'attribute_value_product_variant.attribute_value_id')
                ->whereIn('attribute_value_product_variant.product_variant_id', $variantIds)
                ->whereHas('attribute', fn($q) => $q->where('slug', 'color'))
                ->distinct()
                ->get();

            $sizes = \App\Models\AttributeValue::query()
                ->select(['attribute_values.id', 'attribute_values.value'])
                ->join('attribute_value_product_variant', 'attribute_values.id', '=', 'attribute_value_product_variant.attribute_value_id')
                ->whereIn('attribute_value_product_variant.product_variant_id', $variantIds)
                ->whereHas('attribute', fn($q) => $q->where('slug', 'size'))
                ->distinct()
                ->get();

            return ['colors' => $colors, 'sizes' => $sizes];
        });

        // Products - cached for 2 min (shorter due to pagination)
        $products = Cache::remember($cacheKey, 120, function () use ($categoryIds, $perPage, $sortBy, $colorFilter, $sizeFilter, $countryId) {
            $query = \App\Models\Product::query()
                ->select([
                    'id', 'name', 'slug', 'price', 'sale_price', 'min_price', 'max_price',
                    'min_sale_price', 'max_sale_price', 'has_variants',
                    'stock_status', 'total_sold', 'created_at'
                ])
                ->with([
                    'categories' => fn($q) => $q
                        ->where(function ($cq) {
                            $cq->whereNull('categories.is_default')->orWhere('categories.is_default', false);
                        })
                        ->where(function ($cq) {
                            $cq->whereNull('categories.slug')->orWhere('categories.slug', '!=', 'uncategorized');
                        })
                        ->select(['categories.id', 'categories.name', 'categories.slug']),
                    'images' => fn($q) => $q->select(['id', 'product_id', 'image', 'is_primary'])
                        ->orderByDesc('is_primary')->limit(2),
                    'variants' => fn($q) => $q->select(['id', 'product_id', 'price', 'sale_price', 'stock_quantity'])
                        ->where('is_active', true)->limit(5),
                    'variants.attributeValues:id,attribute_id,value,color_code',
                ])
                ->where('is_active', true);
            if ($countryId) {
                $query->with(['countries' => fn($q) => $q->where('countries.id', $countryId)]);
            }

            // Filter by category
            if ($categoryIds->isNotEmpty()) {
                $query->whereHas('categories', fn($q) => $q->whereIn('categories.id', $categoryIds));
            }

            // Filter by color
            if ($colorFilter) {
                $colorIds = is_array($colorFilter) ? $colorFilter : explode(',', $colorFilter);
                $query->whereHas('variants.attributeValues', function ($q) use ($colorIds) {
                    $q->whereIn('attribute_values.id', $colorIds)
                        ->whereHas('attribute', fn($aq) => $aq->where('slug', 'color'));
                });
            }

            // Filter by size
            if ($sizeFilter) {
                $sizes = is_array($sizeFilter) ? $sizeFilter : explode(',', $sizeFilter);
                $query->whereHas('variants.attributeValues', function ($q) use ($sizes) {
                    $q->whereIn('value', $sizes)
                        ->whereHas('attribute', fn($aq) => $aq->where('slug', 'size'));
                });
            }

            // Sorting
            switch ($sortBy) {
                case 'price_asc':
                    $query->orderBy('price', 'asc');
                    break;
                case 'price_desc':
                    $query->orderBy('price', 'desc');
                    break;
                case 'best_seller':
                    $query->orderBy('total_sold', 'desc');
                    break;
                default:
                    $query->orderBy('created_at', 'desc');
            }

            return $query->paginate($perPage);
        });

        $priceResolver = app(PriceResolver::class);
        $products->getCollection()->transform(function ($product) use ($priceResolver, $countryId) {
            $pricing = $priceResolver->resolve($product, $product->relationLoaded('variants') ? $product->variants : null, null, $countryId);

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

            return $product;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'products' => $products->items(),
                'categories' => $categories,
                'filters' => $filters,
            ],
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    /**
     * @param mixed $raw
     * @return array<int, array<string, mixed>>
     */
    private function normalizePaymentMethods(mixed $raw): array
    {
        $normalized = [];
        foreach (self::PAYMENT_METHOD_DEFAULTS as $method) {
            $normalized[$method['name']] = $method;
        }

        if (is_array($raw)) {
            if (array_is_list($raw)) {
                foreach ($raw as $item) {
                    if (!is_array($item)) {
                        continue;
                    }

                    $name = (string) ($item['name'] ?? '');
                    if ($name === '' || !isset($normalized[$name])) {
                        continue;
                    }

                    $normalized[$name]['title'] = trim((string) ($item['title'] ?? $normalized[$name]['title']));
                    $normalized[$name]['status'] = $this->toBool($item['status'] ?? $normalized[$name]['status'], $normalized[$name]['status']);
                    if ($name === 'stripe_card') {
                        $normalized[$name] = array_merge(
                            $normalized[$name],
                            $this->normalizeStripeSettings($item, $normalized[$name])
                        );
                    }
                }
            } else {
                foreach (self::PAYMENT_METHOD_DEFAULTS as $method) {
                    $name = $method['name'];
                    $legacyKeys = self::LEGACY_PAYMENT_METHOD_KEYS[$name] ?? [$name];
                    $legacy = null;
                    foreach ($legacyKeys as $legacyKey) {
                        $candidate = $raw[$legacyKey] ?? null;
                        if (is_array($candidate)) {
                            $legacy = $candidate;
                            break;
                        }
                    }

                    if (!$legacy) {
                        continue;
                    }

                    $normalized[$name]['title'] = trim((string) ($legacy['title'] ?? $normalized[$name]['title']));
                    $normalized[$name]['status'] = $this->toBool($legacy['status'] ?? $normalized[$name]['status'], $normalized[$name]['status']);
                    if ($name === 'stripe_card') {
                        $normalized[$name] = array_merge(
                            $normalized[$name],
                            $this->normalizeStripeSettings($legacy, $normalized[$name])
                        );
                    }
                }
            }
        }

        $gatewayStates = PaymentGateway::query()
            ->whereIn('name', ['tabby', 'tamara'])
            ->pluck('is_active', 'name');

        foreach (['tabby', 'tamara'] as $gatewayName) {
            if ($gatewayStates->has($gatewayName)) {
                $normalized[$gatewayName]['status'] = $this->toBool($gatewayStates->get($gatewayName), $normalized[$gatewayName]['status']);
            }
        }

        return array_values(array_map(function (array $method) {
            if ($method['title'] === '') {
                $method['title'] = ucfirst(str_replace('_', ' ', $method['name']));
            }

            return [
                'name' => $method['name'],
                'title' => $method['title'],
                'status' => (bool) $method['status'],
                ...($method['name'] === 'stripe_card'
                    ? [
                        'mode' => $this->normalizeStripeMode($method['mode'] ?? null, 'live'),
                        'test_publishable_key' => $this->sanitizeString($method['test_publishable_key'] ?? ''),
                        'test_secret_key' => $this->sanitizeString($method['test_secret_key'] ?? ''),
                        'live_publishable_key' => $this->sanitizeString($method['live_publishable_key'] ?? ''),
                        'live_secret_key' => $this->sanitizeString($method['live_secret_key'] ?? ''),
                    ]
                    : []),
            ];
        }, $normalized));
    }

    /**
     * @param array<string, mixed> $source
     * @param array<string, mixed> $fallback
     * @return array<string, string>
     */
    private function normalizeStripeSettings(array $source, array $fallback): array
    {
        $fallbackMode = $this->normalizeStripeMode($fallback['mode'] ?? null, 'live');

        $modeFromSandbox = $fallbackMode;
        if (array_key_exists('is_sandbox', $source)) {
            $modeFromSandbox = $this->toBool($source['is_sandbox'], true) ? 'test' : 'live';
        }

        $mode = $this->normalizeStripeMode(
            $source['mode'] ?? $source['stripe_mode'] ?? null,
            $modeFromSandbox
        );

        $legacyPublishable = $this->sanitizeString($source['publishable_key'] ?? $source['public_key'] ?? '');
        $legacySecret = $this->sanitizeString($source['secret_key'] ?? '');

        return [
            'mode' => $mode,
            'test_publishable_key' => $this->sanitizeString(
                $source['test_publishable_key'] ?? $source['test_public_key'] ?? null,
                $mode === 'test'
                    ? $legacyPublishable
                    : $this->sanitizeString($fallback['test_publishable_key'] ?? '')
            ),
            'test_secret_key' => $this->sanitizeString(
                $source['test_secret_key'] ?? $source['test_private_key'] ?? null,
                $mode === 'test'
                    ? $legacySecret
                    : $this->sanitizeString($fallback['test_secret_key'] ?? '')
            ),
            'live_publishable_key' => $this->sanitizeString(
                $source['live_publishable_key'] ?? $source['live_public_key'] ?? null,
                $mode === 'live'
                    ? $legacyPublishable
                    : $this->sanitizeString($fallback['live_publishable_key'] ?? '')
            ),
            'live_secret_key' => $this->sanitizeString(
                $source['live_secret_key'] ?? $source['live_private_key'] ?? null,
                $mode === 'live'
                    ? $legacySecret
                    : $this->sanitizeString($fallback['live_secret_key'] ?? '')
            ),
        ];
    }

    private function normalizeStripeMode(mixed $value, string $default = 'live'): string
    {
        $candidate = strtolower(trim((string) $value));
        if (in_array($candidate, ['test', 'live'], true)) {
            return $candidate;
        }

        return $default;
    }

    private function sanitizeString(mixed $value, string $default = ''): string
    {
        if ($value === null) {
            return $default;
        }

        $candidate = trim((string) $value);
        if ($candidate === '' || strtolower($candidate) === 'null') {
            return $default;
        }

        return $candidate;
    }

    private function toBool(mixed $value, bool $default): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value === 1;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if ($normalized === 'true') {
                return true;
            }
            if ($normalized === 'false') {
                return false;
            }
        }

        return $default;
    }
}
