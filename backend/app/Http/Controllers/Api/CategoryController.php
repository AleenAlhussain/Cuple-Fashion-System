<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CategoryController extends BaseController
{
    public function index(Request $request)
    {
        $onlyWithProducts = $request->boolean('only_with_products', true);

        // Create cache key based on request parameters
        $cacheKey = 'categories_' . md5(json_encode([
            'parents_only' => $request->boolean('parents_only'),
            'with_count' => $request->boolean('with_count'),
            'only_with_products' => $onlyWithProducts,
        ]));

        $categories = Cache::remember($cacheKey, 300, function () use ($request, $onlyWithProducts) {
            $query = Category::with(['children' => function ($q) use ($onlyWithProducts) {
                $q->active()->storefrontVisible();
                if ($onlyWithProducts) {
                    $q->hasStorefrontProducts();
                }
                $q->orderBy('sort_order');
            }])
                ->active()
                ->storefrontVisible()
                ->orderBy('sort_order');

            if ($onlyWithProducts) {
                $query->hasStorefrontProducts();
            }

            // Only parent categories
            if ($request->boolean('parents_only')) {
                $query->parents();
            }

            // Include product count
            if ($request->boolean('with_count')) {
                $query->withCount('products');
            }

            return $query->get();
        });

        return $this->success($categories);
    }

    public function show($idOrSlug)
    {
        $cacheKey = "category_detail_v2_{$idOrSlug}";

        $category = Cache::remember($cacheKey, 600, function () use ($idOrSlug) {
            return Category::query()
                ->select(['id', 'name', 'name_ar', 'slug', 'description', 'image', 'parent_id', 'sort_order'])
                ->with([
                    'children' => fn($q) => $q->select(['id', 'name', 'name_ar', 'slug', 'image', 'parent_id', 'sort_order'])
                        ->active()
                        ->storefrontVisible()
                        ->hasStorefrontProducts()
                        ->orderBy('sort_order'),
                    'parent:id,name,name_ar,slug'
                ])
                ->active()
                ->storefrontVisible()
                ->where(function($q) use ($idOrSlug) {
                    if (is_numeric($idOrSlug)) {
                        $q->where('id', (int) $idOrSlug);
                    } else {
                        $q->where('slug', $idOrSlug);
                    }
                })
                ->firstOrFail();
        });

        return $this->success($category);
    }

    public function products(Request $request, $idOrSlug)
    {
        $page = $request->input('page', 1);
        $perPage = $request->input('paginate', 12);
        $sortBy = $request->input('sortBy', 'newest');
        $cacheKey = "category_products_{$idOrSlug}_p{$page}_pp{$perPage}_s{$sortBy}";

        // Get category IDs (cached)
        $categoryIds = Cache::remember("category_tree_{$idOrSlug}", 600, function () use ($idOrSlug) {
            $category = is_numeric($idOrSlug)
                ? Category::active()->storefrontVisible()->hasStorefrontProductsOrChildProducts()->find($idOrSlug)
                : Category::active()->storefrontVisible()->hasStorefrontProductsOrChildProducts()->where('slug', $idOrSlug)->first();
            if (!$category) return collect();

            $ids = collect([$category->id]);
            $childIds = Category::storefrontVisible()
                ->active()
                ->where('parent_id', $category->id)
                ->pluck('id');

            while ($childIds->isNotEmpty()) {
                $ids = $ids->merge($childIds);
                $childIds = Category::storefrontVisible()
                    ->active()
                    ->whereIn('parent_id', $childIds)
                    ->pluck('id');
            }

            return $ids->unique();
        });

        if ($categoryIds->isEmpty()) {
            return $this->paginated(collect());
        }

        // Get products (cached for 2 minutes)
        $products = Cache::remember($cacheKey, 120, function () use ($categoryIds, $perPage, $sortBy) {
            $query = \App\Models\Product::query()
                ->select(['id', 'name', 'slug', 'price', 'sale_price', 'stock_status', 'total_sold', 'created_at'])
                ->with([
                    'categories' => fn($q) => $q->storefrontVisible()->select(['categories.id', 'categories.name', 'categories.name_ar', 'categories.slug']),
                    'images' => fn($q) => $q->select(['id', 'product_id', 'image', 'is_primary'])
                        ->orderByDesc('is_primary')->limit(2),
                    'variants' => fn($q) => $q->select(['id', 'product_id', 'price', 'sale_price', 'stock_quantity'])
                        ->where('is_active', true)->limit(5),
                    'variants.attributeValues:id,attribute_id,value,color_code',
                ])
                ->whereHas('categories', fn($q) => $q->whereIn('categories.id', $categoryIds))
                ->where('is_active', true);

            // Apply sorting
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

        return $this->paginated($products);
    }
}
