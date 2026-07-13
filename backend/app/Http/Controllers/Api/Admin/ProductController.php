<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Attachment;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Services\ExternalImageDownloader;
use App\Services\PriceResolver;
use App\Services\ProductOfferService;
use App\Services\ProductPublishValidator;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\Api\Traits\SmartSearchable;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class ProductController extends BaseController
{
    use SmartSearchable;
    public function index(Request $request)
    {
        // Check if this is a top selling request
        if ($request->boolean('top_selling')) {
            return $this->topSellingProducts($request);
        }

        // Optimized query - only load essential fields for the product list
        $query = Product::select([
                'id', 'name', 'name_ar', 'sku', 'price', 'sale_price', 'stock_status',
                'stock_quantity', 'is_active', 'brand_id', 'description', 'created_at'
            ])
            ->with([
                // Only load primary image (or first image if no primary)
                'images' => function ($q) {
                    $q->select(['id', 'product_id', 'image', 'is_primary'])
                      ->orderByDesc('is_primary')
                      ->orderBy('id')
                      ->limit(1);
                },
                // Include minimal category/tag info for admin list display
                'categories:id,name',
                'tags:id,name',
            ])
            // Count categories for quality score
            ->withCount('categories');

        // Smart search with whitelist (includes variant SKU/brand/category)
        if ($request->filled('search')) {
            $this->applySmartSearch(
                $query,
                $request->search,
                ['name', 'name_ar', 'slug', 'sku'],
                [
                    'variants' => ['sku', 'name'],
                    'brand' => ['name'],
                    'categories' => ['name'],
                ]
            );
        }

        // Filter by category
        if ($request->has('category_ids') && $request->category_ids) {
            $categoryIds = is_array($request->category_ids) ? $request->category_ids : explode(',', $request->category_ids);
            $query->whereHas('categories', function ($q) use ($categoryIds) {
                $q->whereIn('categories.id', $categoryIds);
            });
        }

        // Filter by brand
        if ($request->has('brand_ids') && $request->brand_ids) {
            $brandIds = is_array($request->brand_ids) ? $request->brand_ids : explode(',', $request->brand_ids);
            $query->whereIn('brand_id', $brandIds);
        }

        // Filter by store
        if ($request->has('store_ids') && $request->store_ids) {
            $storeIds = is_array($request->store_ids) ? $request->store_ids : explode(',', $request->store_ids);
            $query->whereIn('store_id', $storeIds);
        }

        // Filter by tag
        if ($request->has('tag_ids') && $request->tag_ids) {
            $tagIds = is_array($request->tag_ids) ? $request->tag_ids : explode(',', $request->tag_ids);
            $query->whereHas('tags', function ($q) use ($tagIds) {
                $q->whereIn('tags.id', $tagIds);
            });
        }

        // Filter by product type
        if ($request->has('product_type') && $request->product_type) {
            $type = $request->product_type;
            // Map 'variable' to 'classified' if backend uses that
            if ($type === 'variable') {
                $query->where(function ($q) {
                    $q->where('type', 'variable')->orWhere('type', 'classified');
                });
            } else {
                $query->where('type', $type);
            }
        }

        // Filter by country/market
        if ($request->has('market') && $request->market) {
            $marketMap = ['uae' => 1, 'ksa' => 2];
            $countryId = $marketMap[$request->market] ?? $request->market;
            $query->whereHas('countries', function ($q) use ($countryId) {
                $q->where('countries.id', $countryId);
            });
        }

        // Filter by trashed (soft-deleted products)
        if ($request->boolean('trashed')) {
            $query->onlyTrashed();
        }

        // Filter by is_active (prefer explicit is_active, fallback to status for backward compatibility)
        $isActiveFilter = null;
        if ($request->has('is_active')) {
            $isActiveFilter = $request->input('is_active');
        } elseif ($request->has('status')) {
            $isActiveFilter = $request->input('status');
        }
        if ($isActiveFilter !== '' && $isActiveFilter !== null) {
            $query->where('is_active', $isActiveFilter == '1' || $isActiveFilter === 'active' || $isActiveFilter === true);
        }

        // Filter by stock status
        if ($request->has('stock_status') && $request->stock_status) {
            $query->where('stock_status', $request->stock_status);
        }

        // Problem filters
        if ($request->boolean('missing_image') || $request->boolean('no_image')) {
            $query->whereDoesntHave('images');
        }
        if ($request->boolean('zero_stock')) {
            $query->where('stock_quantity', '<=', 0);
        }
        if ($request->boolean('no_category')) {
            $query->whereDoesntHave('categories');
        }

        // Publish readiness filters
        $validStockStatuses = ['in_stock', 'out_of_stock', 'on_backorder'];
        $internalImagePrefixes = [
            'https://api.cuple.shop/',
            'http://api.cuple.shop/',
            'https://admin.cuple.shop/',
            'http://admin.cuple.shop/',
            'https://cuple.shop/',
            'http://cuple.shop/',
            'https://localhost/',
            'http://localhost/',
            'https://127.0.0.1/',
            'http://127.0.0.1/',
        ];
        $publishReadiness = strtolower(trim((string) $request->input('publish_readiness', '')));
        $hasIssueFlag = $request->boolean('incomplete') || $request->boolean('issue') || $request->boolean('has_issues');
        $hasReadyFlag = $request->boolean('ready');

        if ($publishReadiness === '') {
            if ($hasIssueFlag xor $hasReadyFlag) {
                $publishReadiness = $hasIssueFlag ? 'issue' : 'ready';
            }
        }

        $applyValidImageConstraint = function ($imageQuery) use ($internalImagePrefixes) {
            $imageQuery
                ->whereNotNull('image')
                ->where('image', '<>', '')
                ->where(function ($validImageQuery) use ($internalImagePrefixes) {
                    $validImageQuery->where('image', 'not like', 'http%');
                    foreach ($internalImagePrefixes as $prefix) {
                        $validImageQuery->orWhere('image', 'like', $prefix . '%');
                    }
                });
        };

        $applyReadyFilter = function ($queryBuilder) use ($validStockStatuses, $applyValidImageConstraint) {
            $queryBuilder
                ->whereHas('images', function ($imageQuery) use ($applyValidImageConstraint) {
                    $applyValidImageConstraint($imageQuery);
                })
                ->whereNotNull('price')
                ->where('price', '>', 0)
                ->whereNotNull('stock_quantity')
                ->where('stock_quantity', '>=', 0)
                ->whereIn('stock_status', $validStockStatuses)
                ->whereHas('categories')
                ->whereRaw("TRIM(COALESCE(products.sku, '')) <> ''");
        };

        $applyIssueFilter = function ($queryBuilder) use ($validStockStatuses, $applyValidImageConstraint) {
            $queryBuilder->where(function ($issueQuery) use ($validStockStatuses, $applyValidImageConstraint) {
                $issueQuery
                    ->whereDoesntHave('images', function ($imageQuery) use ($applyValidImageConstraint) {
                        $applyValidImageConstraint($imageQuery);
                    })
                    ->orWhereNull('price')
                    ->orWhere('price', '<=', 0)
                    ->orWhereNull('stock_quantity')
                    ->orWhere('stock_quantity', '<', 0)
                    ->orWhereNull('stock_status')
                    ->orWhereNotIn('stock_status', $validStockStatuses)
                    ->orWhereDoesntHave('categories')
                    ->orWhereRaw("TRIM(COALESCE(products.sku, '')) = ''");
            });
        };

        if ($publishReadiness === 'ready') {
            $applyReadyFilter($query);
        } elseif (in_array($publishReadiness, ['issue', 'issues', 'incomplete'], true)) {
            $applyIssueFilter($query);
        }

        // --------- Sales quantity calc (virtual field: quantity) ---------
$salesStatuses = ['confirmed', 'shipped', 'delivered'];

$field = $request->input('field', 'created_at');
$order = strtolower($request->input('order', 'desc')) === 'asc' ? 'asc' : 'desc';

$needsQuantity = ($field === 'quantity');

if ($needsQuantity) {

    // Subquery: sales per product
    $salesSub = \DB::table('order_items')
        ->selectRaw('order_items.product_id, COALESCE(SUM(order_items.quantity),0) + 0 as quantity')
        ->join('orders', function ($join) use ($salesStatuses) {
            $join->on('orders.id', '=', 'order_items.order_id')
                 ->whereNull('orders.deleted_at')
                 ->whereIn('orders.status', $salesStatuses);
        })
        ->groupBy('order_items.product_id');

    // Join subquery
    $query->leftJoinSub($salesSub, 'sales', function ($join) {
        $join->on('sales.product_id', '=', 'products.id');
    });

    // Ensure we still select product fields + virtual quantity
    // (إذا كنت عامل select([...]) فوق، خليه كما هو، وهيك بس بنضيف quantity)
    $query->addSelect(\DB::raw('COALESCE(sales.quantity,0) + 0 as quantity'));

    // Sort by quantity (virtual)
    $query->orderBy('quantity', $order);
}



        // Sort
        $allowedFields = [
    'id', 'name', 'sku', 'price', 'sale_price',
    'stock_quantity', 'stock_status', 'is_active',
    'created_at', 'updated_at',
];

if ($field === 'quantity') {
    // virtual field من joinSub
    $query->orderBy('quantity', $order);
} elseif (in_array($field, $allowedFields, true)) {
    $query->orderBy('products.' . $field, $order);
} else {
    $query->orderBy('products.created_at', 'desc');
}

        $products = $query->paginate($request->input('paginate', 15));

        // Transform products for frontend compatibility (minimal processing)
        $items = $products->getCollection()->map(function ($product) {
            $thumbnail = $product->images->first();
            $product->product_thumbnail = $thumbnail ? [
                'id' => $thumbnail->id,
                'original_url' => $thumbnail->image_url,
            ] : null;
            $product->status = $product->is_active ? 1 : 0;
            // Add category count for quality check
            $product->category_count = $product->categories_count ?? 0;
            // Flatten categories/tags for light payload (name + id)
            $product->categories = $product->categories?->map(function ($category) {
                return ['id' => $category->id, 'name' => $category->name];
            }) ?? [];
            $product->tags = $product->tags?->map(function ($tag) {
                return ['id' => $tag->id, 'name' => $tag->name];
            }) ?? [];
            return $product;
        });

        // Get status counts for the filter badges
        $statusCounts = [
            'published' => Product::where('is_active', true)->count(),
            'drafts' => Product::where('is_active', false)->count(),
            'trashed' => Product::onlyTrashed()->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $items,
            'total' => $products->total(),
            'current_page' => $products->currentPage(),
            'last_page' => $products->lastPage(),
            'per_page' => $products->perPage(),
            'status_counts' => $statusCounts,
        ]);
    }

    public function bulkAction(Request $request)
    {
        $action = $request->input('action');

        // Support "select all" — resolve IDs from filters instead of explicit list
        if ($request->boolean('select_all')) {
            $query = Product::query();
            if ($request->input('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('name_ar', 'ilike', "%{$search}%")
                      ->orWhere('sku', 'ilike', "%{$search}%")
                      ->orWhere('slug', 'ilike', "%{$search}%");
                });
            }
            if ($request->has('status') && $request->input('status') !== null && $request->input('status') !== '') {
                $query->where('is_active', $request->boolean('status'));
            }
            if ($request->boolean('trashed')) {
                $query->onlyTrashed();
            }
            $ids = $query->pluck('id')->toArray();
        } else {
            $ids = $request->input('ids', []);
        }

        if (empty($ids)) {
            return $this->error('No products selected.', 400);
        }

        $dataPayload = $request->input('data', []);
        if (is_string($dataPayload)) {
            $decodedData = json_decode($dataPayload, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedData)) {
                $dataPayload = $decodedData;
            } else {
                $dataPayload = [];
            }
        }

        $bulkGet = function ($key, $default = null) use ($request, $dataPayload) {
            if (is_array($dataPayload) && array_key_exists($key, $dataPayload)) {
                return $dataPayload[$key];
            }
            return $request->input($key, $default);
        };

        switch ($action) {
            case 'publish':
                $products = Product::with([
                    'images:id,product_id,product_variant_id,image,is_primary',
                    'categories:id',
                    'variants:id,product_id,sku,price,stock_quantity,is_active',
                    'variants.attributeValues:id,attribute_id',
                ])
                    ->whereIn('id', $ids)
                    ->get()
                    ->keyBy('id');

                $publishValidator = app(ProductPublishValidator::class);
                $publishedIds = [];
                $skipped = [];

                foreach ($ids as $id) {
                    $product = $products->get($id);
                    if (!$product) {
                        $skipped[] = [
                            'id' => $id,
                            'reasons' => ['Product not found'],
                        ];
                        continue;
                    }

                    $validation = $publishValidator->validate($product);
                    if (!$validation['valid']) {
                        $skipped[] = [
                            'id' => $product->id,
                            'reasons' => $validation['reasons'],
                        ];
                        continue;
                    }

                    $product->update(['is_active' => true]);
                    $publishedIds[] = $product->id;
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Bulk publish completed.',
                    'published_ids' => $publishedIds,
                    'skipped' => $skipped,
                ]);
            case 'draft':
                Product::whereIn('id', $ids)->update(['is_active' => false]);
                break;
            case 'delete':
                Product::whereIn('id', $ids)->delete();
                break;
            case 'stock_update':
                $stockStatus = $bulkGet('stock_status');
                if ($stockStatus !== null) {
                    Product::whereIn('id', $ids)->update(['stock_status' => $stockStatus]);
                }
                break;
            case 'set_category':
                $categoryMode = strtolower((string) $bulkGet('category_mode', 'add'));
                if (!in_array($categoryMode, ['add', 'set', 'remove', 'clear'], true)) {
                    $categoryMode = 'add';
                }
                $clearCategory = filter_var($bulkGet('clear_category', false), FILTER_VALIDATE_BOOLEAN);
                $categoryIds = $bulkGet('category_ids', []);
                if (!is_array($categoryIds)) {
                    $categoryIds = $categoryIds ? explode(',', $categoryIds) : [];
                }
                $categoryIds = array_filter(
                    array_map(
                        fn ($value) => is_numeric($value) ? (int) $value : null,
                        $categoryIds
                    ),
                    fn ($value) => $value > 0
                );

                foreach ($ids as $id) {
                    $product = Product::find($id);
                    if (!$product) {
                        continue;
                    }
                    if ($clearCategory || $categoryMode === 'clear') {
                        $product->categories()->detach();
                        continue;
                    }
                    if ($categoryMode === 'remove') {
                        if (!empty($categoryIds)) {
                            $product->categories()->detach($categoryIds);
                        }
                        continue;
                    }
                    if (!empty($categoryIds)) {
                        if ($categoryMode === 'set') {
                            $product->categories()->sync($categoryIds);
                        } else {
                            $product->categories()->syncWithoutDetaching($categoryIds);
                        }
                    }
                }
                break;
            case 'add_tag':
                $tagId = $bulkGet('tag_id');
                if ($tagId) {
                    foreach ($ids as $id) {
                        $product = Product::find($id);
                        if ($product) {
                            $product->tags()->syncWithoutDetaching([$tagId]);
                        }
                    }
                }
                break;
            case 'remove_tag':
                $tagId = $bulkGet('tag_id');
                if ($tagId) {
                    foreach ($ids as $id) {
                        $product = Product::find($id);
                        if ($product) {
                            $product->tags()->detach($tagId);
                        }
                    }
                }
                break;
            case 'set_market':
                $countryIds = $bulkGet('country_ids', []);
                if (!is_array($countryIds)) {
                    $countryIds = $countryIds ? explode(',', $countryIds) : [];
                }
                $countryIds = array_filter(
                    array_map(
                        fn ($value) => is_numeric($value) ? (int) $value : null,
                        $countryIds
                    ),
                    fn ($value) => $value > 0
                );
                foreach ($ids as $id) {
                    $product = Product::find($id);
                    if ($product && !empty($countryIds)) {
                        $product->countries()->sync($countryIds);
                    }
                }
                break;
            case 'add_market':
                $countryIds = $bulkGet('country_ids', []);
                if (!is_array($countryIds)) {
                    $countryIds = $countryIds ? explode(',', $countryIds) : [];
                }
                $countryIds = array_filter(
                    array_map(
                        fn ($value) => is_numeric($value) ? (int) $value : null,
                        $countryIds
                    ),
                    fn ($value) => $value > 0
                );
                foreach ($ids as $id) {
                    $product = Product::find($id);
                    if ($product && !empty($countryIds)) {
                        $product->countries()->syncWithoutDetaching($countryIds);
                    }
                }
                break;
            case 'set_brand':
                $brandId = $bulkGet('brand_id');
                Product::whereIn('id', $ids)->update(['brand_id' => $brandId ?: null]);
                break;
            case 'set_store':
                $storeId = $bulkGet('store_id');
                Product::whereIn('id', $ids)->update(['store_id' => $storeId ?: null]);
                break;
            case 'price_update':
                $scope = $bulkGet('scope');
                $target = $bulkGet('target');
                $countryId = $bulkGet('country_id');
                $variantId = $bulkGet('variant_id');
                $price = $bulkGet('price');
                $salePrice = $bulkGet('sale_price');
                $syncProductPrices = boolval($bulkGet('sync_product_prices', false));

                $useNewFlow =
                    $scope ||
                    $target ||
                    $request->has('price') ||
                    $request->has('sale_price') ||
                    array_key_exists('price', $dataPayload ?: []) ||
                    array_key_exists('sale_price', $dataPayload ?: []);

                if ($useNewFlow) {
                    $scope = $scope ?: 'global';
                    $target = $target ?: 'product';

                    if ($scope === 'country' && !$countryId) {
                        return $this->error('country_id is required for country scope.', 422);
                    }
                    if ($target === 'variant' && !$variantId) {
                        return $this->error('variant_id is required for target=variant.', 422);
                    }
                }

                $priceResolver = app(PriceResolver::class);

                foreach ($ids as $id) {
                    $product = Product::find($id);
                    if (!$product) {
                        continue;
                    }

                    if ($useNewFlow) {
                        if ($scope === 'country') {
                            $pivotData = array_filter([
                                'price' => $price,
                                'sale_price' => $salePrice,
                            ], fn ($v) => $v !== null);

                            if (!empty($pivotData)) {
                                $product->countries()->syncWithoutDetaching([
                                    $countryId => $pivotData,
                                ]);
                            }
                            continue;
                        }

                        $updateData = array_filter([
                            'price' => $price,
                            'sale_price' => $salePrice,
                        ], fn ($v) => $v !== null);

                        if ($target === 'product') {
                            if (!empty($updateData)) {
                                $product->update($updateData);
                                $priceResolver->refreshCachedPrices($product);
                            }
                            continue;
                        }

                        if (empty($updateData)) {
                            continue;
                        }

                        if ($target === 'variant') {
                            ProductVariant::where('product_id', $product->id)
                                ->where('id', $variantId)
                                ->update($updateData);
                            $priceResolver->refreshCachedPrices($product, null, $syncProductPrices);
                            continue;
                        }

                        if ($target === 'all_variants') {
                            ProductVariant::where('product_id', $product->id)->update($updateData);
                            $priceResolver->refreshCachedPrices($product, null, $syncProductPrices);
                        }
                        continue;
                    }

                    $priceMode = $bulkGet('price_mode', 'fixed');
                    $priceValue = floatval($bulkGet('price_value', 0));

                    if ($priceMode === 'fixed') {
                        $product->sale_price = $priceValue;
                    } elseif ($priceMode === 'percent') {
                        $currentPrice = $product->price ?: 0;
                        $newPrice = $currentPrice * (1 + ($priceValue / 100));
                        $product->sale_price = max(0, round($newPrice, 2));
                    }

                    $product->save();
                    $priceResolver->refreshCachedPrices($product);
                }
                break;
            case 'image_upload':
                if ($request->hasFile('file')) {
                    // TODO: Implement SKU-based image upload logic
                }
                break;
        }

        return $this->success(null, 'Bulk action completed successfully.');
    }

    public function replicate($id)
    {
        $product = Product::with(['categories', 'countries', 'tags', 'images'])->findOrFail($id);

        $newProduct = $product->replicate();
        $newProduct->name = $product->name . ' (Copy)';
        $newProduct->sku = $product->sku . '-' . Str::random(4);
        $newProduct->slug = Str::slug($newProduct->name) . '-' . Str::random(6);
        $newProduct->save();

        // Copy relationships
        $newProduct->categories()->sync($product->categories->pluck('id'));
        $newProduct->countries()->sync($product->countries->pluck('id'));
        $newProduct->tags()->sync($product->tags->pluck('id'));

        return $this->success($newProduct->load(['categories', 'countries']), 'Product duplicated successfully.');
    }

    private function normalizeProductExportType(Request $request): string
    {
        $type = strtolower(trim((string) $request->input('export_type', '')));

        return in_array($type, ['quantity', 'prices', 'full_items'], true) ? $type : 'full';
    }

    private function applyProductExportFilters($query, Request $request): void
    {
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('stock_status')) {
            $query->where('stock_status', $request->input('stock_status'));
        }

        if ($request->filled('category_ids')) {
            $categoryIds = is_array($request->category_ids) ? $request->category_ids : explode(',', $request->category_ids);
            $query->whereHas('categories', function ($q) use ($categoryIds) {
                $q->whereIn('categories.id', $categoryIds);
            });
        }

        if ($request->filled('tag_ids')) {
            $tagIds = is_array($request->tag_ids) ? $request->tag_ids : explode(',', $request->tag_ids);
            $query->whereHas('tags', function ($q) use ($tagIds) {
                $q->whereIn('tags.id', $tagIds);
            });
        }

        if ($request->has('status') && $request->status !== '' && $request->status !== null) {
            $isActive = $request->status == '1' || $request->status === 'active' || $request->status === 'true';
            $query->where('is_active', $isActive);
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhereHas('variants', function ($variantQuery) use ($search) {
                        $variantQuery->where('sku', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('market')) {
            $marketMap = ['uae' => 1, 'ksa' => 2];
            $countryId = $marketMap[strtolower((string) $request->market)] ?? $request->market;
            $query->whereHas('countries', function ($q) use ($countryId) {
                $q->where('countries.id', $countryId);
            });
        }
    }

    private function buildVariantExportRows($products, string $exportType): array
    {
        $rows = [];

        foreach ($products as $product) {
            $variants = $product->variants ?? collect();

            // Fallback for simple products without variants.
            if ($variants->isEmpty()) {
                if ($exportType === 'quantity') {
                    $rows[] = [
                        'sku' => $product->sku,
                        'stock_quantity' => (int) ($product->stock_quantity ?? 0),
                    ];
                } else {
                    $rows[] = [
                        'sku' => $product->sku,
                        'price' => (float) ($product->price ?? 0),
                        'sale_price' => $product->sale_price,
                    ];
                }
                continue;
            }

            foreach ($variants as $variant) {
                $variantSku = trim((string) ($variant->sku ?: $product->sku));
                if ($variantSku === '') {
                    continue;
                }

                if ($exportType === 'quantity') {
                    $rows[] = [
                        'sku' => $variantSku,
                        'stock_quantity' => (int) ($variant->stock_quantity ?? 0),
                    ];
                } else {
                    $rows[] = [
                        'sku' => $variantSku,
                        'price' => $variant->price !== null ? (float) $variant->price : (float) ($product->price ?? 0),
                        'sale_price' => $variant->sale_price,
                    ];
                }
            }
        }

        return $rows;
    }

    private function defaultUaeStoreNames(): array
    {
        return [
            'UAE',
            '06 Mall',
            'Al Ghurair',
            'Al Manar',
            'Arabian Cuple',
            'Bawabat Cuple',
            'Bawadi',
            'Deerfields',
            'Delma Cuple',
            'DFC',
            'Dubai Hills',
            'Warehouse',
            'Outlet',
            'Rhamania',
            'Shamkha',
            'Yasmall',
            'Zakher Makani',
        ];
    }

    private function normalizeStoreKey($value): string
    {
        $key = strtolower(trim((string) $value));
        $key = preg_replace('/[^a-z0-9]+/', '_', $key) ?? '';
        return trim($key, '_');
    }

    private function resolveStoreExportColumns(): array
    {
        $stores = [];
        $seen = [];
        $hasOnHandTable = Schema::hasTable('uae_store_on_hand_raw');
        $defaultStoreNames = $this->defaultUaeStoreNames();
        $defaultNameMap = [];
        foreach ($defaultStoreNames as $defaultName) {
            $defaultNameMap[$this->normalizeStoreKey($defaultName)] = $defaultName;
        }

        if (Schema::hasTable('uae_store_priority')) {
            $query = DB::table('uae_store_priority');
            $select = ['store_name'];

            $hasStoreKey = Schema::hasColumn('uae_store_priority', 'store_key');
            $hasStoreCode = Schema::hasColumn('uae_store_priority', 'store_code');

            if ($hasStoreKey) {
                $select[] = 'store_key';
            }
            if ($hasStoreCode) {
                $select[] = 'store_code';
            }
            if (Schema::hasColumn('uae_store_priority', 'priority')) {
                $query->orderBy('priority', 'asc');
            } else {
                $query->orderBy('id', 'asc');
            }

            $rows = $query->select($select)->get();

            foreach ($rows as $row) {
                $name = trim((string) ($row->store_name ?? ''));
                $rawKey = $hasStoreKey
                    ? trim((string) ($row->store_key ?? ''))
                    : trim((string) ($row->store_code ?? ''));
                $key = $this->normalizeStoreKey($rawKey !== '' ? $rawKey : $name);

                if ($key === '' || isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;

                $stores[] = [
                    'name' => $name !== '' ? $name : strtoupper($rawKey ?: $key),
                    'key' => $key,
                    'column' => $hasOnHandTable && Schema::hasColumn('uae_store_on_hand_raw', $key) ? $key : null,
                ];
            }
        }

        // Always include the known UAE sub-store headers for consistent export template.
        foreach ($defaultStoreNames as $name) {
            $key = $this->normalizeStoreKey($name);
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $stores[] = [
                'name' => $name,
                'key' => $key,
                'column' => $hasOnHandTable && Schema::hasColumn('uae_store_on_hand_raw', $key) ? $key : null,
            ];
        }

        // Include any extra store codes found in raw inventory rows.
        if ($hasOnHandTable && Schema::hasColumn('uae_store_on_hand_raw', 'store_code')) {
            $extraCodes = DB::table('uae_store_on_hand_raw')
                ->select('store_code')
                ->whereNotNull('store_code')
                ->where('store_code', '!=', '')
                ->distinct()
                ->orderBy('store_code')
                ->pluck('store_code')
                ->all();

            foreach ($extraCodes as $code) {
                $key = $this->normalizeStoreKey($code);
                if ($key === '' || isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;

                $stores[] = [
                    'name' => $defaultNameMap[$key] ?? strtoupper(str_replace('_', ' ', $key)),
                    'key' => $key,
                    'column' => Schema::hasColumn('uae_store_on_hand_raw', $key) ? $key : null,
                ];
            }
        }

        return $stores;
    }

    private function buildSkuStoreQuantityRows($products): array
    {
        $stores = $this->resolveStoreExportColumns();
        $skuList = [];

        foreach ($products as $product) {
            $variants = $product->variants ?? collect();
            if ($variants->isNotEmpty()) {
                foreach ($variants as $variant) {
                    $sku = trim((string) ($variant->sku ?? ''));
                    if ($sku !== '') {
                        $skuList[] = $sku;
                    }
                }
                continue;
            }

            $sku = trim((string) ($product->sku ?? ''));
            if ($sku !== '') {
                $skuList[] = $sku;
            }
        }

        $skuList = array_values(array_unique($skuList));
        $storeValuesBySku = [];

        if (!empty($skuList) && Schema::hasTable('uae_store_on_hand_raw')) {
            $storeColumns = array_values(array_unique(array_filter(array_map(
                fn($store) => $store['column'] ?? null,
                $stores
            ))));

            if (!empty($storeColumns)) {
                $select = array_merge(['sku'], $storeColumns);
                $rawRows = DB::table('uae_store_on_hand_raw')
                    ->select($select)
                    ->whereIn('sku', $skuList)
                    ->get();

                foreach ($rawRows as $rawRow) {
                    $sku = trim((string) ($rawRow->sku ?? ''));
                    if ($sku === '') {
                        continue;
                    }

                    foreach ($stores as $store) {
                        $column = $store['column'];
                        $qty = 0;
                        if ($column && isset($rawRow->{$column}) && is_numeric($rawRow->{$column})) {
                            $qty = (int) $rawRow->{$column};
                        }
                        $storeValuesBySku[$sku][$store['key']] = $qty;
                    }
                }
            } elseif (Schema::hasColumn('uae_store_on_hand_raw', 'store_code') && Schema::hasColumn('uae_store_on_hand_raw', 'quantity')) {
                $rawRows = DB::table('uae_store_on_hand_raw')
                    ->select(['sku', 'store_code', 'quantity'])
                    ->whereIn('sku', $skuList)
                    ->get();

                foreach ($rawRows as $rawRow) {
                    $sku = trim((string) ($rawRow->sku ?? ''));
                    if ($sku === '') {
                        continue;
                    }

                    $storeKey = $this->normalizeStoreKey($rawRow->store_code ?? '');
                    if ($storeKey === '') {
                        continue;
                    }

                    $storeValuesBySku[$sku][$storeKey] = (int) ($rawRow->quantity ?? 0);
                }
            }
        }

        $rows = [];
        foreach ($skuList as $sku) {
            $row = ['sku' => $sku];
            foreach ($stores as $store) {
                $row[$store['name']] = (int) ($storeValuesBySku[$sku][$store['key']] ?? 0);
            }
            $rows[] = $row;
        }

        return [
            'stores' => $stores,
            'rows' => $rows,
        ];
    }

    private function newSellTemplateHeaders(): array
    {
        return [
            'Article',
            'SKU',
            'Color',
            'Size',
            'Inventory',
            'Price',
            'Category',
            'ar_category',
            'Image',
            'Title',
            'ar_title',
            'Short_description',
            'short_description_ar',
            'Description',
            'ar_description',
            'Weight (kg)',
            'Tags',
            'Published',
            'Brand',
            'Store',
        ];
    }

    private function resolveStoreNameMap(): array
    {
        if (!Schema::hasTable('uae_store_priority')) {
            return [];
        }

        $codeColumn = Schema::hasColumn('uae_store_priority', 'store_key')
            ? 'store_key'
            : (Schema::hasColumn('uae_store_priority', 'store_code') ? 'store_code' : null);

        return DB::table('uae_store_priority')
            ->get()
            ->mapWithKeys(function ($store) use ($codeColumn) {
                $id = (int) ($store->id ?? 0);
                $name = trim((string) ($store->store_name ?? ''));
                $code = $codeColumn ? trim((string) ($store->{$codeColumn} ?? '')) : '';
                $display = $name !== '' ? $name : ($code !== '' ? $code : (string) $id);

                return $id > 0 ? [$id => $display] : [];
            })
            ->all();
    }

    private function extractVariantSizeColor(ProductVariant $variant): array
    {
        $size = '';
        $color = '';

        foreach ($variant->attributeValues ?? [] as $attributeValue) {
            $attributeSlug = strtolower(trim((string) ($attributeValue->attribute->slug ?? '')));
            $attributeName = strtolower(trim((string) ($attributeValue->attribute->name ?? '')));
            $value = trim((string) ($attributeValue->value ?? ''));

            if ($value === '') {
                continue;
            }

            if ($size === '' && in_array($attributeSlug, ['size'], true)) {
                $size = $value;
                continue;
            }

            if ($color === '' && in_array($attributeSlug, ['color', 'colour'], true)) {
                $color = $value;
                continue;
            }

            if ($size === '' && str_contains($attributeName, 'size')) {
                $size = $value;
                continue;
            }

            if ($color === '' && (str_contains($attributeName, 'color') || str_contains($attributeName, 'colour'))) {
                $color = $value;
            }
        }

        return ['size' => $size, 'color' => $color];
    }

    private function buildFullItemsExportRows($products): array
    {
        $rows = [];
        $storeMap = $this->resolveStoreNameMap();

        foreach ($products as $product) {
            $categories = $product->categories->pluck('name')->filter()->implode('|');
            $categoriesAr = $product->categories->pluck('name_ar')->filter()->implode('|');
            $tags = $product->tags->pluck('name')->filter()->implode('|');
            $imageUrls = $product->images
                ->map(fn($img) => $img->image_url)
                ->filter()
                ->unique()
                ->values()
                ->implode(',');

            if ($imageUrls === '' && !empty($product->primary_image)) {
                $imageUrls = (string) $product->primary_image;
            }

            $base = [
                'Article' => (string) ($product->sku ?? ''),
                'Category' => $categories,
                'ar_category' => $categoriesAr,
                'Image' => $imageUrls,
                'Title' => (string) ($product->name ?? ''),
                'ar_title' => (string) ($product->name_ar ?? ''),
                'Short_description' => (string) ($product->short_description ?? ''),
                'short_description_ar' => (string) ($product->short_description_ar ?? ''),
                'Description' => trim(strip_tags((string) ($product->description ?? ''))),
                'ar_description' => trim(strip_tags((string) ($product->description_ar ?? ''))),
                'Weight (kg)' => $product->weight !== null ? (string) $product->weight : '',
                'Tags' => $tags,
                'Published' => $product->is_active ? 'true' : 'false',
                'Brand' => (string) ($product->brand->name ?? ''),
                'Store' => (string) ($storeMap[(int) ($product->store_id ?? 0)] ?? ($product->store_id ?? '')),
            ];

            $variants = $product->variants ?? collect();
            $parentInventory = $variants->isNotEmpty()
                ? (int) $variants->sum('stock_quantity')
                : (int) ($product->stock_quantity ?? 0);

            $rows[] = array_merge($base, [
                'SKU' => '',
                'Color' => '',
                'Size' => '',
                'Inventory' => $parentInventory,
                'Price' => $product->price !== null ? (float) $product->price : '',
            ]);

            foreach ($variants as $variant) {
                $meta = $this->extractVariantSizeColor($variant);

                $rows[] = array_merge($base, [
                    'SKU' => (string) ($variant->sku ?? ''),
                    'Color' => $meta['color'],
                    'Size' => $meta['size'],
                    'Inventory' => (int) ($variant->stock_quantity ?? 0),
                    'Price' => $variant->price !== null ? (float) $variant->price : (float) ($product->price ?? 0),
                ]);
            }
        }

        return $rows;
    }

    private function buildDefaultProductCsvResponse($products, string $filename, int $missingCount = 0)
    {
        $escapeCsv = static fn($value): string => '"' . str_replace('"', '""', (string) ($value ?? '')) . '"';

        $csv = "sku,name,description,price,sale_price,stock_quantity,category\n";
        foreach ($products as $product) {
            $categories = $product->categories->pluck('name')->implode('|');
            $csv .= implode(',', [
                $escapeCsv($product->sku),
                $escapeCsv($product->name),
                $escapeCsv($product->description ?? ''),
                $product->price,
                $product->sale_price ?? '',
                $product->stock_quantity,
                $escapeCsv($categories),
            ]) . "\n";
        }

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        if ($missingCount > 0) {
            $headers['X-Export-Missing-Count'] = $missingCount;
        }

        return response($csv, 200, $headers);
    }

    public function export(Request $request)
    {
        $exportType = $this->normalizeProductExportType($request);

        $relations = ['categories', 'tags', 'countries', 'variants'];
        if ($exportType === 'full_items') {
            $relations = [
                'categories',
                'tags',
                'countries',
                'images',
                'brand',
                'variants',
                'variants.attributeValues.attribute',
            ];
        }

        $query = Product::with($relations);
        $this->applyProductExportFilters($query, $request);
        $query->orderBy('created_at', 'desc');

        $products = $query->get();
        $escapeCsv = static fn($value): string => '"' . str_replace('"', '""', (string) ($value ?? '')) . '"';

        if ($exportType === 'quantity' || $exportType === 'prices') {
            if ($exportType === 'quantity') {
                $quantityData = $this->buildSkuStoreQuantityRows($products);
                $headers = array_merge(
                    ['sku'],
                    array_map(fn($store) => $store['name'], $quantityData['stores'])
                );

                $csv = implode(',', array_map($escapeCsv, $headers)) . "\n";
                foreach ($quantityData['rows'] as $row) {
                    $csv .= implode(',', array_map(
                        fn($header) => $escapeCsv($row[$header] ?? ''),
                        $headers
                    )) . "\n";
                }

                $filename = 'products_quantity_export_' . date('Y-m-d_His') . '.csv';
                return response($csv, 200, [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                ]);
            }

            $rows = $this->buildVariantExportRows($products, $exportType);

            $csv = "variant_sku,regular_price,sale_price\n";
            foreach ($rows as $row) {
                $csv .= implode(',', [
                    $escapeCsv($row['sku']),
                    $row['price'],
                    $row['sale_price'] ?? '',
                ]) . "\n";
            }

            $filename = 'products_' . $exportType . '_export_' . date('Y-m-d_His') . '.csv';
            return response($csv, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        }

        if ($exportType === 'full_items') {
            $headers = $this->newSellTemplateHeaders();
            $rows = $this->buildFullItemsExportRows($products);

            $csv = implode(',', array_map($escapeCsv, $headers)) . "\n";
            foreach ($rows as $row) {
                $csv .= implode(',', array_map(
                    fn($header) => $escapeCsv($row[$header] ?? ''),
                    $headers
                )) . "\n";
            }

            $filename = 'products_full_items_export_' . date('Y-m-d_His') . '.csv';
            return response($csv, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        }

        return $this->buildDefaultProductCsvResponse($products, 'products_export.csv');
    }

    public function exportSelected(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $ids = array_values(array_unique($validated['ids']));
        $products = Product::with(['categories'])
            ->whereIn('id', $ids)
            ->orderBy('created_at', 'desc')
            ->get();

        $foundIds = $products->pluck('id')->all();
        $missingCount = count(array_diff($ids, $foundIds));

        return $this->buildDefaultProductCsvResponse(
            $products,
            'products_export_selected.csv',
            $missingCount
        );
    }

    public function exportExcel(Request $request)
    {
        $query = Product::with([
            'categories',
            'tags',
            'images',
            'countries',
            'brand',
            'variants',
            'variants.attributeValues.attribute',
        ]);
        $this->applyProductExportFilters($query, $request);

        // Order by created_at desc
        $query->orderBy('created_at', 'desc');

        $products = $query->get();
        $exportType = $this->normalizeProductExportType($request);

        // Create spreadsheet
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(
            $exportType === 'full'
                ? 'Products'
                : ($exportType === 'full_items' ? 'Full Items' : 'Variant Export')
        );

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                ],
            ],
        ];
        $sheet->getRowDimension(1)->setRowHeight(25);

        $filenamePrefix = 'products_export';
        if ($exportType === 'quantity' || $exportType === 'prices') {
            if ($exportType === 'quantity') {
                $quantityData = $this->buildSkuStoreQuantityRows($products);
                $headerList = array_merge(
                    ['sku'],
                    array_map(fn($store) => $store['name'], $quantityData['stores'])
                );
                $lastColumn = Coordinate::stringFromColumnIndex(count($headerList));

                foreach ($headerList as $index => $header) {
                    $column = Coordinate::stringFromColumnIndex($index + 1);
                    $sheet->setCellValue($column . '1', $header);
                }
                $sheet->getStyle("A1:{$lastColumn}1")->applyFromArray($headerStyle);

                $row = 2;
                foreach ($quantityData['rows'] as $item) {
                    foreach ($headerList as $index => $header) {
                        $column = Coordinate::stringFromColumnIndex($index + 1);
                        $sheet->setCellValue($column . $row, $item[$header] ?? '');
                    }
                    $row++;
                }

                for ($i = 1; $i <= count($headerList); $i++) {
                    $column = Coordinate::stringFromColumnIndex($i);
                    $sheet->getColumnDimension($column)->setAutoSize(true);
                }

                if ($row > 2) {
                    $dataStyle = [
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => Border::BORDER_THIN,
                            ],
                        ],
                    ];
                    $sheet->getStyle("A2:{$lastColumn}" . ($row - 1))->applyFromArray($dataStyle);
                }
            } else {
                $headers = ['A1' => 'Variant SKU', 'B1' => 'Regular Price', 'C1' => 'Sale Price'];

                foreach ($headers as $cell => $value) {
                    $sheet->setCellValue($cell, $value);
                }

                $lastColumn = 'C';
                $sheet->getStyle("A1:{$lastColumn}1")->applyFromArray($headerStyle);

                $rows = $this->buildVariantExportRows($products, $exportType);
                $row = 2;
                foreach ($rows as $item) {
                    $sheet->setCellValue('A' . $row, $item['sku']);
                    $sheet->setCellValue('B' . $row, $item['price']);
                    $sheet->setCellValue('C' . $row, $item['sale_price'] ?? '');
                    $row++;
                }

                foreach (range('A', $lastColumn) as $col) {
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                }

                if ($row > 2) {
                    $dataStyle = [
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => Border::BORDER_THIN,
                            ],
                        ],
                    ];
                    $sheet->getStyle("A2:{$lastColumn}" . ($row - 1))->applyFromArray($dataStyle);
                }
            }

            $filenamePrefix = 'products_' . $exportType . '_export';
        } elseif ($exportType === 'full_items') {
            $headers = $this->newSellTemplateHeaders();
            $rows = $this->buildFullItemsExportRows($products);
            $lastColumn = Coordinate::stringFromColumnIndex(count($headers));

            foreach ($headers as $index => $value) {
                $column = Coordinate::stringFromColumnIndex($index + 1);
                $sheet->setCellValue($column . '1', $value);
            }

            $sheet->getStyle("A1:{$lastColumn}1")->applyFromArray($headerStyle);

            $row = 2;
            foreach ($rows as $item) {
                foreach ($headers as $index => $header) {
                    $column = Coordinate::stringFromColumnIndex($index + 1);
                    $sheet->setCellValue($column . $row, $item[$header] ?? '');
                }
                $row++;
            }

            for ($i = 1; $i <= count($headers); $i++) {
                $column = Coordinate::stringFromColumnIndex($i);
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }

            if ($row > 2) {
                $dataStyle = [
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                        ],
                    ],
                ];
                $sheet->getStyle("A2:{$lastColumn}" . ($row - 1))->applyFromArray($dataStyle);
            }

            $filenamePrefix = 'products_full_items_export';
        } else {
            $headers = [
                'A1' => 'SKU',
                'B1' => 'Name',
                'C1' => 'Name (Arabic)',
                'D1' => 'Description',
                'E1' => 'Price',
                'F1' => 'Sale Price',
                'G1' => 'Stock Quantity',
                'H1' => 'Stock Status',
                'I1' => 'Categories',
                'J1' => 'Tags',
                'K1' => 'Status',
                'L1' => 'Created At',
                'M1' => 'Main Image URL',
            ];

            foreach ($headers as $cell => $value) {
                $sheet->setCellValue($cell, $value);
            }

            $sheet->getStyle('A1:M1')->applyFromArray($headerStyle);

            $row = 2;
            foreach ($products as $product) {
                $categories = $product->categories->pluck('name')->implode(', ');
                $tags = $product->tags->pluck('name')->implode(', ');
                $primaryImage = $product->images->where('is_primary', true)->first() ?? $product->images->first();
                $imageUrl = $primaryImage ? $primaryImage->image_url : '';

                $sheet->setCellValue('A' . $row, $product->sku);
                $sheet->setCellValue('B' . $row, $product->name);
                $sheet->setCellValue('C' . $row, $product->name_ar ?? '');
                $sheet->setCellValue('D' . $row, strip_tags($product->description ?? ''));
                $sheet->setCellValue('E' . $row, $product->price);
                $sheet->setCellValue('F' . $row, $product->sale_price ?? '');
                $sheet->setCellValue('G' . $row, $product->stock_quantity);
                $sheet->setCellValue('H' . $row, $product->stock_status);
                $sheet->setCellValue('I' . $row, $categories);
                $sheet->setCellValue('J' . $row, $tags);
                $sheet->setCellValue('K' . $row, $product->is_active ? 'Active' : 'Inactive');
                $sheet->setCellValue('L' . $row, $product->created_at ? $product->created_at->format('Y-m-d H:i') : '');
                $sheet->setCellValue('M' . $row, $imageUrl);

                $row++;
            }

            foreach (range('A', 'M') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            if ($row > 2) {
                $dataStyle = [
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                        ],
                    ],
                ];
                $sheet->getStyle('A2:M' . ($row - 1))->applyFromArray($dataStyle);
            }
        }

        // Create the file
        $writer = new Xlsx($spreadsheet);
        $filename = $filenamePrefix . '_' . date('Y-m-d_His') . '.xlsx';
        $tempPath = storage_path('app/temp/' . $filename);

        // Ensure temp directory exists
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $writer->save($tempPath);

        // Return file download
        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    public function show($id)
    {
        $product = Product::with([
            'categories',
            'images',
            'variants.attributeValues.attribute',
            'tags',
            'countries',
            'brand',
            'relatedProducts',
            'crossSellProducts',
            'upsellProducts',
        ])->findOrFail($id);

        return $this->success($product);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'sku' => 'required|string|max:100|unique:products,sku',
            'type' => 'nullable|string|in:simple,variable,classified',
            'short_description' => 'nullable|string|max:500',
            'short_description_ar' => 'nullable|string|max:500',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'is_sale_enable' => 'nullable|boolean',
            'sale_starts_at' => 'nullable|date',
            'sale_expired_at' => 'nullable|date',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'min_stock_alert' => 'nullable|integer|min:0',
            'weight' => 'nullable|numeric|min:0',
            'weight_unit' => 'nullable|string|max:10',
            'unit' => 'nullable|string|max:50',
            'brand_id' => 'nullable|exists:brands,id',
            'is_active' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'is_random_related_products' => 'nullable|boolean',
            'is_digital' => 'nullable|boolean',
            'is_free_shipping' => 'nullable|boolean',
            'estimated_delivery_text' => 'nullable|string|max:255',
            'is_return' => 'nullable|boolean',
            'return_policy_text' => 'nullable|string',
            'manage_stock' => 'nullable|boolean',
            'safe_checkout' => 'nullable|boolean',
            'secure_checkout' => 'nullable|boolean',
            'social_share' => 'nullable|boolean',
            'encourage_order' => 'nullable|boolean',
            'encourage_view' => 'nullable|boolean',
            'is_trending' => 'nullable|boolean',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'size_chart_image_id' => 'nullable|integer',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'exists:categories,id',
            'country_ids' => 'nullable|array',
            'country_ids.*' => 'exists:countries,id',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
            'related_product_ids' => 'nullable|array',
            'related_product_ids.*' => 'exists:products,id',
            'cross_sell_product_ids' => 'nullable|array',
            'cross_sell_product_ids.*' => 'exists:products,id',
            'upsell_product_ids' => 'nullable|array',
            'upsell_product_ids.*' => 'exists:products,id',
        ]);

        if (!array_key_exists('is_active', $validated) && $request->has('status')) {
            $validated['is_active'] = $this->isTruthyPublishStatus($request->input('status'));
        }
        if (!array_key_exists('is_active', $validated)) {
            $validated['is_active'] = false;
        }

        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
        $validated['stock_status'] = $validated['stock_quantity'] > 0 ? 'in_stock' : 'out_of_stock';
        $shouldBePublished = $this->shouldBePublished($validated);
        $product = null;

        DB::beginTransaction();
        try {
            $product = Product::create($validated);

            // Attach categories
            if (isset($validated['category_ids'])) {
                $product->categories()->sync($validated['category_ids']);
            }

            // Attach countries
            if (isset($validated['country_ids'])) {
                $product->countries()->sync($validated['country_ids']);
            }

            // Attach tags
            if (isset($validated['tag_ids'])) {
                $product->tags()->sync($validated['tag_ids']);
            }

            // Handle related products
            $this->syncRelatedProducts($product, $request);

            // Handle product images from attachments
            $this->syncProductImages($product, $request);

            // Handle variations during creation
            if ($request->has('variations')) {
                $this->syncVariations($product, $request->input('variations'));
            }

            if ($shouldBePublished) {
                $validation = $this->getPublishValidation($product->fresh());
                if (!$validation['valid']) {
                    DB::rollBack();
                    return $this->publishValidationErrorResponse($validation['errors']);
                }
            }

            app(PriceResolver::class)->refreshCachedPrices($product);

            DB::commit();
            $this->refreshStorefrontProductCaches($product->fresh());
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return $this->success(
            $product->fresh()->load(['categories', 'countries', 'tags', 'brand', 'images', 'variants.attributeValues.attribute']),
            'Product created successfully',
            201
        );
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'sku' => 'sometimes|string|max:100|unique:products,sku,' . $id,
            'type' => 'nullable|string|in:simple,variable,classified',
            'short_description' => 'nullable|string|max:500',
            'short_description_ar' => 'nullable|string|max:500',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'is_sale_enable' => 'nullable|boolean',
            'sale_starts_at' => 'nullable|date',
            'sale_expired_at' => 'nullable|date',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'min_stock_alert' => 'nullable|integer|min:0',
            'weight' => 'nullable|numeric|min:0',
            'weight_unit' => 'nullable|string|max:10',
            'unit' => 'nullable|string|max:50',
            'brand_id' => 'nullable|exists:brands,id',
            'is_active' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'is_random_related_products' => 'nullable|boolean',
            'is_digital' => 'nullable|boolean',
            'is_free_shipping' => 'nullable|boolean',
            'estimated_delivery_text' => 'nullable|string|max:255',
            'is_return' => 'nullable|boolean',
            'return_policy_text' => 'nullable|string',
            'manage_stock' => 'nullable|boolean',
            'safe_checkout' => 'nullable|boolean',
            'secure_checkout' => 'nullable|boolean',
            'social_share' => 'nullable|boolean',
            'encourage_order' => 'nullable|boolean',
            'encourage_view' => 'nullable|boolean',
            'is_trending' => 'nullable|boolean',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'size_chart_image_id' => 'nullable|integer',
            'category_ids' => 'nullable|array',
            'country_ids' => 'nullable|array',
            'tag_ids' => 'nullable|array',
            'related_product_ids' => 'nullable|array',
            'cross_sell_product_ids' => 'nullable|array',
            'upsell_product_ids' => 'nullable|array',
        ]);

        if (isset($validated['stock_quantity'])) {
            $validated['stock_status'] = $validated['stock_quantity'] > 0 ? 'in_stock' : 'out_of_stock';
        }
        if (!array_key_exists('is_active', $validated) && $request->has('status')) {
            $validated['is_active'] = $this->isTruthyPublishStatus($request->input('status'));
        }
        $shouldBePublished = $this->shouldBePublished($validated, $product);

        DB::beginTransaction();
        try {
            $product->update($validated);

            if (isset($validated['category_ids'])) {
                $product->categories()->sync($validated['category_ids']);
            }

            if (isset($validated['country_ids'])) {
                $product->countries()->sync($validated['country_ids']);
            }

            if (isset($validated['tag_ids'])) {
                $product->tags()->sync($validated['tag_ids']);
            }

            // Handle related products
            $this->syncRelatedProducts($product, $request);

            // Handle product images from attachments
            $this->syncProductImages($product, $request);

            // Handle deleted variants first
            if ($request->has('deleted_variant_ids') && is_array($request->input('deleted_variant_ids'))) {
                $deletedIds = $request->input('deleted_variant_ids');
                if (!empty($deletedIds)) {
                    // Only delete variants that belong to this product
                    ProductVariant::where('product_id', $product->id)
                        ->whereIn('id', $deletedIds)
                        ->delete();
                }
            }

            // Handle variations update
            if ($request->has('variations')) {
                $this->syncVariations($product, $request->input('variations'));
            }

            if ($shouldBePublished) {
                $validation = $this->getPublishValidation($product->fresh());
                if (!$validation['valid']) {
                    DB::rollBack();
                    return $this->publishValidationErrorResponse($validation['errors']);
                }
            }

            app(PriceResolver::class)->refreshCachedPrices($product);

            DB::commit();
            $this->refreshStorefrontProductCaches($product->fresh());
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return $this->success(
            $product->fresh()->load(['categories', 'countries', 'tags', 'images', 'brand', 'relatedProducts', 'crossSellProducts', 'upsellProducts', 'variants.attributeValues.attribute']),
            'Product updated successfully'
        );
    }

    public function reorderGalleries(Request $request, $productId)
    {
        if (
            !Schema::hasColumn('products', 'product_thumbnail_id')
            || !Schema::hasColumn('products', 'product_galleries_id')
        ) {
            return $this->error('Gallery reorder is not available on this database schema.', 422);
        }

        $validated = $request->validate([
            'ordered_ids' => 'required|array|min:1',
            'ordered_ids.*' => 'required',
        ]);

        $orderedIds = [];
        foreach ($validated['ordered_ids'] as $rawId) {
            if (!is_numeric($rawId)) {
                return $this->error('All gallery IDs must be numeric.', 422, ['ordered_ids' => ['Gallery IDs must be numeric.']]);
            }

            $orderedIds[] = (int) $rawId;
        }

        if (count($orderedIds) !== count(array_unique($orderedIds))) {
            return $this->error('ordered_ids contains duplicate values.', 422, ['ordered_ids' => ['Gallery IDs must be unique.']]);
        }

        $product = Product::with([
            'images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
        ])->findOrFail($productId);

        $currentGalleryIds = $this->normalizeGalleryIdList($product->getRawOriginal('product_galleries_id'));
        if (empty($currentGalleryIds) && $product->images->isNotEmpty()) {
            // Backfill linked gallery IDs for older rows before validating reorder.
            $this->syncProductImageLinks($product, $product->images->pluck('image')->all());
            $product->refresh()->load([
                'images' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ]);
            $currentGalleryIds = $this->normalizeGalleryIdList($product->getRawOriginal('product_galleries_id'));
        }

        if (empty($currentGalleryIds)) {
            return $this->error('This product has no gallery images to reorder.', 422);
        }

        if (count($orderedIds) !== count($currentGalleryIds)) {
            return $this->error('ordered_ids count must match current gallery image count.', 422, [
                'expected_count' => count($currentGalleryIds),
                'received_count' => count($orderedIds),
            ]);
        }

        $currentSorted = $currentGalleryIds;
        $orderedSorted = $orderedIds;
        sort($currentSorted);
        sort($orderedSorted);
        if ($currentSorted !== $orderedSorted) {
            $invalidIds = array_values(array_diff($orderedIds, $currentGalleryIds));
            return $this->error('One or more gallery IDs do not belong to this product.', 422, [
                'invalid_ids' => $invalidIds,
            ]);
        }

        DB::beginTransaction();
        try {
            $currentIdToIndexes = [];
            foreach ($currentGalleryIds as $index => $galleryId) {
                $key = (string) $galleryId;
                if (!isset($currentIdToIndexes[$key])) {
                    $currentIdToIndexes[$key] = [];
                }
                $currentIdToIndexes[$key][] = $index;
            }

            $imageModels = $product->images->values();
            $orderedImageModels = collect();

            foreach ($orderedIds as $galleryId) {
                $key = (string) $galleryId;
                $sourceIndex = array_shift($currentIdToIndexes[$key]);
                if ($sourceIndex === null) {
                    continue;
                }

                $mappedImage = $imageModels->get($sourceIndex);
                if ($mappedImage) {
                    $orderedImageModels->push($mappedImage);
                }
            }

            $orderedImageIds = $orderedImageModels->pluck('id')->all();
            $remainingImages = $imageModels->filter(
                fn ($image) => !in_array($image->id, $orderedImageIds, true)
            );

            $finalImageOrder = $orderedImageModels->concat($remainingImages)->values();
            foreach ($finalImageOrder as $index => $imageModel) {
                $imageModel->update([
                    'sort_order' => $index,
                    'is_primary' => $index === 0,
                ]);
            }

            $product->forceFill([
                'product_thumbnail_id' => $orderedIds[0] ?? null,
                'product_galleries_id' => $orderedIds,
            ])->save();

            $this->refreshStorefrontProductCaches($product->fresh());

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return $this->success([
            'product_id' => (int) $product->id,
            'ordered_ids' => $orderedIds,
        ], 'Gallery images reordered successfully.');
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return $this->success(null, 'Product moved to trash successfully');
    }

    public function restore($id)
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $product->restore();

        return $this->success($product, 'Product restored successfully');
    }

    public function forceDestroy($id)
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $product->forceDelete();

        return $this->success(null, 'Product permanently deleted');
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:products,id',
        ]);

        Product::whereIn('id', $validated['ids'])->delete();

        return $this->success(null, 'Products deleted successfully');
    }

    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:products,id',
            'is_active' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'category_ids' => 'nullable|array',
            'country_ids' => 'nullable|array',
        ]);

        $updateData = array_filter([
            'is_active' => $validated['is_active'] ?? null,
            'is_featured' => $validated['is_featured'] ?? null,
        ], fn($v) => $v !== null);

        if (!empty($updateData)) {
            Product::whereIn('id', $validated['ids'])->update($updateData);
        }

        if (isset($validated['category_ids'])) {
            foreach ($validated['ids'] as $id) {
                Product::find($id)->categories()->sync($validated['category_ids']);
            }
        }

        if (isset($validated['country_ids'])) {
            foreach ($validated['ids'] as $id) {
                Product::find($id)->countries()->sync($validated['country_ids']);
            }
        }

        return $this->success(null, 'Products updated successfully');
    }

    public function uploadImage(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'is_primary' => 'nullable|boolean',
        ]);

        $path = $request->file('image')->store('products', 'public');

        if ($request->boolean('is_primary')) {
            $product->images()->update(['is_primary' => false]);
        }

        $image = $product->images()->create([
            'image' => $path,
            'is_primary' => $request->boolean('is_primary') || $product->images()->count() === 0,
            'sort_order' => $product->images()->count(),
        ]);

        return $this->success($image, 'Image uploaded successfully', 201);
    }

    public function deleteImage($productId, $imageId)
    {
        $product = Product::findOrFail($productId);
        $image = $product->images()->findOrFail($imageId);

        Storage::disk('public')->delete($image->image);
        $image->delete();

        return $this->success(null, 'Image deleted successfully');
    }

    // Variants
    public function storeVariant(Request $request, $productId)
    {
        $product = Product::findOrFail($productId);

        $validated = $request->validate([
            'sku' => 'required|string|max:100|unique:product_variants,sku',
            'price' => 'nullable|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'attribute_value_ids' => 'required|array',
            'attribute_value_ids.*' => 'exists:attribute_values,id',
        ]);

        $variant = $product->variants()->create([
            'sku' => $validated['sku'],
            'price' => $validated['price'],
            'sale_price' => $validated['sale_price'],
            'stock_quantity' => $validated['stock_quantity'],
            'is_active' => true,
        ]);

        $variant->attributeValues()->sync($validated['attribute_value_ids']);

        app(PriceResolver::class)->refreshCachedPrices($product);
        $this->refreshStorefrontProductCaches($product->fresh());

        return $this->success($variant->load('attributeValues.attribute'), 'Variant created successfully', 201);
    }

    public function updateVariant(Request $request, $productId, $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);

        $validated = $request->validate([
            'sku' => 'sometimes|string|max:100|unique:product_variants,sku,' . $variantId,
            'price' => 'nullable|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'is_active' => 'nullable|boolean',
            'attribute_value_ids' => 'nullable|array',
        ]);

        $variant->update($validated);

        if (isset($validated['attribute_value_ids'])) {
            $variant->attributeValues()->sync($validated['attribute_value_ids']);
        }

        app(PriceResolver::class)->refreshCachedPrices($variant->product);
        $this->refreshStorefrontProductCaches($variant->product->fresh());

        return $this->success($variant->fresh()->load('attributeValues.attribute'), 'Variant updated successfully');
    }

    public function deleteVariant($productId, $variantId)
    {
        $variant = ProductVariant::where('product_id', $productId)->findOrFail($variantId);
        $variant->delete();

        app(PriceResolver::class)->refreshCachedPrices($variant->product);
        $this->refreshStorefrontProductCaches($variant->product->fresh());

        return $this->success(null, 'Variant deleted successfully');
    }

    protected function shouldBePublished(array $validated, ?Product $existingProduct = null): bool
    {
        if (array_key_exists('is_active', $validated)) {
            return (bool) $validated['is_active'];
        }

        if ($existingProduct) {
            return (bool) $existingProduct->is_active;
        }

        return false;
    }

    protected function isTruthyPublishStatus($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value === 1;
        }

        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['1', 'true', 'active', 'published', 'yes', 'on'], true);
    }

    protected function getPublishValidation(Product $product): array
    {
        return app(ProductPublishValidator::class)->validate($product);
    }

    protected function publishValidationErrorResponse(array $errors)
    {
        return $this->error(
            'Product cannot be published. Missing required fields.',
            422,
            $errors
        );
    }

    /**
     * Sync related, cross-sell, and upsell products
     */
    protected function syncRelatedProducts(Product $product, Request $request)
    {
        // Sync related products
        if ($request->has('related_product_ids')) {
            $relatedIds = $request->input('related_product_ids', []);
            $product->relatedProducts()->detach();
            foreach ($relatedIds as $relatedId) {
                if ($relatedId != $product->id) {
                    \DB::table('product_relations')->insert([
                        'product_id' => $product->id,
                        'related_product_id' => $relatedId,
                        'type' => 'related',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // Sync cross-sell products
        if ($request->has('cross_sell_product_ids')) {
            $crossSellIds = $request->input('cross_sell_product_ids', []);
            $product->crossSellProducts()->detach();
            foreach ($crossSellIds as $crossSellId) {
                if ($crossSellId != $product->id) {
                    \DB::table('product_relations')->insert([
                        'product_id' => $product->id,
                        'related_product_id' => $crossSellId,
                        'type' => 'cross_sell',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // Sync upsell products
        if ($request->has('upsell_product_ids')) {
            $upsellIds = $request->input('upsell_product_ids', []);
            $product->upsellProducts()->detach();
            foreach ($upsellIds as $upsellId) {
                if ($upsellId != $product->id) {
                    \DB::table('product_relations')->insert([
                        'product_id' => $product->id,
                        'related_product_id' => $upsellId,
                        'type' => 'upsell',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    /**
     * Sync product images from attachment IDs
     */
    protected function syncProductImages(Product $product, Request $request)
    {
        if (!$request->has('product_thumbnail_id') && !$request->has('product_galleries_id')) {
            return;
        }

        $thumbnailReference = $request->input('product_thumbnail_id');
        $galleryReferences = $request->input('product_galleries_id', []);
        if (!is_array($galleryReferences)) {
            $galleryReferences = [$galleryReferences];
        }

        $attachmentPathMap = $this->buildAttachmentPathMap();
        $resolvedThumbnail = $this->resolveImageReference($thumbnailReference, $attachmentPathMap);
        $resolvedGallery = [];

        foreach ($galleryReferences as $galleryReference) {
            $resolved = $this->resolveImageReference($galleryReference, $attachmentPathMap);
            if ($resolved !== null && !in_array($resolved, $resolvedGallery, true)) {
                $resolvedGallery[] = $resolved;
            }
        }

        $orderedImages = [];
        if ($resolvedThumbnail !== null) {
            $orderedImages[] = $resolvedThumbnail;
        }
        foreach ($resolvedGallery as $resolvedImage) {
            if (!in_array($resolvedImage, $orderedImages, true)) {
                $orderedImages[] = $resolvedImage;
            }
        }

        if (!empty($orderedImages)) {
            $product->images()->update(['is_primary' => false]);

            foreach ($orderedImages as $sortOrder => $imagePath) {
                $existingImage = $product->images()->where('image', $imagePath)->first();

                if ($existingImage) {
                    $existingImage->update([
                        'is_primary' => $sortOrder === 0,
                        'sort_order' => $sortOrder,
                    ]);
                    continue;
                }

                ProductImage::create([
                    'product_id' => $product->id,
                    'image' => $imagePath,
                    'is_primary' => $sortOrder === 0,
                    'sort_order' => $sortOrder,
                ]);
            }
        }

        $this->syncProductImageLinks($product, $orderedImages);
    }

    protected function normalizeGalleryIdList(mixed $value): array
    {
        if (is_array($value)) {
            $raw = $value;
        } elseif (is_string($value)) {
            $decoded = json_decode($value, true);
            $raw = is_array($decoded) ? $decoded : [];
        } else {
            $raw = [];
        }

        $normalized = [];
        foreach ($raw as $item) {
            if (is_numeric($item)) {
                $normalized[] = (int) $item;
            }
        }

        return array_values($normalized);
    }

    protected function refreshStorefrontProductCaches(Product $product): void
    {
        Cache::forget("product_full_v3_{$product->id}");
        Cache::forget("product_variants_{$product->id}");
        Cache::forget("product_related_v3_{$product->id}_8");
        Cache::forget("product_full_{$product->id}");
        if (!empty($product->slug)) {
            Cache::forget("product_full_v3_{$product->slug}");
            Cache::forget("product_full_{$product->slug}");
        }

        $currentVersion = (int) Cache::get('products_list_version', 1);
        Cache::forever('products_list_version', max(1, $currentVersion + 1));
        Cache::forget('homepage_data_v2');
        app(ProductOfferService::class)->clearCache();
    }

    /**
     * @return array<string, string>
     */
    protected function buildAttachmentPathMap(): array
    {
        $map = [];

        foreach (Storage::disk('public')->files('attachments') as $file) {
            $this->registerAttachmentPathInMap($map, $file);
        }

        return $map;
    }

    protected function registerAttachmentPathInMap(array &$map, ?string $path): void
    {
        $normalized = $this->normalizeMediaValue($path);
        if ($normalized === null) {
            return;
        }

        $storagePath = MediaUrl::extractStoragePath($normalized);
        if ($storagePath !== null) {
            $normalized = $storagePath;
        }

        $normalized = ltrim(str_replace('\\', '/', $normalized), '/');
        if ($normalized === '') {
            return;
        }

        $map[md5($normalized)] = $normalized;
        $map[$normalized] = $normalized;
        $map[basename($normalized)] = $normalized;
    }

    /**
     * Resolve incoming media references from admin payload:
     * - numeric attachment IDs (DB table)
     * - md5 file IDs (legacy attachment picker)
     * - absolute URLs
     * - relative storage paths
     */
    protected function resolveImageReference(mixed $reference, array &$attachmentPathMap): ?string
    {
        $normalized = $this->normalizeMediaValue($reference);
        if ($normalized === null) {
            return null;
        }

        if (isset($attachmentPathMap[$normalized])) {
            return $attachmentPathMap[$normalized];
        }

        if (ctype_digit($normalized) && Schema::hasTable('attachments')) {
            $attachment = Attachment::query()->find((int) $normalized);
            if ($attachment) {
                $candidate = $this->normalizeMediaValue($attachment->path ?: $attachment->original_url);
                if ($candidate === null) {
                    return null;
                }

                if ($this->isAbsoluteHttpUrl($candidate)) {
                    $localized = $this->localizeExternalReference($candidate, $attachmentPathMap);
                    return $localized ?? $candidate;
                }

                $this->registerAttachmentPathInMap($attachmentPathMap, $candidate);
                $candidateStoragePath = MediaUrl::extractStoragePath($candidate);
                return $candidateStoragePath ?? $candidate;
            }
        }

        if (isset($attachmentPathMap[md5($normalized)])) {
            return $attachmentPathMap[md5($normalized)];
        }

        $storagePath = MediaUrl::extractStoragePath($normalized);
        if ($storagePath !== null) {
            if (isset($attachmentPathMap[$storagePath])) {
                return $attachmentPathMap[$storagePath];
            }

            return $storagePath;
        }

        if ($this->isAbsoluteHttpUrl($normalized)) {
            $localized = $this->localizeExternalReference($normalized, $attachmentPathMap);
            if ($localized !== null) {
                return $localized;
            }

            return $normalized;
        }

        if (str_contains($normalized, '/')) {
            return $normalized;
        }

        return null;
    }

    protected function localizeExternalReference(string $reference, array &$attachmentPathMap): ?string
    {
        $downloader = app(ExternalImageDownloader::class);
        try {
            $attachment = $downloader->downloadAndCreateAttachment($reference);
        } catch (\Throwable $e) {
            Log::warning('Product image localization failed', [
                'url' => $reference,
                'error' => $e->getMessage(),
            ]);
            return null;
        }

        if (!$attachment) {
            return null;
        }

        $path = $downloader->resolveAttachmentPath($attachment);
        if ($path === null) {
            $path = $this->extractStoragePath((string) ($attachment->path ?: $attachment->original_url));
        }

        if ($path === null) {
            return null;
        }

        $this->registerAttachmentPathInMap($attachmentPathMap, $path);
        return $path;
    }

    protected function syncProductImageLinks(Product $product, array $orderedImages): void
    {
        if (
            !Schema::hasColumn('products', 'product_thumbnail_id')
            || !Schema::hasColumn('products', 'product_galleries_id')
        ) {
            return;
        }

        $galleryIds = [];
        foreach ($orderedImages as $imagePath) {
            $attachmentId = $this->ensureAttachmentIdForMedia($imagePath);
            if ($attachmentId !== null && !in_array($attachmentId, $galleryIds, true)) {
                $galleryIds[] = $attachmentId;
            }
        }

        $thumbnailId = $galleryIds[0] ?? null;

        $currentThumbnail = $product->getRawOriginal('product_thumbnail_id');
        $currentGalleriesRaw = $product->getRawOriginal('product_galleries_id');
        $currentGalleries = is_string($currentGalleriesRaw)
            ? (json_decode($currentGalleriesRaw, true) ?: [])
            : (is_array($currentGalleriesRaw) ? $currentGalleriesRaw : []);

        if ((string) $currentThumbnail === (string) $thumbnailId && $currentGalleries === $galleryIds) {
            return;
        }

        $product->forceFill([
            'product_thumbnail_id' => $thumbnailId,
            'product_galleries_id' => $galleryIds,
        ])->save();
    }

    protected function ensureAttachmentIdForMedia(?string $media): ?int
    {
        $normalized = $this->normalizeMediaValue($media);
        if ($normalized === null || !Schema::hasTable('attachments')) {
            return null;
        }

        if ($this->isAbsoluteHttpUrl($normalized)) {
            $downloader = app(ExternalImageDownloader::class);
            try {
                $localizedAttachment = $downloader->downloadAndCreateAttachment($normalized);
            } catch (\Throwable $e) {
                Log::warning('Attachment localization failed for product media', [
                    'url' => $normalized,
                    'error' => $e->getMessage(),
                ]);
                $localizedAttachment = null;
            }

            if ($localizedAttachment) {
                return (int) $localizedAttachment->id;
            }
        }

        $storagePath = $this->extractStoragePath($normalized);
        $normalizedForStorage = $storagePath ?? $normalized;
        $hash = hash('sha256', $normalizedForStorage);

        $existingQuery = Attachment::query()
            ->select(['id'])
            ->where('url_hash', $hash)
            ->orWhere('original_url', $normalized)
            ->orWhere('path', $normalized);

        if ($storagePath !== null) {
            $existingQuery->orWhere('original_url', $storagePath)
                ->orWhere('path', $storagePath);
        }

        $existing = $existingQuery->first();

        if ($existing) {
            return (int) $existing->id;
        }

        $fileName = $this->extractMediaFileName($normalized);
        $isAbsolute = $this->isAbsoluteHttpUrl($normalized);
        $isLocalMedia = $storagePath !== null;

        $attachment = Attachment::query()->create([
            'name' => $fileName,
            'file_name' => $fileName,
            'path' => $storagePath,
            'original_url' => $normalizedForStorage,
            'url_hash' => $hash,
            'disk' => $isLocalMedia || !$isAbsolute ? 'public' : 'external',
            'source' => $isLocalMedia || !$isAbsolute ? 'local' : 'external',
            'mime_type' => $this->mimeTypeFromFileName($fileName),
        ]);

        return (int) $attachment->id;
    }

    protected function normalizeMediaValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            foreach (['original_url', 'url', 'image_url', 'path', 'image', 'id'] as $key) {
                if (array_key_exists($key, $value)) {
                    $value = $value[$key];
                    break;
                }
            }
        } elseif (is_object($value)) {
            foreach (['original_url', 'url', 'image_url', 'path', 'image', 'id'] as $property) {
                if (isset($value->{$property})) {
                    $value = $value->{$property};
                    break;
                }
            }
        }

        if (!is_string($value)) {
            if (!is_scalar($value)) {
                return null;
            }

            $value = (string) $value;
        }

        $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $normalizedExt = preg_replace_callback(
            '/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(?=($|[?#]))/i',
            static fn ($matches) => '.' . strtolower($matches[1]),
            $decoded
        );

        $trimmed = trim((string) $normalizedExt);

        return $trimmed === '' ? null : $trimmed;
    }

    protected function extractStoragePath(string $media): ?string
    {
        $path = MediaUrl::extractStoragePath($media);
        if ($path !== null) {
            return $path;
        }

        if ($this->isAbsoluteHttpUrl($media)) {
            return null;
        }

        $relative = ltrim(str_replace('\\', '/', $media), '/');
        return $relative !== '' ? $relative : null;
    }

    protected function extractMediaFileName(string $media): string
    {
        $path = parse_url($media, PHP_URL_PATH);
        $candidate = $path ? basename($path) : basename($media);
        $decoded = rawurldecode((string) $candidate);
        $clean = trim((string) preg_replace('/[\x00-\x1F\x7F]/', '', $decoded));

        if ($clean === '' || $clean === '.' || $clean === '..') {
            return 'media-' . substr(hash('sha1', $media), 0, 16);
        }

        return Str::limit($clean, 255, '');
    }

    protected function mimeTypeFromFileName(string $fileName): ?string
    {
        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        return match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            'bmp' => 'image/bmp',
            'avif' => 'image/avif',
            default => null,
        };
    }

    protected function isAbsoluteHttpUrl(string $value): bool
    {
        return (bool) preg_match('#^https?://#i', trim($value));
    }

    /**
     * Sync product variations
     */
    protected function syncVariations(Product $product, array $variations)
    {
        $existingVariantIds = $product->variants()->pluck('id')->toArray();
        $updatedVariantIds = [];
        $attachmentPathMap = $this->buildAttachmentPathMap();

        foreach ($variations as $index => $variationData) {
            $variantId = $variationData['id'] ?? null;
            $variantImage = $this->resolveImageReference(
                $this->extractVariantImageReference($variationData),
                $attachmentPathMap
            );

            $variantFields = [
                'name' => $variationData['name'] ?? null,
                'sku' => $variationData['sku'] ?? null,
                'price' => $variationData['price'] ?? 0,
                'sale_price' => $variationData['sale_price'] ?? null,
                'stock_quantity' => $variationData['stock_quantity'] ?? 0,
                'is_active' => $variationData['is_active'] ?? true,
                'image' => $variantImage,
            ];

            // Extract attribute value IDs helper
            $extractAttributeValueIds = function($attributeValues) {
                if (!is_array($attributeValues)) return [];
                $ids = array_map(function($v) {
                    if (is_numeric($v)) return (int) $v;
                    if (is_array($v) && isset($v['id'])) return (int) $v['id'];
                    if (is_object($v) && isset($v->id)) return (int) $v->id;
                    return null;
                }, $attributeValues);
                return array_filter($ids, fn($v) => $v !== null);
            };

            if ($variantId && in_array($variantId, $existingVariantIds)) {
                // Update existing variant
                $variant = ProductVariant::find($variantId);
                if ($variant) {
                    $variant->update($variantFields);
                    $updatedVariantIds[] = $variantId;

                    // Sync attribute values if provided
                    if (isset($variationData['attribute_values'])) {
                        $attributeValueIds = $extractAttributeValueIds($variationData['attribute_values']);
                        if (!empty($attributeValueIds)) {
                            $variant->attributeValues()->sync($attributeValueIds);
                        }
                    }
                }
            } else {
                // Create new variant - auto-generate SKU if not provided
                if (empty($variantFields['sku'])) {
                    // Try to generate SKU from attribute values (e.g., "F24K10011240Black")
                    if (isset($variationData['attribute_values']) && !empty($variationData['attribute_values'])) {
                        $attributeValueIds = $extractAttributeValueIds($variationData['attribute_values']);
                        if (!empty($attributeValueIds)) {
                            $attrValues = \App\Models\AttributeValue::whereIn('id', $attributeValueIds)->pluck('value')->toArray();
                            $attrPart = implode('', array_map(fn($v) => preg_replace('/\s+/', '', $v), $attrValues));
                            $variantFields['sku'] = $product->sku . $attrPart;
                        }
                    }
                    // Fallback if still empty
                    if (empty($variantFields['sku'])) {
                        $variantFields['sku'] = $product->sku . 'V' . ($index + 1) . Str::random(4);
                    }
                }

                $variant = $product->variants()->create($variantFields);
                $updatedVariantIds[] = $variant->id;

                // Sync attribute values if provided
                if (isset($variationData['attribute_values'])) {
                    $attributeValueIds = $extractAttributeValueIds($variationData['attribute_values']);
                    if (!empty($attributeValueIds)) {
                        $variant->attributeValues()->sync($attributeValueIds);
                    }
                }
            }
        }

        // Note: We don't delete variants not in the update list to preserve existing data
        // If you want to delete variants not included, uncomment the following:
        // $variantsToDelete = array_diff($existingVariantIds, $updatedVariantIds);
        // ProductVariant::whereIn('id', $variantsToDelete)->delete();
    }

    protected function extractVariantImageReference(array $variationData): mixed
    {
        if (array_key_exists('image', $variationData)) {
            return $variationData['image'];
        }

        if (!isset($variationData['variation_image'])) {
            return null;
        }

        return $variationData['variation_image'];
    }

    /**
     * Get top selling products based on actual order data
     */
    protected function topSellingProducts(Request $request)
    {
        $filterBy = $request->input('filter_by', 'this_year');
        $limit = $request->input('paginate', 5);
        $isActiveFilter = null;
        if ($request->has('is_active')) {
            $isActiveFilter = $request->input('is_active');
        } elseif ($request->has('status')) {
            $isActiveFilter = $request->input('status');
        }

        $buildTopSelling = function (?int $year = null, ?\Carbon\Carbon $startDate = null, ?\Carbon\Carbon $endDate = null) use ($limit, $isActiveFilter) {
            $query = \DB::table('order_items as oi')
                ->join('orders as o', 'o.id', '=', 'oi.order_id')
                ->join('products as p', 'p.id', '=', 'oi.product_id')
                ->whereNull('o.deleted_at')
                ->whereNull('p.deleted_at')
                ->when($isActiveFilter !== '' && $isActiveFilter !== null, function ($query) use ($isActiveFilter) {
                    $query->where('p.is_active', $isActiveFilter == '1' || $isActiveFilter === 'active' || $isActiveFilter === true);
                }, function ($query) {
                    $query->where('p.is_active', true);
                });

            if ($year !== null) {
                $query->whereYear('o.created_at', $year);
            } elseif ($startDate !== null) {
                $query->whereBetween('o.created_at', [$startDate, $endDate ?? now()]);
            }

            return $query
                ->select([
                    'p.id',
                    'p.name',
                    'p.sku',
                    'p.price',
                    'p.sale_price',
                    'p.stock_quantity',
                    'p.created_at',
                ])
                ->selectRaw('SUM(oi.quantity) as quantity')
                ->selectRaw('COUNT(DISTINCT oi.order_id) as orders_count')
                ->selectRaw('SUM(oi.total) as order_amount')
                ->groupBy(
                    'p.id',
                    'p.name',
                    'p.sku',
                    'p.price',
                    'p.sale_price',
                    'p.stock_quantity',
                    'p.created_at'
                )
                ->orderByDesc('quantity')
                ->limit($limit)
                ->get();
        };

        $filterApplied = $filterBy;
        $products = collect();

        if (is_string($filterBy) && str_starts_with($filterBy, 'year:')) {
            $year = (int) substr($filterBy, strlen('year:'));
            $products = $buildTopSelling($year);
            $filterApplied = "year:{$year}";
        } else {
            $startDate = match ($filterBy) {
                'today' => now()->startOfDay(),
                'this_week' => now()->startOfWeek(),
                'this_month' => now()->startOfMonth(),
                'this_year' => now()->startOfYear(),
                default => null,
            };

            if ($startDate) {
                $products = $buildTopSelling(null, $startDate, now());
            } else {
                $products = $buildTopSelling();
            }
        }

        if ($products->isEmpty()) {
            $latestOrderDate = \DB::table('orders as o')
                ->join('order_items as oi', 'o.id', '=', 'oi.order_id')
                ->whereNull('o.deleted_at')
                ->max('o.created_at');

            if ($latestOrderDate) {
                $fallbackYear = (int) \Carbon\Carbon::parse($latestOrderDate)->format('Y');
                $products = $buildTopSelling($fallbackYear);
                $filterApplied = "year:{$fallbackYear}";
            }
        }

        // Fallback to products.total_sold if no order-item data exists
        if ($products->isEmpty()) {
            $products = Product::select([
                    'products.id',
                    'products.name',
                    'products.sku',
                    'products.price',
                    'products.sale_price',
                    'products.stock_quantity',
                    'products.created_at',
                ])
                ->selectRaw('0 as orders_count')
                ->selectRaw('products.total_sold as quantity')
                ->selectRaw('0 as order_amount')
                ->whereNull('products.deleted_at')
                ->when($isActiveFilter !== '' && $isActiveFilter !== null, function ($query) use ($isActiveFilter) {
                    $query->where('products.is_active', $isActiveFilter == '1' || $isActiveFilter === 'active' || $isActiveFilter === true);
                }, function ($query) {
                    $query->where('products.is_active', true);
                })
                ->where('products.total_sold', '>', 0)
                ->orderByDesc('products.total_sold')
                ->limit($limit)
                ->get();
            $filterApplied = 'all_time';
        }

        // Load images for each product
        $productIds = $products->pluck('id')->toArray();
        $images = \DB::table('product_images')
            ->whereIn('product_id', $productIds)
            ->orderByDesc('is_primary')
            ->orderBy('id')
            ->get()
            ->groupBy('product_id');

        // Transform for frontend
        $results = $products->map(function ($product) use ($images) {
            $productImages = $images->get($product->id, collect());
            $thumbnail = $productImages->first();
            $thumbnailUrl = null;

            if ($thumbnail) {
                $thumbnailSource = $thumbnail->thumbnail ?: $thumbnail->image;
                $thumbnailUrl = MediaUrl::fromPath($thumbnailSource);
            }

            return [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'price' => $product->price,
                'sale_price' => $product->sale_price,
                'stock_quantity' => $product->stock_quantity,
                'quantity' => (int) $product->quantity,
                'orders_count' => (int) $product->orders_count,
                'order_amount' => (float) $product->order_amount,
                'created_at' => $product->created_at,
                'product_thumbnail' => $thumbnailUrl ? [
                    'id' => $thumbnail->id,
                    'original_url' => $thumbnailUrl,
                ] : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $results,
            'total' => $results->count(),
            'current_page' => 1,
            'last_page' => 1,
            'per_page' => $limit,
            'meta' => [
                'filter_requested' => $filterBy,
                'filter_applied' => $filterApplied,
            ],
        ]);
    }
}
