<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Attachment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductImage;
use App\Models\Category;
use App\Models\Brand;
use App\Models\ImportHistory;
use App\Models\ImportHistoryItem;
use App\Models\Tag;
use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Services\ExternalImageDownloader;
use App\Services\PriceResolver;
use App\Services\ProductOfferService;
use App\Support\MediaUrl;
use Illuminate\Http\UploadedFile as LaravelUploadedFile;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Color;
use Symfony\Component\HttpFoundation\File\UploadedFile as SymfonyUploadedFile;

class ImportController extends BaseController
{
    // Track import statistics
    protected $stats = [
        'products_created' => 0,
        'products_updated' => 0,
        'variations_created' => 0,
        'variations_updated' => 0,
        'rows_processed' => 0,
        'rows_failed' => 0,
    ];

    // Track errors for export
    protected $errorRows = [];

    // Track non-fatal warnings (e.g., image localization failures) per import request
    protected $importWarnings = [];

    // Current SKU context used for warning attribution
    protected $currentImportSkuContext = null;

    protected ?ImportHistory $currentImportHistory = null;

    protected int $lastImportProgressPercent = -1;

    public function importProducts(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'country_ids' => 'nullable|array',
            'country_ids.*' => 'exists:countries,id',
            'update_existing' => 'nullable|boolean',
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        $updateExisting = $request->boolean('update_existing', true);

        try {
            if (in_array($extension, ['xlsx', 'xls'])) {
                return $this->importFromExcel($file, $validated['country_ids'] ?? [], $updateExisting);
            } else {
                return $this->importFromCsv($file, $validated['country_ids'] ?? [], $updateExisting);
            }
        } catch (\Exception $e) {
            Log::error('Import failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('Import failed: ' . $e->getMessage(), 500);
        }
    }

    protected function importFromExcel($file, array $countryIds = [], bool $updateExisting = true)
    {
        $spreadsheet = IOFactory::load($file->getPathname());
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();

        if (empty($rows)) {
            return $this->error('File is empty.', 400);
        }

        // First row is headers
        $headers = array_map(function ($h) {
            return strtolower(trim(str_replace(' ', '_', $h ?? '')));
        }, $rows[0]);

        $dataRows = array_slice($rows, 1);

        return $this->processRows($headers, $dataRows, $countryIds, $updateExisting);
    }

    protected function importFromCsv($file, array $countryIds = [], bool $updateExisting = true)
    {
        $handle = fopen($file->getPathname(), 'r');

        if (!$handle) {
            return $this->error('Failed to open file.', 400);
        }

        // Read headers
        $headers = fgetcsv($handle);
        $headers = array_map(function ($h) {
            return strtolower(trim(str_replace(' ', '_', $h ?? '')));
        }, $headers);

        $dataRows = [];
        while (($row = fgetcsv($handle)) !== false) {
            $dataRows[] = $row;
        }
        fclose($handle);

        return $this->processRows($headers, $dataRows, $countryIds, $updateExisting);
    }

    protected function processRows(array $headers, array $rows, array $countryIds, bool $updateExisting)
    {
        // Reset stats
        $this->stats = [
            'products_created' => 0,
            'products_updated' => 0,
            'variations_created' => 0,
            'variations_updated' => 0,
            'rows_processed' => 0,
            'rows_failed' => 0,
        ];
        $this->errorRows = [];

        $categoryNameCache = [];
        $tagNameCache = [];
        $brandNameCache = [];
        $storeNameCache = [];

        DB::beginTransaction();
        try {
            foreach ($rows as $rowIndex => $row) {
                $rowNumber = $rowIndex + 2; // Account for header row and 0-index
                $this->stats['rows_processed']++;

                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                // Combine headers with row data
                $data = [];
                foreach ($headers as $index => $header) {
                    if (!empty($header)) {
                        $data[$header] = $row[$index] ?? '';
                    }
                }

                // Validate row
                $errors = $this->validateRow($data, $rowNumber);
                if (!empty($errors)) {
                    $this->addErrorRow($rowNumber, $row, $headers, implode('; ', $errors));
                    continue;
                }

                try {
                $this->createOrUpdateProduct($data, $countryIds, $updateExisting, $categoryNameCache, $tagNameCache, $brandNameCache, $storeNameCache);
                } catch (\Exception $e) {
                    $this->addErrorRow($rowNumber, $row, $headers, $e->getMessage());
                    Log::error("Import error row {$rowNumber}: " . $e->getMessage());
                }
            }

            DB::commit();

            // Build response
            $response = [
                'success' => true,
                'summary' => $this->stats,
                'message' => $this->buildSummaryMessage(),
            ];

            // Generate error file if there are errors
            if (!empty($this->errorRows)) {
                $errorFileUrl = $this->generateErrorFile($headers);
                $response['error_file'] = $errorFileUrl;
                $response['errors_count'] = count($this->errorRows);
            }

            return $this->success($response, $response['message']);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Import failed: ' . $e->getMessage(), 500);
        }
    }

    protected function validateRow(array $data, int $rowNumber): array
    {
        $errors = [];

        // Required fields
        $sku = $data['sku'] ?? $data['product_sku'] ?? $data['article'] ?? null;
        $name = $data['name'] ?? $data['product_name'] ?? $data['title'] ?? null;

        if (empty($sku)) {
            $errors[] = 'SKU is required';
        }

        if (empty($name)) {
            $errors[] = 'Product name is required';
        }

        // Validate price format
        $price = $data['price'] ?? $data['product_price'] ?? null;
        if ($price !== null && $price !== '' && !is_numeric($price)) {
            $errors[] = 'Price must be a valid number';
        }

        $salePrice = $data['sale_price'] ?? null;
        if ($salePrice !== null && $salePrice !== '' && !is_numeric($salePrice)) {
            $errors[] = 'Sale price must be a valid number';
        }

        // Validate stock
        $stock = $data['stock'] ?? $data['quantity'] ?? $data['stock_quantity'] ?? $data['inventory'] ?? null;
        if ($stock !== null && $stock !== '' && !is_numeric($stock)) {
            $errors[] = 'Stock must be a valid number';
        }

        return $errors;
    }

    protected function addErrorRow(int $rowNumber, array $originalRow, array $headers, string $errorMessage): void
    {
        $this->stats['rows_failed']++;
        $this->errorRows[] = [
            'row_number' => $rowNumber,
            'data' => array_combine($headers, array_pad($originalRow, count($headers), '')),
            'original_row' => $originalRow,
            'error' => $errorMessage,
        ];
    }

    protected function createOrUpdateProduct(
        array $data,
        array $countryIds = [],
        bool $updateExisting = true,
        array &$categoryNameCache = [],
        array &$tagNameCache = [],
        array &$brandNameCache = [],
        array &$storeNameCache = [],
        bool $onlyUpdateProvidedFields = false,
        ?string &$upsertOutcome = null
    ): ?Product
    {
        $upsertOutcome = null;

        // Extract SKU for lookup
        $rawSku = $data['sku'] ?? $data['product_sku'] ?? $data['article'] ?? null;
        $sku = $this->normalizeImportSku($rawSku);
        $skuCandidates = $this->buildImportSkuLookupCandidates($rawSku, $sku);
        $name = $data['name'] ?? $data['product_name'] ?? $data['title'] ?? null;
        $price = $data['price'] ?? $data['product_price'] ?? 0;
        $brandName = $data['brand'] ?? null;
        $brandId = $this->resolveOrCreateBrandIdByNameWithCache($brandName, $brandNameCache);
        $storeValue = $this->getFirstValue($data, ['store', 'store_name', 'store_code', 'store_key', 'store_id']);
        $storeId = null;
        try {
            $storeId = $this->resolveStoreIdByNameWithCache($storeValue, $storeNameCache);
        } catch (\Throwable $e) {
            Log::warning('Import store resolution failed', [
                'store' => is_scalar($storeValue) ? (string) $storeValue : null,
                'sku' => is_scalar($sku) ? (string) $sku : null,
                'error' => $e->getMessage(),
            ]);
        }

        // Check if product exists
        $existingProduct = !empty($skuCandidates)
            ? Product::withTrashed()->whereIn('sku', $skuCandidates)->first()
            : null;
        $beforeSnapshot = ($this->currentImportHistory && $existingProduct)
            ? $this->snapshotProduct($existingProduct)
            : null;

        if ($existingProduct && !$updateExisting) {
            throw new \Exception("Product with SKU '{$existingProduct->sku}' already exists. Enable 'Update Existing' to modify.");
        }

        $skuForWrite = $existingProduct?->sku ?? $sku;
        $previousSkuContext = $this->currentImportSkuContext;
        $this->currentImportSkuContext = is_scalar($skuForWrite)
            ? (string) $skuForWrite
            : (is_scalar($sku) ? (string) $sku : null);

        try {
            $baseProductData = [
                'name' => $name,
                'name_ar' => $data['name_ar'] ?? $data['ar_title'] ?? $data['arabic_name'] ?? $data['arabic_title'] ?? $data['title_ar'] ?? null,
                'sku' => $skuForWrite,
                'short_description' => $data['short_description'] ?? $data['description_short'] ?? null,
                'short_description_ar' => $data['short_description_ar'] ?? $data['arabic_short_description'] ?? null,
                'description' => $data['description'] ?? $data['product_description'] ?? null,
                'description_ar' => $data['description_ar'] ?? $data['ar_description'] ?? $data['arabic_description'] ?? null,
                'price' => $this->parseNumber($price),
                'sale_price' => $this->parseNullableNumber($data['sale_price'] ?? null),
                'cost_price' => $this->parseNullableNumber($data['cost_price'] ?? null),
                'stock_quantity' => (int) ($data['stock'] ?? $data['quantity'] ?? $data['stock_quantity'] ?? $data['inventory'] ?? 0),
                'weight' => $this->parseNullableNumber($data['weight'] ?? $data['weight_(kg)'] ?? $data['weight_kg'] ?? null),
                'is_active' => $this->resolveImportProductIsActive($data),
                'is_featured' => $this->parseBoolean($data['featured'] ?? $data['is_featured'] ?? 'false'),
                'is_trending' => $this->parseBoolean($data['trending'] ?? $data['is_trending'] ?? 'false'),
                'safe_checkout' => $this->parseBoolean($data['safe_checkout'] ?? 'true'),
                'secure_checkout' => $this->parseBoolean($data['secure_checkout'] ?? 'true'),
                'social_share' => $this->parseBoolean($data['social_share'] ?? 'true'),
                'encourage_order' => $this->parseBoolean($data['encourage_order'] ?? 'true'),
                'encourage_view' => $this->parseBoolean($data['encourage_view'] ?? 'true'),
                'manage_stock' => true,
                'meta_title' => $data['meta_title'] ?? null,
                'meta_description' => $data['meta_description'] ?? null,
            ];
            if ($brandId) {
                $baseProductData['brand_id'] = $brandId;
            }
            if ($storeId !== null && Schema::hasColumn('products', 'store_id')) {
                $baseProductData['store_id'] = $storeId;
            }

            $baseProductData['stock_status'] = $baseProductData['stock_quantity'] > 0 ? 'in_stock' : 'out_of_stock';

            if ($existingProduct) {
                $restored = false;
                if (method_exists($existingProduct, 'trashed') && $existingProduct->trashed()) {
                    $existingProduct->restore();
                    $restored = true;
                }

                if ($onlyUpdateProvidedFields) {
                    $updateData = $this->buildImportProductUpdatePayload($data, $baseProductData, $brandId, $storeId);
                    $changedData = $this->filterChangedModelAttributes(
                        $existingProduct,
                        $updateData,
                        ['price', 'sale_price', 'cost_price', 'stock_quantity', 'weight', 'brand_id', 'store_id'],
                        [
                            'is_active',
                            'is_featured',
                            'is_trending',
                            'safe_checkout',
                            'secure_checkout',
                            'social_share',
                            'encourage_order',
                            'encourage_view',
                            'manage_stock',
                        ]
                    );

                    if (!empty($changedData)) {
                        $existingProduct->update($changedData);
                        $this->stats['products_updated']++;
                        $upsertOutcome = 'updated';
                    } else {
                        $upsertOutcome = $restored ? 'updated' : 'skipped';
                    }
                } else {
                    // Update existing product
                    $updateData = $baseProductData;
                    unset($updateData['sku']); // Don't update SKU
                    $existingProduct->update($updateData);
                    $this->stats['products_updated']++;
                    $upsertOutcome = 'updated';
                }

                $product = $existingProduct;
            } else {
                // Create new product
                $productData = $baseProductData;
                if (empty($productData['name'])) {
                    $fallbackName = $skuForWrite ?: $sku ?: 'Imported Product';
                    $productData['name'] = (string) $fallbackName;
                }
                $productData['slug'] = $this->generateUniqueSlug((string) $productData['name']);
                $createResult = $this->createProductWithImportRetries(
                    $productData,
                    (string) $productData['name'],
                    is_scalar($skuForWrite) ? (string) $skuForWrite : null
                );
                $product = $createResult['product'];
                if ($createResult['created']) {
                    $this->stats['products_created']++;
                    $upsertOutcome = 'created';
                } else {
                    $this->stats['products_updated']++;
                    $upsertOutcome = 'updated';
                }
            }

            // Handle categories
            $this->handleCategories($product, $data, $categoryNameCache);

            // Handle tags
            $this->handleTags($product, $data, $tagNameCache);

            // Handle countries
            if (!empty($countryIds)) {
                $product->countries()->sync($countryIds);
            }

            // Handle image URLs
            $this->handleImageUrls($product, $data);

            // Handle variants
            $this->handleVariants($product, $data);

            // Keep incomplete products out of storefront when imported media fails.
            $this->enforceImportMediaCompleteness($product, $data);

            if ($upsertOutcome === 'created') {
                $this->recordProductHistoryItem($product, 'created', null, $this->snapshotProduct($product));
            } elseif ($upsertOutcome === 'updated') {
                $this->recordProductHistoryItem($product, 'updated', $beforeSnapshot, $this->snapshotProduct($product));
            }

            return $product;
        } finally {
            $this->currentImportSkuContext = $previousSkuContext;
        }
    }

    protected function buildImportProductUpdatePayload(array $data, array $baseProductData, ?int $brandId, ?int $storeId): array
    {
        $updateData = [];

        $fieldMap = [
            'name' => ['name', 'product_name', 'title'],
            'name_ar' => ['name_ar', 'ar_title', 'arabic_name', 'arabic_title', 'title_ar'],
            'short_description' => ['short_description', 'description_short'],
            'short_description_ar' => ['short_description_ar', 'arabic_short_description'],
            'description' => ['description', 'product_description'],
            'description_ar' => ['description_ar', 'ar_description', 'arabic_description'],
            'price' => ['price', 'product_price'],
            'sale_price' => ['sale_price'],
            'cost_price' => ['cost_price'],
            'stock_quantity' => ['stock', 'quantity', 'stock_quantity', 'inventory'],
            'weight' => ['weight', 'weight_(kg)', 'weight_kg'],
            'is_active' => ['published', 'active', 'is_active', 'status'],
            'is_featured' => ['featured', 'is_featured'],
            'is_trending' => ['trending', 'is_trending'],
            'safe_checkout' => ['safe_checkout'],
            'secure_checkout' => ['secure_checkout'],
            'social_share' => ['social_share'],
            'encourage_order' => ['encourage_order'],
            'encourage_view' => ['encourage_view'],
            'meta_title' => ['meta_title'],
            'meta_description' => ['meta_description'],
        ];

        foreach ($fieldMap as $field => $keys) {
            if ($this->hasImportFieldValue($data, $keys) && array_key_exists($field, $baseProductData)) {
                $updateData[$field] = $baseProductData[$field];
            }
        }

        if ($this->hasImportFieldValue($data, ['stock', 'quantity', 'stock_quantity', 'inventory'])) {
            $updateData['stock_status'] = $baseProductData['stock_status'] ?? 'out_of_stock';
        }

        if ($this->hasImportFieldValue($data, ['brand']) && $brandId) {
            $updateData['brand_id'] = $brandId;
        }

        if (
            $this->hasImportFieldValue($data, ['store', 'store_name', 'store_code', 'store_key', 'store_id'])
            && $storeId !== null
            && Schema::hasColumn('products', 'store_id')
        ) {
            $updateData['store_id'] = $storeId;
        }

        return $updateData;
    }

    protected function hasImportFieldValue(array $data, array $keys): bool
    {
        foreach ($keys as $key) {
            if (!array_key_exists($key, $data)) {
                continue;
            }

            $value = $data[$key];

            if ($value === null) {
                continue;
            }

            if (is_string($value)) {
                if (trim($value) === '') {
                    continue;
                }

                return true;
            }

            if (is_array($value)) {
                if (empty($value)) {
                    continue;
                }

                return true;
            }

            return true;
        }

        return false;
    }

    protected function filterChangedModelAttributes($model, array $candidateData, array $numericFields = [], array $booleanFields = []): array
    {
        $changed = [];

        foreach ($candidateData as $field => $newValue) {
            $currentValue = $model->getAttribute($field);

            if ($this->importValuesAreDifferent($field, $currentValue, $newValue, $numericFields, $booleanFields)) {
                $changed[$field] = $newValue;
            }
        }

        return $changed;
    }

    protected function importValuesAreDifferent(string $field, $currentValue, $newValue, array $numericFields, array $booleanFields): bool
    {
        if (in_array($field, $booleanFields, true)) {
            return (bool) $currentValue !== (bool) $newValue;
        }

        if (in_array($field, $numericFields, true)) {
            if ($currentValue === null || $newValue === null) {
                return $currentValue !== $newValue;
            }

            return abs((float) $currentValue - (float) $newValue) > 0.00001;
        }

        if (is_array($currentValue) || is_array($newValue)) {
            return json_encode($currentValue) !== json_encode($newValue);
        }

        if ($currentValue === null || $newValue === null) {
            return $currentValue !== $newValue;
        }

        return trim((string) $currentValue) !== trim((string) $newValue);
    }

    protected function handleCategories(Product $product, array $data, array &$cache = []): void
    {
        $categoryField = $data['category'] ?? $data['categories'] ?? null;
        if (empty($categoryField)) {
            return;
        }

        $categoryNames = $this->parseDelimitedList($categoryField);

        // Parse Arabic category names (same order as English)
        $arCategoryField = $data['ar_category'] ?? $data['category_ar'] ?? $data['arabic_category'] ?? null;
        $arCategoryNames = !empty($arCategoryField) ? $this->parseDelimitedList($arCategoryField) : [];

        $categoryIds = [];

        foreach ($categoryNames as $index => $catName) {
            $catName = $this->normalizeCategoryName($catName);
            if ($catName === '') {
                continue;
            }

            $arName = isset($arCategoryNames[$index]) ? trim($arCategoryNames[$index]) : null;
            if ($arName === '') {
                $arName = null;
            }

            $cacheKey = Str::lower($catName);
            if (isset($cache[$cacheKey])) {
                // Update Arabic name if provided and not yet set
                if ($arName) {
                    $existingCat = Category::find($cache[$cacheKey]);
                    if ($existingCat && empty($existingCat->name_ar)) {
                        $existingCat->update(['name_ar' => $arName]);
                    }
                }
                $categoryIds[] = (int) $cache[$cacheKey];
                continue;
            }

            // Find by exact name only
            $category = Category::where('name', $catName)->first();

            if (!$category) {
                // Create new category with Arabic name
                $category = Category::create([
                    'name' => $catName,
                    'name_ar' => $arName,
                    'slug' => $this->generateUniqueCategorySlug($catName),
                    'is_active' => true,
                ]);
            } else if ($arName && empty($category->name_ar)) {
                // Update existing category with Arabic name if not already set
                $category->update(['name_ar' => $arName]);
            }

            $cache[$cacheKey] = (int) $category->id;
            $categoryIds[] = $category->id;
        }

        if (!empty($categoryIds)) {
           $product->categories()->syncWithoutDetaching($categoryIds);
        }
    }

    protected function handleTags(Product $product, array $data, array &$cache = []): void
    {
        $tagField = $data['tags'] ?? null;
        if (empty($tagField)) {
            return;
        }

        $tagNames = $this->parseDelimitedList($tagField);
        $tagIds = [];

        foreach ($tagNames as $tagName) {
            $tagName = $this->normalizeTagName($tagName);
            if ($tagName === '') {
                continue;
            }

            $cacheKey = Str::lower($tagName);
            if (isset($cache[$cacheKey])) {
                $tagIds[] = (int) $cache[$cacheKey];
                continue;
            }

            $tag = Tag::whereRaw('LOWER(name) = ?', [$cacheKey])->first();
            if (!$tag) {
                $tag = Tag::create([
                    'name' => $tagName,
                    'slug' => $this->generateUniqueTagSlug($tagName),
                    'status' => true,
                ]);
            }

            $cache[$cacheKey] = (int) $tag->id;
            $tagIds[] = $tag->id;
        }

        if (!empty($tagIds)) {
            $product->tags()->syncWithoutDetaching($tagIds);
        }
    }

    protected function handleImageUrls(Product $product, array $data): void
    {
        // Main image URL
        $mainImageUrl = $data['main_image_url'] ?? $data['image_url'] ?? $data['main_image'] ?? $data['image'] ?? null;
        $galleryUrls = $data['gallery_images'] ?? $data['additional_images'] ?? null;

        if (!empty($mainImageUrl) && empty($galleryUrls)) {
            $splitImages = $this->parseDelimitedList($mainImageUrl);
            if (count($splitImages) > 1) {
                $mainImageUrl = array_shift($splitImages);
                $galleryUrls = implode('|', $splitImages);
            }
        }

        $resolvedMainImage = $this->localizeImportedImageReference($mainImageUrl);
        if ($resolvedMainImage !== null) {
            // Check if primary image already exists
            $existingPrimary = $product->images()->where('is_primary', true)->first();

            if ($existingPrimary) {
                $existingPrimary->update(['image' => $resolvedMainImage]);
            } else {
                $product->images()->create([
                    'image' => $resolvedMainImage,
                    'is_primary' => true,
                    'sort_order' => 0,
                ]);
            }
        }

        // Gallery images (pipe-separated URLs)
        if (!empty($galleryUrls)) {
            $urls = $this->parseDelimitedList($galleryUrls);
            $sortOrder = 1;

            foreach ($urls as $url) {
                $resolvedUrl = $this->localizeImportedImageReference($url);
                if ($resolvedUrl === null) {
                    continue;
                }

                // Check if this URL already exists for this product
                $exists = $product->images()->where('image', $resolvedUrl)->exists();
                if (!$exists) {
                    $product->images()->create([
                        'image' => $resolvedUrl,
                        'is_primary' => false,
                        'sort_order' => $sortOrder++,
                    ]);
                }
            }
        }

        $this->syncProductAttachmentLinks($product);
    }

    protected function localizeImportedImageReference(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (!is_string($value)) {
            if (!is_scalar($value)) {
                return null;
            }

            $value = (string) $value;
        }

        $normalized = trim(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if ($normalized === '') {
            return null;
        }

        if (!preg_match('#^https?://#i', $normalized)) {
            $storagePath = MediaUrl::extractStoragePath($normalized);
            if ($storagePath !== null) {
                return $storagePath;
            }

            return str_contains($normalized, '/') ? ltrim(str_replace('\\', '/', $normalized), '/') : null;
        }

        $downloader = app(ExternalImageDownloader::class);
        try {
            $attachment = $downloader->downloadAndCreateAttachment($normalized);
        } catch (\Throwable $e) {
            Log::warning('Import image localization failed', [
                'url' => $normalized,
                'error' => $e->getMessage(),
            ]);
            $this->addImportWarning('image_localization_failed', [
                'sku' => $this->currentImportSkuContext,
                'url' => $normalized,
                'message' => $e->getMessage(),
            ]);

            // Fail closed for import localization to avoid crashing the whole import request.
            return null;
        }

        if ($attachment) {
            $resolved = $downloader->resolveAttachmentPath($attachment);
            if ($resolved !== null) {
                return $resolved;
            }

            return $attachment->path ?: $attachment->original_url;
        }

        $storagePath = MediaUrl::extractStoragePath($normalized);
        return $storagePath ?? $normalized;
    }

    protected function syncProductAttachmentLinks(Product $product): void
    {
        if (
            !Schema::hasTable('attachments')
            || !Schema::hasColumn('products', 'product_thumbnail_id')
            || !Schema::hasColumn('products', 'product_galleries_id')
        ) {
            return;
        }

        $images = $product->images()
            ->whereNull('product_variant_id')
            ->orderByDesc('is_primary')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['image']);

        if ($images->isEmpty()) {
            return;
        }

        $galleryIds = [];
        foreach ($images as $image) {
            $attachmentId = $this->ensureAttachmentIdForMedia($image->image);
            if ($attachmentId !== null && !in_array($attachmentId, $galleryIds, true)) {
                $galleryIds[] = $attachmentId;
            }
        }

        if (empty($galleryIds)) {
            return;
        }

        $thumbnailId = $galleryIds[0] ?? null;
        $currentThumbnail = $product->getRawOriginal('product_thumbnail_id');
        $currentGalleryRaw = $product->getRawOriginal('product_galleries_id');
        $currentGallery = is_string($currentGalleryRaw)
            ? (json_decode($currentGalleryRaw, true) ?: [])
            : (is_array($currentGalleryRaw) ? $currentGalleryRaw : []);

        if ((string) $currentThumbnail === (string) $thumbnailId && $currentGallery === $galleryIds) {
            return;
        }

        $product->forceFill([
            'product_thumbnail_id' => $thumbnailId,
            'product_galleries_id' => $galleryIds,
        ])->save();
    }

    protected function ensureAttachmentIdForMedia(?string $media): ?int
    {
        $normalized = $this->localizeImportedImageReference($media);
        if ($normalized === null) {
            return null;
        }

        $storagePath = MediaUrl::extractStoragePath($normalized);
        $normalizedForStorage = $storagePath ?? $normalized;
        $hash = hash('sha256', $normalizedForStorage);

        $query = Attachment::query()
            ->select(['id'])
            ->where('url_hash', $hash)
            ->orWhere('original_url', $normalizedForStorage)
            ->orWhere('path', $normalizedForStorage);

        if ($storagePath !== null) {
            $query->orWhere('original_url', $storagePath)
                ->orWhere('path', $storagePath);
        }

        $existing = $query->first();
        if ($existing) {
            return (int) $existing->id;
        }

        $fileName = $this->extractMediaFileName($normalizedForStorage);
        $isAbsolute = (bool) preg_match('#^https?://#i', $normalized);
        $isLocal = $storagePath !== null || !$isAbsolute;

        $payload = [
            'name' => $fileName,
            'file_name' => $fileName,
            'path' => $storagePath,
            'original_url' => $normalizedForStorage,
            'url_hash' => $hash,
            'disk' => $isLocal ? 'public' : 'external',
            'source' => $isLocal ? 'local' : 'external',
            'mime_type' => $this->mimeTypeFromFileName($fileName),
        ];

        if (Schema::hasColumn('attachments', 'size')) {
            $payload['size'] = $storagePath && Storage::disk('public')->exists($storagePath)
                ? Storage::disk('public')->size($storagePath)
                : null;
        }

        $attachment = Attachment::query()->create($payload);
        return (int) $attachment->id;
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

    protected function handleVariants(Product $product, array $data): void
    {
        // Method 1: Variants column with format "Size:S|Price:100|Stock:10,Size:M|Price:100|Stock:15"
        if (!empty($data['variants'])) {
            $this->parseVariantsColumn($product, $data['variants']);
            return;
        }

        // Method 2: Separate size and color columns
        $sizes = !empty($data['size']) ? array_map('trim', explode(',', $data['size'])) : [];
        $colors = !empty($data['color']) ? array_map('trim', explode(',', $data['color'])) : [];

        // Method 3: Variant rows with variant_sku column
        $variantSku = $data['variant_sku'] ?? null;
        if (!empty($variantSku)) {
            $this->createSingleVariant($product, $data);
            return;
        }

        if (empty($sizes) && empty($colors)) {
            return;
        }

        // Get or create attributes
        $sizeAttr = Attribute::firstOrCreate(['slug' => 'size'], ['name' => 'Size']);
        $colorAttr = Attribute::firstOrCreate(['slug' => 'color'], ['name' => 'Color']);

        // Variant price/stock can be specified or inherit from product
        $variantPrice = $this->parseNullableNumber($data['variant_price'] ?? null) ?? $product->price;
        $variantSalePrice = $this->parseNullableNumber($data['variant_sale_price'] ?? null) ?? $product->sale_price;
        $variantStock = isset($data['variant_stock']) && $data['variant_stock'] !== ''
            ? (int) $data['variant_stock']
            : (int) ($data['stock'] ?? 10);

        // Create variants for each combination
        $sizesToProcess = empty($sizes) ? [''] : $sizes;
        $colorsToProcess = empty($colors) ? [''] : $colors;

        foreach ($sizesToProcess as $sizeIndex => $size) {
            foreach ($colorsToProcess as $colorIndex => $color) {
                $size = trim($size);
                $color = trim($color);

                if (!$size && !$color)
                    continue;

                $variantSkuGenerated = $this->generateVariantSku($product->sku, $size, $color);

                // Check if variant exists
                $variant = ProductVariant::where('sku', $variantSkuGenerated)->first();

                if ($variant) {
                    // Update existing variant
                    $variant->update([
                        'price' => $variantPrice,
                        'sale_price' => $variantSalePrice,
                        'stock_quantity' => $variantStock,
                        'is_active' => true,
                    ]);
                    $this->stats['variations_updated']++;
                } else {
                    // Create new variant
                    $variant = $product->variants()->create([
                        'sku' => $variantSkuGenerated,
                        'price' => $variantPrice,
                        'sale_price' => $variantSalePrice,
                        'stock_quantity' => $variantStock,
                        'is_active' => true,
                    ]);
                    $this->stats['variations_created']++;
                }

                $attributeValueIds = [];

                // Add size attribute value
                if ($size) {
                    $sizeValue = AttributeValue::firstOrCreate(
                        ['attribute_id' => $sizeAttr->id, 'value' => strtoupper($size)],
                        ['sort_order' => $sizeIndex]
                    );
                    $attributeValueIds[] = $sizeValue->id;
                }

                // Add color attribute value
                if ($color) {
                    $colorValue = AttributeValue::firstOrCreate(
                        ['attribute_id' => $colorAttr->id, 'value' => ucfirst(strtolower($color))],
                        ['sort_order' => $colorIndex]
                    );
                    $attributeValueIds[] = $colorValue->id;
                }

                if (!empty($attributeValueIds)) {
                    $variant->attributeValues()->sync($attributeValueIds);
                }
            }
        }
    }

    protected function parseVariantsColumn(Product $product, string $variants): void
    {
        // Format: "Size:S|Price:100|Stock:10,Size:M|Price:100|Stock:15"
        // Or simple format: "S:100:10,M:100:15,L:100:20" (value:price:stock)
        $items = array_map('trim', explode(',', $variants));

        $sizeAttr = Attribute::firstOrCreate(['slug' => 'size'], ['name' => 'Size']);
        $colorAttr = Attribute::firstOrCreate(['slug' => 'color'], ['name' => 'Color']);

        foreach ($items as $index => $item) {
            // Check if it's the complex format
            if (strpos($item, '|') !== false) {
                $this->parseComplexVariant($product, $item, $sizeAttr, $colorAttr, $index);
            } else {
                // Simple format: value:price:stock
                $this->parseSimpleVariant($product, $item, $sizeAttr, $index);
            }
        }
    }

    protected function parseComplexVariant(Product $product, string $item, $sizeAttr, $colorAttr, int $index): void
    {
        // Format: "Size:S|Color:Red|Price:100|Stock:10"
        $parts = array_map('trim', explode('|', $item));
        $variantData = [];

        foreach ($parts as $part) {
            $keyValue = explode(':', $part, 2);
            if (count($keyValue) === 2) {
                $variantData[strtolower(trim($keyValue[0]))] = trim($keyValue[1]);
            }
        }

        $size = $variantData['size'] ?? null;
        $color = $variantData['color'] ?? null;
        $price = $this->parseNullableNumber($variantData['price'] ?? null) ?? $product->price;
        $salePrice = $this->parseNullableNumber($variantData['sale_price'] ?? null) ?? $product->sale_price;
        $stock = isset($variantData['stock']) ? (int) $variantData['stock'] : 10;

        if (!$size && !$color)
            return;

        $variantSku = $this->generateVariantSku($product->sku, $size, $color);

        $variant = ProductVariant::updateOrCreate(
            ['sku' => $variantSku],
            [
                'product_id' => $product->id,
                'price' => $price,
                'sale_price' => $salePrice,
                'stock_quantity' => $stock,
                'is_active' => true,
            ]
        );

        $attributeValueIds = [];

        if ($size) {
            $sizeValue = AttributeValue::firstOrCreate(
                ['attribute_id' => $sizeAttr->id, 'value' => strtoupper($size)],
                ['sort_order' => $index]
            );
            $attributeValueIds[] = $sizeValue->id;
        }

        if ($color) {
            $colorValue = AttributeValue::firstOrCreate(
                ['attribute_id' => $colorAttr->id, 'value' => ucfirst(strtolower($color))],
                ['sort_order' => $index]
            );
            $attributeValueIds[] = $colorValue->id;
        }

        $variant->attributeValues()->sync($attributeValueIds);

        if ($variant->wasRecentlyCreated) {
            $this->stats['variations_created']++;
        } else {
            $this->stats['variations_updated']++;
        }
    }

    protected function parseSimpleVariant(Product $product, string $item, $sizeAttr, int $index): void
    {
        // Format: "S:100:10" (value:price:stock)
        $parts = explode(':', trim($item));
        $value = $parts[0] ?? '';
        $price = isset($parts[1]) && $parts[1] !== '' ? (float) $parts[1] : $product->price;
        $stock = isset($parts[2]) && $parts[2] !== '' ? (int) $parts[2] : 10;

        if (!$value)
            return;

        $variantSku = $product->sku . '-' . strtoupper($value);

        $variant = ProductVariant::updateOrCreate(
            ['sku' => $variantSku],
            [
                'product_id' => $product->id,
                'price' => $price,
                'stock_quantity' => $stock,
                'is_active' => true,
            ]
        );

        $sizeValue = AttributeValue::firstOrCreate(
            ['attribute_id' => $sizeAttr->id, 'value' => strtoupper($value)],
            ['sort_order' => $index]
        );

        $variant->attributeValues()->sync([$sizeValue->id]);

        if ($variant->wasRecentlyCreated) {
            $this->stats['variations_created']++;
        } else {
            $this->stats['variations_updated']++;
        }
    }

    protected function createSingleVariant(Product $product, array $data): void
    {
        $variantSku = $data['variant_sku'];
        $size = $data['size'] ?? null;
        $color = $data['color'] ?? null;

        $sizeAttr = Attribute::firstOrCreate(['slug' => 'size'], ['name' => 'Size']);
        $colorAttr = Attribute::firstOrCreate(['slug' => 'color'], ['name' => 'Color']);

        $variant = ProductVariant::updateOrCreate(
            ['sku' => $variantSku],
            [
                'product_id' => $product->id,
                'price' => $this->parseNullableNumber($data['variant_price'] ?? null) ?? $product->price,
                'sale_price' => $this->parseNullableNumber($data['variant_sale_price'] ?? null) ?? $product->sale_price,
                'stock_quantity' => (int) ($data['variant_stock'] ?? $data['stock'] ?? 10),
                'is_active' => true,
            ]
        );

        $attributeValueIds = [];

        if ($size) {
            $sizeValue = AttributeValue::firstOrCreate(
                ['attribute_id' => $sizeAttr->id, 'value' => strtoupper($size)],
                ['sort_order' => 0]
            );
            $attributeValueIds[] = $sizeValue->id;
        }

        if ($color) {
            $colorValue = AttributeValue::firstOrCreate(
                ['attribute_id' => $colorAttr->id, 'value' => ucfirst(strtolower($color))],
                ['sort_order' => 0]
            );
            $attributeValueIds[] = $colorValue->id;
        }

        if (!empty($attributeValueIds)) {
            $variant->attributeValues()->sync($attributeValueIds);
        }

        if ($variant->wasRecentlyCreated) {
            $this->stats['variations_created']++;
        } else {
            $this->stats['variations_updated']++;
        }
    }

    protected function generateVariantSku(string $productSku, ?string $size, ?string $color): string
    {
        $parts = [$productSku];
        if ($size)
            $parts[] = strtoupper($size);
        if ($color)
            $parts[] = strtoupper($color);
        return implode('-', $parts);
    }

    protected function processNewSellRows(array $headers, array $rows, array $originalHeaders, array $stats, array &$categoryNameCache, array &$tagNameCache, array &$brandNameCache, array &$storeNameCache)
    {
        $this->errorRows = [];
        $this->importWarnings = [];
        $reportRows = [];
        $stats['created'] = $stats['created'] ?? 0;
        $stats['skipped'] = $stats['skipped'] ?? 0;

        $groups = [];

        foreach ($rows as $rowIndex => $row) {
            $rowNumber = $rowIndex + 2;

            if (empty(array_filter($row, fn($v) => trim((string) $v) !== ''))) {
                continue;
            }

            $stats['processed']++;
            $this->updateCurrentImportProgress($stats['processed']);

            $data = [];
            foreach ($headers as $index => $header) {
                if ($header !== '') {
                    $data[$header] = $row[$index] ?? '';
                }
            }

            $article = trim((string) $this->getFirstValue($data, ['article']));
            if ($article === '') {
                $this->addErrorRow($rowNumber, $row, $headers, 'article is required');
                $stats['rows_failed']++;
                $stats['rows_failed_validation']++;
                $reportRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => null,
                    'action' => 'new_sell',
                    'status' => 'failed',
                    'message' => 'article is required',
                ];
                continue;
            }

            $sku = trim((string) $this->getFirstValue($data, ['sku', 'variant_sku']));
            $color = trim((string) ($data['color'] ?? ''));
            $size = trim((string) ($data['size'] ?? ''));

            $isParent = $sku === '';
            if (!$isParent && $sku === $article && $color === '' && $size === '') {
                $isParent = true;
            }

            if (!isset($groups[$article])) {
                $groups[$article] = [
                    'parent' => null,
                    'variants' => [],
                ];
            }

            if ($isParent) {
                if ($groups[$article]['parent']) {
                    $this->addErrorRow($rowNumber, $row, $headers, 'duplicate parent row');
                    $stats['rows_failed']++;
                    $stats['rows_failed_validation']++;
                    $reportRows[] = [
                        'row_number' => $rowNumber,
                        'sku' => $article,
                        'action' => 'new_sell',
                        'status' => 'failed',
                        'message' => 'duplicate parent row',
                    ];
                    continue;
                }

                $groups[$article]['parent'] = [
                    'row' => $row,
                    'data' => $data,
                    'row_number' => $rowNumber,
                ];
                continue;
            }

            if ($sku === '') {
                $this->addErrorRow($rowNumber, $row, $headers, 'SKU is required for variant row');
                $stats['rows_failed']++;
                $stats['rows_failed_validation']++;
                $reportRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => $article,
                    'action' => 'new_sell',
                    'status' => 'failed',
                    'message' => 'SKU is required for variant row',
                ];
                continue;
            }

            $groups[$article]['variants'][] = [
                'row' => $row,
                'data' => $data,
                'row_number' => $rowNumber,
                'sku' => $sku,
            ];
        }

        DB::beginTransaction();

        try {
            foreach ($groups as $article => $group) {
                $parentEntry = $group['parent'];
                $variantEntries = $group['variants'];

                if (!$parentEntry && empty($variantEntries)) {
                    continue;
                }

                $parentData = $parentEntry ? $parentEntry['data'] : $variantEntries[0]['data'];
                $parentData['sku'] = $article;
                $parentData['article'] = $article;
                unset($parentData['variant_sku'], $parentData['variants']);
                $parentData['size'] = '';
                $parentData['color'] = '';

                $title = trim((string) ($parentData['title'] ?? $parentData['name'] ?? ''));
                if ($title === '' && !Product::where('sku', $article)->exists()) {
                    $parentData['title'] = $article;
                }

                $productUpsertOutcome = null;
                $product = $this->createOrUpdateProduct(
                    $parentData,
                    [],
                    true,
                    $categoryNameCache,
                    $tagNameCache,
                    $brandNameCache,
                    $storeNameCache,
                    true,
                    $productUpsertOutcome
                );

                if ($parentEntry) {
                    $parentStatus = 'updated';
                    $parentMessage = 'Updated';

                    if ($productUpsertOutcome === 'created') {
                        $stats['created']++;
                        $parentStatus = 'created';
                        $parentMessage = 'Created';
                    } elseif ($productUpsertOutcome === 'skipped') {
                        $stats['skipped']++;
                        $parentStatus = 'skipped';
                        $parentMessage = 'No changes';
                    } else {
                        $stats['updated']++;
                    }

                    $reportRows[] = [
                        'row_number' => $parentEntry['row_number'],
                        'sku' => $article,
                        'action' => 'new_sell',
                        'status' => $parentStatus,
                        'message' => $parentMessage,
                    ];
                }

                if (empty($variantEntries)) {
                    $reportRows[] = [
                        'row_number' => $parentEntry ? $parentEntry['row_number'] : null,
                        'sku' => $article,
                        'action' => 'new_sell',
                        'status' => 'warning',
                        'message' => 'No variants found for article',
                    ];
                    continue;
                }

                foreach ($variantEntries as $variantEntry) {
                    $variantSku = trim((string) $variantEntry['sku']);
                    if ($variantSku === '') {
                        $this->addErrorRow($variantEntry['row_number'], $variantEntry['row'], $headers, 'SKU is required for variant row');
                        $stats['rows_failed']++;
                        $stats['rows_failed_validation']++;
                        $reportRows[] = [
                            'row_number' => $variantEntry['row_number'],
                            'sku' => $article,
                            'action' => 'new_sell',
                            'status' => 'failed',
                            'message' => 'SKU is required for variant row',
                        ];
                        continue;
                    }

                    $variantOutcome = $this->createOrUpdateVariantRow($product, $variantEntry['data'], $variantSku);

                    $variantStatus = 'updated';
                    $variantMessage = 'Updated';
                    if ($variantOutcome === 'created') {
                        $stats['created']++;
                        $variantStatus = 'created';
                        $variantMessage = 'Created';
                    } elseif ($variantOutcome === 'skipped') {
                        $stats['skipped']++;
                        $variantStatus = 'skipped';
                        $variantMessage = 'No changes';
                    } else {
                        $stats['updated']++;
                    }

                    $reportRows[] = [
                        'row_number' => $variantEntry['row_number'],
                        'sku' => $variantSku,
                        'action' => 'new_sell',
                        'status' => $variantStatus,
                        'message' => $variantMessage,
                    ];
                }

                $totalVariantStock = $product->variants()->sum('stock_quantity');
                $productStockPayload = [
                    'stock_quantity' => $totalVariantStock,
                    'stock_status' => $totalVariantStock > 0 ? 'in_stock' : 'out_of_stock',
                ];
                $productStockChanges = $this->filterChangedModelAttributes(
                    $product,
                    $productStockPayload,
                    ['stock_quantity'],
                    []
                );
                if (!empty($productStockChanges)) {
                    $productStockBeforeSnapshot = $this->currentImportHistory
                        ? $this->snapshotProduct($product)
                        : null;
                    $product->update($productStockChanges);
                    $this->recordProductHistoryItem($product, 'updated', $productStockBeforeSnapshot, $this->snapshotProduct($product));
                }
            }

            DB::commit();
            $this->appendImportWarningsToReportRows($reportRows, 'new_sell');

            $reportUrl = $this->generateActionReportFile($reportRows, 'product_action_report_');

            $response = [
                'success' => true,
                'summary' => $stats,
                'message' => $this->buildActionSummaryMessage($stats, 'new_sell'),
                'report_url' => $reportUrl,
            ];

            if (!empty($this->errorRows)) {
                $errorFileUrl = $this->generateErrorFile($originalHeaders);
                $response['error_file'] = $errorFileUrl;
                $response['errors_count'] = count($this->errorRows);
            }

            if (!empty($this->importWarnings)) {
                $response['warnings_count'] = count($this->importWarnings);
                $response['warnings_by_type'] = $this->getImportWarningsByType();
                $response['warnings_sample'] = $this->getImportWarningsSample();
            }

            $this->finalizeCurrentImportHistorySuccess($response);
            return $this->success($response, $response['message']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Action import failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $this->markCurrentImportHistoryFailed($e->getMessage());
            return $this->error('Import failed: ' . $e->getMessage(), 500);
        }
    }

    protected function createOrUpdateVariantRow(Product $product, array $data, string $variantSku): string
    {
        $size = trim((string) ($data['size'] ?? ''));
        $color = trim((string) ($data['color'] ?? ''));
        $variantImage = null;
        if (!empty($data['image'])) {
            $imageCandidates = $this->parseDelimitedList($data['image']);
            $imageCandidate = $imageCandidates[0] ?? null;
            if ($imageCandidate) {
                $variantImage = $this->localizeImportedImageReference($imageCandidate);
            }
        }

        $sizeAttr = Attribute::firstOrCreate(['slug' => 'size'], ['name' => 'Size']);
        $colorAttr = Attribute::firstOrCreate(['slug' => 'color'], ['name' => 'Color']);

        $existingVariant = ProductVariant::where('sku', $variantSku)->first();
        $beforeSnapshot = ($this->currentImportHistory && $existingVariant)
            ? $this->snapshotVariant($existingVariant)
            : null;

        $variantData = [
            'product_id' => $product->id,
            'is_active' => true,
        ];
        if ($this->hasImportFieldValue($data, ['price', 'variant_price'])) {
            $variantPriceInput = $this->getFirstValue($data, ['price', 'variant_price']);
            $variantData['price'] = $this->parseNullableNumber($variantPriceInput) ?? $product->price;
        }
        if ($this->hasImportFieldValue($data, ['sale_price', 'variant_sale_price'])) {
            $variantSalePriceInput = $this->getFirstValue($data, ['sale_price', 'variant_sale_price']);
            $variantData['sale_price'] = $this->parseNullableNumber($variantSalePriceInput);
        }
        if ($this->hasImportFieldValue($data, ['inventory', 'stock', 'quantity', 'stock_quantity', 'variant_stock'])) {
            $rawStock = $this->getFirstValue($data, ['inventory', 'stock', 'quantity', 'stock_quantity', 'variant_stock']);
            $variantData['stock_quantity'] = (int) $this->parseNumber($rawStock);
        }
        if ($variantImage) {
            $variantData['image'] = $variantImage;
        }

        if (!$existingVariant) {
            $createData = $variantData;
            $createData['sku'] = $variantSku;
            $createData['price'] = array_key_exists('price', $createData)
                ? $createData['price']
                : (float) ($product->price ?? 0);
            if (!array_key_exists('sale_price', $createData)) {
                $createData['sale_price'] = null;
            }
            if (!array_key_exists('stock_quantity', $createData)) {
                $createData['stock_quantity'] = 0;
            }

            $variant = ProductVariant::create($createData);
            $this->syncImportVariantAttributes($variant, $sizeAttr, $colorAttr, $size, $color);
            $this->stats['variations_created']++;
            $this->recordVariantHistoryItem($variant, 'created', null, $this->snapshotVariant($variant));
            return 'created';
        }

        $changedData = $this->filterChangedModelAttributes(
            $existingVariant,
            $variantData,
            ['product_id', 'price', 'sale_price', 'stock_quantity'],
            ['is_active']
        );

        $variantUpdated = false;
        if (!empty($changedData)) {
            $existingVariant->update($changedData);
            $variantUpdated = true;
        }

        $attributesUpdated = $this->syncImportVariantAttributes($existingVariant, $sizeAttr, $colorAttr, $size, $color);

        if ($variantUpdated || $attributesUpdated) {
            $this->stats['variations_updated']++;
            $this->recordVariantHistoryItem($existingVariant, 'updated', $beforeSnapshot, $this->snapshotVariant($existingVariant));
            return 'updated';
        }

        return 'skipped';
    }

    protected function syncImportVariantAttributes(ProductVariant $variant, Attribute $sizeAttr, Attribute $colorAttr, string $size, string $color): bool
    {
        $attributeValueIds = [];

        if ($size !== '') {
            $sizeValue = AttributeValue::firstOrCreate(
                ['attribute_id' => $sizeAttr->id, 'value' => strtoupper($size)],
                ['sort_order' => 0]
            );
            $attributeValueIds[] = (int) $sizeValue->id;
        }

        if ($color !== '') {
            $colorValue = AttributeValue::firstOrCreate(
                ['attribute_id' => $colorAttr->id, 'value' => ucfirst(strtolower($color))],
                ['sort_order' => 0]
            );
            $attributeValueIds[] = (int) $colorValue->id;
        }

        if (empty($attributeValueIds)) {
            return false;
        }

        $attributeValueIds = array_values(array_unique($attributeValueIds));
        sort($attributeValueIds);

        $currentAttributeIds = $variant->attributeValues()
            ->pluck('attribute_values.id')
            ->map(fn($id) => (int) $id)
            ->all();
        sort($currentAttributeIds);

        if ($currentAttributeIds === $attributeValueIds) {
            return false;
        }

        $variant->attributeValues()->sync($attributeValueIds);
        return true;
    }

    protected function generateUniqueSlug(string $name): string
    {
        $baseSlug = Str::slug($name);
        if ($baseSlug === '') {
            $baseSlug = 'product-' . substr(hash('sha1', $name), 0, 12);
        }

        $slug = $baseSlug;
        $counter = 1;

        while (Product::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * @return array{product: Product, created: bool}
     */
    protected function createProductWithImportRetries(array $productData, string $name, ?string $sku): array
    {
        $attempts = 5;
        $lastError = null;

        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            try {
                $product = Product::create($productData);
                return ['product' => $product, 'created' => true];
            } catch (QueryException $e) {
                $lastError = $e;

                if ($this->isDuplicateProductSlugException($e)) {
                    $productData['slug'] = $this->buildImportSlugCandidate($name, $attempt);
                    continue;
                }

                if ($this->isDuplicateProductSkuException($e) && $sku) {
                    $existing = Product::withTrashed()->where('sku', $sku)->first();
                    if ($existing) {
                        if (method_exists($existing, 'trashed') && $existing->trashed()) {
                            $existing->restore();
                        }

                        $updateData = $productData;
                        unset($updateData['sku'], $updateData['slug']);
                        $existing->update($updateData);

                        return ['product' => $existing, 'created' => false];
                    }
                }

                if ($this->isRetryableDbException($e) && $attempt < $attempts) {
                    usleep(150000 * $attempt);
                    continue;
                }

                throw $e;
            }
        }

        if ($lastError) {
            throw $lastError;
        }

        throw new \RuntimeException('Unable to create product during import.');
    }

    protected function buildImportSlugCandidate(string $name, int $attempt): string
    {
        $baseSlug = Str::slug($name);
        if ($baseSlug === '') {
            $baseSlug = 'product';
        }

        $candidate = $baseSlug . '-' . $attempt;
        if (Product::withTrashed()->where('slug', $candidate)->exists()) {
            $candidate = $baseSlug . '-' . $attempt . '-' . Str::lower(Str::random(4));
        }

        return $candidate;
    }

    protected function buildImportSkuLookupCandidates($rawSku, ?string $normalizedSku): array
    {
        $candidates = [];

        if (is_scalar($rawSku)) {
            $raw = trim((string) $rawSku);
            if ($raw !== '') {
                $candidates[] = $raw;
            }
        }

        if (is_string($normalizedSku) && $normalizedSku !== '') {
            $candidates[] = $normalizedSku;
        }

        return array_values(array_unique($candidates));
    }

    protected function normalizeImportSku($value): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }

        $sku = trim((string) $value);
        if ($sku === '') {
            return null;
        }

        $sku = html_entity_decode($sku, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $sku = preg_replace('/[\x{200B}\x{200C}\x{200D}\x{FEFF}]/u', '', $sku) ?? $sku;
        $sku = str_replace(["\u{00A0}", "\u{202F}"], ' ', $sku);
        $sku = preg_replace('/[‐‑‒–—―﹘﹣－]/u', '-', $sku) ?? $sku;
        $sku = preg_replace('/\s+/u', '', $sku) ?? $sku;

        return trim($sku) !== '' ? trim($sku) : null;
    }

    protected function resolveImportProductIsActive(array $data): bool
    {
        $raw = $this->getFirstValue($data, ['published', 'active', 'is_active', 'status']);

        if ($raw === null) {
            return true;
        }

        if (is_bool($raw)) {
            if ($raw === false) {
                $this->addImportWarning('product_marked_draft', [
                    'sku' => $this->currentImportSkuContext,
                    'status_value' => 'false',
                    'message' => "Product imported as draft because status value is 'false'.",
                ]);
            }
            return $raw;
        }

        if (is_numeric($raw)) {
            $isActive = ((int) $raw) === 1;
            if (!$isActive) {
                $this->addImportWarning('product_marked_draft', [
                    'sku' => $this->currentImportSkuContext,
                    'status_value' => (string) $raw,
                    'message' => "Product imported as draft because status value is '{$raw}'.",
                ]);
            }
            return $isActive;
        }

        $token = Str::lower(trim((string) $raw));
        if ($token === '') {
            return true;
        }

        $truthy = [
            'true',
            '1',
            'yes',
            'y',
            'active',
            'enabled',
            'enable',
            'publish',
            'published',
            'public',
            'on',
            'visible',
            'live',
        ];

        if (in_array($token, $truthy, true)) {
            return true;
        }

        $falsy = [
            'false',
            '0',
            'no',
            'n',
            'inactive',
            'disabled',
            'disable',
            'draft',
            'off',
            'hidden',
            'private',
            'unpublished',
        ];

        if (in_array($token, $falsy, true)) {
            $this->addImportWarning('product_marked_draft', [
                'sku' => $this->currentImportSkuContext,
                'status_value' => (string) $raw,
                'message' => "Product imported as draft because status value is '{$raw}'.",
            ]);
            return false;
        }

        $this->addImportWarning('status_value_unrecognized', [
            'sku' => $this->currentImportSkuContext,
            'status_value' => (string) $raw,
            'message' => "Unrecognized status '{$raw}'. Defaulted to published.",
        ]);

        return true;
    }

    protected function addImportWarning(string $type, array $warning): void
    {
        $payload = $warning;
        $payload['type'] = $type;

        if (!array_key_exists('sku', $payload)) {
            $payload['sku'] = $this->currentImportSkuContext;
        }

        $this->importWarnings[] = $payload;
    }

    protected function countImportWarningsForSkuByType(?string $sku, string $type): int
    {
        if ($sku === null || $sku === '' || $type === '') {
            return 0;
        }

        $count = 0;
        foreach ($this->importWarnings as $warning) {
            if (($warning['type'] ?? null) !== $type) {
                continue;
            }

            if ((string) ($warning['sku'] ?? '') === $sku) {
                $count++;
            }
        }

        return $count;
    }

    protected function countImportImageReferences(array $data): int
    {
        $keys = [
            'main_image_url',
            'image_url',
            'main_image',
            'image',
            'gallery_images',
            'additional_images',
            'gallery_image_urls',
            'images',
        ];

        $count = 0;
        foreach ($keys as $key) {
            $value = $data[$key] ?? null;
            if ($value === null) {
                continue;
            }

            if (is_array($value)) {
                foreach ($value as $item) {
                    if (trim((string) $item) !== '') {
                        $count++;
                    }
                }
                continue;
            }

            $parts = $this->parseDelimitedList((string) $value);
            $count += count($parts);
        }

        return $count;
    }

    protected function productHasAnyMedia(Product $product): bool
    {
        if ($product->getRawOriginal('product_thumbnail_id')) {
            return true;
        }

        $galleryRaw = $product->getRawOriginal('product_galleries_id');
        $galleryIds = is_string($galleryRaw)
            ? (json_decode($galleryRaw, true) ?: [])
            : (is_array($galleryRaw) ? $galleryRaw : []);
        if (!empty(array_filter($galleryIds, fn($value) => $value !== null && $value !== ''))) {
            return true;
        }

        if ($product->images()->exists()) {
            return true;
        }

        return ProductVariant::query()
            ->where('product_id', $product->id)
            ->whereNotNull('image')
            ->where('image', '!=', '')
            ->exists();
    }

    protected function enforceImportMediaCompleteness(Product $product, array $data): void
    {
        if ($this->productHasAnyMedia($product)) {
            return;
        }

        $sku = (string) ($product->sku ?? $this->currentImportSkuContext ?? '');
        $failedImageCount = $this->countImportWarningsForSkuByType($sku, 'image_localization_failed');
        $providedImageCount = $this->countImportImageReferences($data);

        if ($failedImageCount === 0 && $providedImageCount === 0) {
            return;
        }

        if ((bool) $product->is_active) {
            $product->update(['is_active' => false]);
        }

        $message = $failedImageCount > 0
            ? 'Product auto-drafted: all imported image links failed.'
            : 'Product auto-drafted: import did not produce any valid image.';

        $this->addImportWarning('product_auto_drafted_missing_images', [
            'sku' => $sku !== '' ? $sku : null,
            'message' => $message,
            'failed_images' => $failedImageCount,
            'provided_images' => $providedImageCount,
        ]);

        Log::warning('Import product auto-drafted due missing images', [
            'sku' => $sku !== '' ? $sku : null,
            'product_id' => $product->id,
            'failed_images' => $failedImageCount,
            'provided_images' => $providedImageCount,
        ]);
    }

    protected function appendImportWarningsToReportRows(array &$reportRows, string $action): void
    {
        foreach ($this->importWarnings as $warning) {
            $type = (string) ($warning['type'] ?? 'warning');
            $message = (string) ($warning['message'] ?? $type);

            if ($type === 'image_localization_failed' && !empty($warning['url'])) {
                $message = "Image localization failed: {$warning['url']}";
            }

            $reportRows[] = [
                'row_number' => null,
                'sku' => $warning['sku'] ?? null,
                'action' => $action,
                'status' => 'warning',
                'message' => $message,
            ];
        }
    }

    protected function getImportWarningsByType(): array
    {
        $summary = [];
        foreach ($this->importWarnings as $warning) {
            $type = (string) ($warning['type'] ?? 'warning');
            $summary[$type] = ($summary[$type] ?? 0) + 1;
        }

        ksort($summary);
        return $summary;
    }

    protected function getImportWarningsSample(int $limit = 50): array
    {
        $sample = [];
        foreach (array_slice($this->importWarnings, 0, max(1, $limit)) as $warning) {
            $sample[] = array_filter([
                'type' => $warning['type'] ?? 'warning',
                'sku' => $warning['sku'] ?? null,
                'url' => $warning['url'] ?? null,
                'status_value' => $warning['status_value'] ?? null,
                'failed_images' => $warning['failed_images'] ?? null,
                'provided_images' => $warning['provided_images'] ?? null,
                'message' => $warning['message'] ?? null,
            ], fn($value) => $value !== null && $value !== '');
        }

        return $sample;
    }

    protected function parseBoolean($value): bool
    {
        if (is_bool($value))
            return $value;
        $value = strtolower(trim((string) $value));
        return in_array($value, ['true', '1', 'yes', 'y', 'active', 'enabled']);
    }

    protected function parseNumber($value): float
    {
        if (is_string($value)) {
            $value = preg_replace('/[,\s]/', '', $value);
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        return 0;
    }

    protected function parseNullableNumber($value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_string($value)) {
            $value = preg_replace('/[,\s]/', '', $value);
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        return null;
    }

    protected function getUaeStoreHeaderList(): array
    {
        return array_merge(['sku'], $this->resolveUaeStoreTemplateNames());
    }

    protected function resolveUaeStoreTemplateNames(): array
    {
        $defaultStoreNames = $this->defaultUaeStoreTemplateNames();
        $defaultNameMap = [];
        foreach ($defaultStoreNames as $defaultName) {
            $defaultNameMap[$this->normalizeUaeStoreHeaderKey($defaultName)] = $defaultName;
        }

        $storeNamesByKey = [];
        $orderedKeys = [];

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

                $key = $this->normalizeUaeStoreHeaderKey($rawKey !== '' ? $rawKey : $name);
                if ($key === '') {
                    continue;
                }

                if (!array_key_exists($key, $storeNamesByKey)) {
                    $orderedKeys[] = $key;
                }

                $storeNamesByKey[$key] = $name !== '' ? $name : strtoupper(str_replace('_', ' ', $key));
            }
        }

        foreach ($defaultStoreNames as $name) {
            $key = $this->normalizeUaeStoreHeaderKey($name);
            if ($key === '' || array_key_exists($key, $storeNamesByKey)) {
                continue;
            }

            $orderedKeys[] = $key;
            $storeNamesByKey[$key] = $name;
        }

        if (Schema::hasTable('uae_store_on_hand_raw') && Schema::hasColumn('uae_store_on_hand_raw', 'store_code')) {
            $extraCodes = DB::table('uae_store_on_hand_raw')
                ->select('store_code')
                ->whereNotNull('store_code')
                ->where('store_code', '!=', '')
                ->distinct()
                ->orderBy('store_code')
                ->pluck('store_code')
                ->all();

            foreach ($extraCodes as $code) {
                $key = $this->normalizeUaeStoreHeaderKey($code);
                if ($key === '' || array_key_exists($key, $storeNamesByKey)) {
                    continue;
                }

                $orderedKeys[] = $key;
                $storeNamesByKey[$key] = $defaultNameMap[$key] ?? strtoupper(str_replace('_', ' ', $key));
            }
        }

        $headers = [];
        foreach ($orderedKeys as $key) {
            $headers[] = $storeNamesByKey[$key];
        }

        return $headers;
    }

    protected function defaultUaeStoreTemplateNames(): array
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

    protected function normalizeUaeStoreHeaderKey($value): string
    {
        $key = strtolower(trim((string) $value));
        $key = preg_replace('/[^a-z0-9]+/', '_', $key) ?? '';
        return trim($key, '_');
    }

    protected function normalizeHeaderCell($value): string
    {
        $value = trim((string) $value);
        $value = preg_replace('/^\xEF\xBB\xBF/', '', $value);
        return $value;
    }

    protected function parseCsvInteger($value): ?int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        $value = trim((string) $value);
        if ($value === '') {
            return 0;
        }

        if (!ctype_digit($value)) {
            return null;
        }

        $intValue = (int) $value;
        if ($intValue < 0) {
            return null;
        }

        return $intValue;
    }

    protected function getUaeStoreColumnMap(array $storeNames): array
    {
        $map = [];
        if (!Schema::hasTable('uae_store_priority')) {
            foreach ($storeNames as $storeName) {
                $key = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $storeName));
                $map[$storeName] = trim($key, '_');
            }
            return $map;
        }

        $storeCodeColumn = Schema::hasColumn('uae_store_priority', 'store_key') ? 'store_key' : 'store_code';
        $priorityRows = DB::table('uae_store_priority')
            ->select(['store_name', $storeCodeColumn])
            ->get();

        $priorityMap = [];
        foreach ($priorityRows as $row) {
            $storeName = strtolower(trim((string) ($row->store_name ?? '')));
            $storeCode = trim((string) ($row->{$storeCodeColumn} ?? ''));

            if ($storeName !== '' && $storeCode !== '') {
                $priorityMap[$storeName] = $storeCode;
            }
        }

        foreach ($storeNames as $storeName) {
            $key = $priorityMap[strtolower($storeName)] ?? null;
            if (!$key) {
                $key = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $storeName));
                $key = trim($key, '_');
            }
            $map[$storeName] = $key;
        }

        return $map;
    }

    protected function ensureUaeStorePriorityEntries(array $storeNames, array $storeColumnMap): void
    {
        if (!Schema::hasTable('uae_store_priority')) {
            return;
        }

        $storeCodeColumn = Schema::hasColumn('uae_store_priority', 'store_key') ? 'store_key' : 'store_code';
        $existing = DB::table('uae_store_priority')
            ->select(['store_name', $storeCodeColumn])
            ->get();

        $existingCodes = [];
        $maxPriority = 0;
        foreach ($existing as $row) {
            $code = trim((string) ($row->{$storeCodeColumn} ?? ''));
            if ($code !== '') {
                $existingCodes[strtolower($code)] = true;
            }

            if (isset($row->priority) && is_numeric($row->priority)) {
                $maxPriority = max($maxPriority, (int) $row->priority);
            }
        }

        $now = now();
        foreach ($storeNames as $storeName) {
            $code = trim((string) ($storeColumnMap[$storeName] ?? ''));
            if ($code === '') {
                continue;
            }

            $codeKey = strtolower($code);
            if (isset($existingCodes[$codeKey])) {
                continue;
            }

            $maxPriority++;
            DB::table('uae_store_priority')->insert([
                $storeCodeColumn => $code,
                'store_name' => $storeName,
                'priority' => $maxPriority,
                'is_active' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $existingCodes[$codeKey] = true;
        }
    }

    protected function downloadUaeStoreQuantityCsvTemplate()
    {
        $headers = $this->getUaeStoreHeaderList();
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        foreach ($headers as $index => $header) {
            $this->setCellByColRow($sheet, $index + 1, 1, $header);
        }

        $headerRange = 'A1:' . $this->getColumnLetter(count($headers)) . '1';
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        foreach (range(1, count($headers)) as $col) {
            $sheet->getColumnDimension($this->getColumnLetter($col))->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'uae_store_quantity_') . '.xlsx';
        $writer->save($tempFile);

        $filename = 'uae_store_quantity_template.xlsx';
        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    protected function importUaeStoreQuantityCsv(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:10240',
            'action' => 'required|string',
        ]);
        if ($this->normalizeImportAction($validated['action']) !== 'update_quantity') {
            return $this->error('Invalid action for this endpoint.', 422);
        }


        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, ['xlsx', 'xls'])) {
            return $this->error('Only Excel (.xlsx) files are allowed for Update Quantity.', 422);
        }

        $start = microtime(true);

        if (!Schema::hasTable('uae_store_on_hand_raw')) {
            return $this->error('Inventory table is not configured.', 500);
        }

        if (!Schema::hasColumn('uae_store_on_hand_raw', 'sku')
            || !Schema::hasColumn('uae_store_on_hand_raw', 'quantity')
            || !Schema::hasColumn('uae_store_on_hand_raw', 'store_code')) {
            return $this->error('Inventory table schema is invalid. Expected sku, quantity, store_code columns.', 500);
        }

        $spreadsheet = IOFactory::load($file->getPathname());
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();

        if (empty($rows)) {
            return $this->error('File is empty.', 400);
        }

        $rawHeader = $rows[0] ?? [];
        if (empty(array_filter($rawHeader, fn($value) => trim((string) $value) !== ''))) {
            return $this->error('Header row is missing.', 422);
        }

        $headerRow = array_map(function ($h) {
            return $this->normalizeHeaderCell($h);
        }, $rawHeader);

        $headerIndexMap = [];
        $effectiveHeaders = [];
        foreach ($headerRow as $index => $header) {
            $header = trim((string) $header);
            if ($header === '') {
                continue;
            }

            $headerKey = strtolower($header);
            if (array_key_exists($headerKey, $headerIndexMap)) {
                return $this->error("Duplicate header detected: {$header}", 422);
            }

            $headerIndexMap[$headerKey] = $index;
            $effectiveHeaders[] = $header;
        }

        if (!array_key_exists('sku', $headerIndexMap)) {
            return $this->error('Header must include sku column.', 422);
        }

        $quantityColumnIndex = $headerIndexMap['quantity'] ?? null;
        $storeNames = [];
        $storeColumnIndexes = [];
        foreach ($effectiveHeaders as $header) {
            $key = strtolower($header);
            if (in_array($key, ['sku', 'quantity'], true)) {
                continue;
            }
            $storeNames[] = $header;
            $storeColumnIndexes[$header] = $headerIndexMap[$key];
        }

        if (empty($storeNames)) {
            return $this->error('Header must include at least one store column.', 422);
        }

        $storeColumnMap = $this->getUaeStoreColumnMap($storeNames);
        $errorHeaders = array_values(array_merge(
            ['sku'],
            $quantityColumnIndex !== null ? ['quantity'] : [],
            $storeNames
        ));

        $rows = array_slice($rows, 1);

        $summary = [
            'rows_in_file' => count($rows),
            'imported_rows' => 0,
            'updated_skus' => 0,
            'inserted_skus' => 0,
            'skipped_rows' => 0,
            'duplicate_skus_merged' => 0,
            'missing_in_product_variants_count' => 0,
            'duration_ms' => 0,
        ];
        $processedRowsForProgress = 0;

        $this->stats = ['rows_failed' => 0];
        $this->errorRows = [];
        $reportRows = [];

        $merged = [];

        foreach ($rows as $rowIndex => $row) {
            $rowNumber = $rowIndex + 2;

            if (empty(array_filter($row, fn($value) => trim((string) $value) !== ''))) {
                $summary['skipped_rows']++;
                continue;
            }
            $processedRowsForProgress++;
            $this->updateCurrentImportProgress($processedRowsForProgress);

            $sku = trim((string) ($row[$headerIndexMap['sku']] ?? ''));
            if ($sku === '') {
                $this->addErrorRow($rowNumber, $row, $errorHeaders, 'SKU is required');
                $summary['skipped_rows']++;
                $reportRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => null,
                    'status' => 'failed',
                    'message' => 'SKU is required',
                ];
                continue;
            }

            $storeTotals = [];
            $invalidRow = false;

            foreach ($storeNames as $storeName) {
                $value = $row[$storeColumnIndexes[$storeName]] ?? '';
                $qty = $this->parseCsvInteger($value);
                if ($qty === null) {
                    $this->addErrorRow($rowNumber, $row, $errorHeaders, "{$storeName} must be an integer (0 or greater)");
                    $invalidRow = true;
                    break;
                }
                $storeKey = $storeColumnMap[$storeName];
                $storeTotals[$storeKey] = $qty;
            }

            if ($invalidRow) {
                $summary['skipped_rows']++;
                $reportRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => $sku,
                    'status' => 'failed',
                    'message' => 'Invalid store quantity value',
                ];
                continue;
            }

            $quantity = 0;
            if ($quantityColumnIndex !== null) {
                $quantityValue = $row[$quantityColumnIndex] ?? '';
                $quantity = $this->parseCsvInteger($quantityValue);
                if ($quantity === null) {
                    $this->addErrorRow($rowNumber, $row, $errorHeaders, 'quantity must be an integer (0 or greater)');
                    $summary['skipped_rows']++;
                    $reportRows[] = [
                        'row_number' => $rowNumber,
                        'sku' => $sku,
                        'status' => 'failed',
                        'message' => 'quantity must be an integer (0 or greater)',
                    ];
                    continue;
                }
            }

            $storeSum = array_sum($storeTotals);
            if ($storeSum <= 0 && $quantity > 0) {
                $parentStoreKey = $storeColumnMap['UAE'] ?? $storeColumnMap['Warehouse'] ?? 'uae';
                $storeTotals[$parentStoreKey] = ($storeTotals[$parentStoreKey] ?? 0) + $quantity;
                $storeSum = array_sum($storeTotals);
            }
            $quantity = $storeSum > 0 ? $storeSum : 0;

            $skuKey = strtoupper($sku);
            if (!isset($merged[$skuKey])) {
                $merged[$skuKey] = [
                    'sku' => $sku,
                    'stores' => $storeTotals,
                    'row_numbers' => [$rowNumber],
                ];
            } else {
                $summary['duplicate_skus_merged']++;
                foreach ($storeTotals as $storeKey => $qty) {
                    $merged[$skuKey]['stores'][$storeKey] = ($merged[$skuKey]['stores'][$storeKey] ?? 0) + $qty;
                }
                $merged[$skuKey]['row_numbers'][] = $rowNumber;
            }

            $merged[$skuKey]['quantity'] = array_sum($merged[$skuKey]['stores']);
            $reportRows[] = [
                'row_number' => $rowNumber,
                'sku' => $sku,
                'status' => 'queued',
                'message' => 'Row validated',
            ];
        }

        $summary['imported_rows'] = count($merged);

        try {
            DB::beginTransaction();

            if (Schema::hasTable('uae_store_update_import')) {
                DB::table('uae_store_update_import')->delete();
            }

            $this->ensureUaeStorePriorityEntries($storeNames, $storeColumnMap);

            $skus = array_values(array_map(fn($item) => $item['sku'], $merged));
            $existingSkus = DB::table('uae_store_on_hand_raw')
                ->whereIn('sku', $skus)
                ->distinct()
                ->pluck('sku')
                ->all();
            $existingLookup = array_flip($existingSkus);

            $variantSkus = DB::table('product_variants')
                ->whereIn('sku', $skus)
                ->pluck('sku')
                ->all();
            $variantLookup = array_flip($variantSkus);

            $productSkus = DB::table('products')
                ->whereIn('sku', $skus)
                ->pluck('sku')
                ->all();
            $productLookup = array_flip($productSkus);

            $summary['missing_in_product_variants_count'] = count(array_diff($skus, $variantSkus));

            foreach ($merged as $item) {
                $sku = (string) ($item['sku'] ?? '');
                if ($sku === '') {
                    continue;
                }

                $rowNumbers = $item['row_numbers'] ?? [];
                $reportRowNumber = $rowNumbers[0] ?? null;
                $stores = $item['stores'] ?? [];
                $totalQty = (int) array_sum($stores);
                $now = now();
                $inventoryBeforeSnapshot = $this->currentImportHistory
                    ? $this->snapshotInventorySku($sku)
                    : null;

                // Replace per-store rows for this SKU.
                DB::table('uae_store_on_hand_raw')->where('sku', $sku)->delete();

                $rowsToInsert = [];
                foreach ($stores as $storeCode => $qty) {
                    $storeCode = trim((string) $storeCode);
                    $qty = (int) $qty;

                    if ($storeCode === '' || $qty <= 0) {
                        continue;
                    }

                    $rowsToInsert[] = [
                        'sku' => $sku,
                        'store_code' => $storeCode,
                        'quantity' => $qty,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if (empty($rowsToInsert)) {
                    // Keep explicit zero row so SKU stays visible in store inventory exports.
                    $rowsToInsert[] = [
                        'sku' => $sku,
                        'store_code' => trim((string) ($storeColumnMap['Warehouse'] ?? $storeColumnMap['06 Mall'] ?? 'uae')),
                        'quantity' => 0,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                DB::table('uae_store_on_hand_raw')->insert($rowsToInsert);

                if (isset($existingLookup[$sku])) {
                    $summary['updated_skus']++;
                } else {
                    $summary['inserted_skus']++;
                }

                if (isset($variantLookup[$sku])) {
                    DB::table('product_variants')
                        ->where('sku', $sku)
                        ->update(['stock_quantity' => $totalQty, 'updated_at' => $now]);
                }

                if (isset($productLookup[$sku])) {
                    DB::table('products')
                        ->where('sku', $sku)
                        ->update([
                            'stock_quantity' => $totalQty,
                            'stock_status' => $totalQty > 0 ? 'in_stock' : 'out_of_stock',
                            'updated_at' => $now,
                        ]);
                }

                $reportRows[] = [
                    'row_number' => $reportRowNumber,
                    'sku' => $sku,
                    'status' => isset($existingLookup[$sku]) ? 'updated' : 'inserted',
                    'message' => isset($existingLookup[$sku]) ? 'Updated' : 'Inserted',
                ];

                $this->recordInventoryHistoryItem($sku, 'updated', $inventoryBeforeSnapshot, $this->snapshotInventorySku($sku));
            }

            DB::commit();
        } catch (\Exception $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            Log::error('UAE quantity import failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $this->markCurrentImportHistoryFailed($e->getMessage());
            return $this->error('Import failed: ' . $e->getMessage(), 500);
        }

        $summary['duration_ms'] = (int) round((microtime(true) - $start) * 1000);

        Log::info('UAE store quantity import completed', [
            'file_name' => $file->getClientOriginalName(),
            'user_id' => optional($request->user())->id,
            'summary' => $summary,
            'timestamp' => now()->toDateTimeString(),
        ]);

        $reportUrl = $this->generateUaeStoreQuantityReportFile($reportRows, 'uae_store_quantity_report_');

        $response = [
            'success' => true,
            'summary' => $summary,
            'message' => 'UAE store quantities updated successfully.',
            'report_url' => $reportUrl,
        ];

        if (!empty($this->errorRows)) {
            $errorFileUrl = $this->generateErrorFile($errorHeaders);
            $response['error_file'] = $errorFileUrl;
            $response['errors_count'] = count($this->errorRows);
        }

        $this->finalizeCurrentImportHistorySuccess($response);
        return $this->success($response, $response['message']);
    }

    protected function importUpdateTitles(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'action' => 'required|string',
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        if (in_array($extension, ['xlsx', 'xls'])) {
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();
        } else {
            $handle = fopen($file->getPathname(), 'r');
            if (!$handle) {
                return $this->error('Failed to open file.', 400);
            }
            $rows = [];
            while (($row = fgetcsv($handle)) !== false) {
                $rows[] = $row;
            }
            fclose($handle);
        }

        if (empty($rows)) {
            return $this->error('File is empty.', 400);
        }

        $rawHeader = $rows[0] ?? [];
        if (empty(array_filter($rawHeader, fn($value) => trim((string) $value) !== ''))) {
            return $this->error('Header row is missing.', 422);
        }

        $headers = array_map(function ($h) {
            return strtolower(trim(str_replace(' ', '_', $this->normalizeHeaderCell($h))));
        }, $rawHeader);

        $rows = array_slice($rows, 1);

        $stats = [
            'rows_processed' => 0,
            'products_updated' => 0,
            'skipped_not_found' => 0,
            'rows_failed_validation' => 0,
        ];
        $failedRows = [];
        $reportRows = [];

        $columnIndex = array_flip($headers);
        $hasDescription = array_key_exists('description', $columnIndex);
        $hasNameAr = array_key_exists('name_ar', $columnIndex);
        $hasDescriptionAr = array_key_exists('description_ar', $columnIndex);
        $hasShortDescription = array_key_exists('short_description', $columnIndex);
        $hasShortDescriptionAr = array_key_exists('short_description_ar', $columnIndex);
        $hasName = array_key_exists('name', $columnIndex);
        $hasSku = array_key_exists('sku', $columnIndex);

        if (!$hasSku || !$hasName) {
            return $this->error('Missing required columns: sku and name are required.', 422);
        }

        $rowPayloads = [];
        $skus = [];

        foreach ($rows as $rowIndex => $row) {
            $rowNumber = $rowIndex + 2;
            $stats['rows_processed']++;
            $this->updateCurrentImportProgress($stats['rows_processed']);

            if (empty(array_filter($row, fn($value) => trim((string) $value) !== ''))) {
                continue;
            }

            $sku = trim((string) ($row[$columnIndex['sku']] ?? ''));
            $name = trim((string) ($row[$columnIndex['name']] ?? ''));

            if ($sku === '') {
                $stats['rows_failed_validation']++;
                $failedRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => null,
                    'reason' => 'SKU is required',
                ];
                $reportRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => null,
                    'action' => 'update_title',
                    'status' => 'failed',
                    'message' => 'SKU is required',
                ];

                continue;
            }


            if ($name === '') {
                $stats['rows_failed_validation']++;
                $failedRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => $sku,
                    'reason' => 'Name is required',
                ];
                $reportRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => $sku,
                    'action' => 'update_title',
                    'status' => 'failed',
                    'message' => 'Name is required',
                ];
                continue;
            }

            $payload = [
                'row_number' => $rowNumber,
                'sku' => $sku,
                'name' => $name,
                'description' => $hasDescription ? trim((string) ($row[$columnIndex['description']] ?? '')) : null,
                'name_ar' => $hasNameAr ? trim((string) ($row[$columnIndex['name_ar']] ?? '')) : null,
                'description_ar' => $hasDescriptionAr ? trim((string) ($row[$columnIndex['description_ar']] ?? '')) : null,
                'short_description' => $hasShortDescription ? trim((string) ($row[$columnIndex['short_description']] ?? '')) : null,
                'short_description_ar' => $hasShortDescriptionAr ? trim((string) ($row[$columnIndex['short_description_ar']] ?? '')) : null,
            ];

            $rowPayloads[] = $payload;
            $skus[] = $sku;
        }

        if (empty($rowPayloads)) {
            $reportUrl = $this->generateActionReportFile($reportRows, 'product_update_title_report_');
            return $this->success([
                'summary' => $stats,
                'failed_rows' => $failedRows,
                'report_url' => $reportUrl,
            ], 'No valid rows to process.');
        }

        $products = DB::table('products')
            ->select(['id', 'sku', 'slug'])
            ->whereIn('sku', $skus)
            ->get()
            ->keyBy('sku');

        $updates = [];
        foreach ($rowPayloads as $payload) {
            $product = $products->get($payload['sku']);
            if (!$product) {
                $stats['skipped_not_found']++;
                $failedRows[] = [
                    'row_number' => $payload['row_number'],
                    'sku' => $payload['sku'],
                    'reason' => 'SKU not found',
                ];
                $reportRows[] = [
                    'row_number' => $payload['row_number'],
                    'sku' => $payload['sku'],
                    'action' => 'update_title',
                    'status' => 'skipped',
                    'message' => 'SKU not found',
                ];
                continue;
            }

            $name = $payload['name'];
            $baseSlug = Str::slug($name);
            if ($baseSlug === '') {
                $baseSlug = Str::slug($payload['sku']) ?: $payload['sku'];
            }

            $updates[] = [
                'id' => $product->id,
                'sku' => $payload['sku'],
                'name' => $name,
                'description' => $hasDescription ? ($payload['description'] === '' ? null : $payload['description']) : null,
                'name_ar' => $hasNameAr ? ($payload['name_ar'] === '' ? null : $payload['name_ar']) : null,
                'description_ar' => $hasDescriptionAr ? ($payload['description_ar'] === '' ? null : $payload['description_ar']) : null,
                'short_description' => $hasShortDescription ? ($payload['short_description'] === '' ? null : $payload['short_description']) : null,
                'short_description_ar' => $hasShortDescriptionAr ? ($payload['short_description_ar'] === '' ? null : $payload['short_description_ar']) : null,
                'base_slug' => $baseSlug,
            ];
            $reportRows[] = [
                'row_number' => $payload['row_number'],
                'sku' => $payload['sku'],
                'action' => 'update_title',
                'status' => 'updated',
                'message' => 'Updated',
            ];
        }

        if (empty($updates)) {
            $reportUrl = $this->generateActionReportFile($reportRows, 'product_update_title_report_');
            return $this->success([
                'summary' => $stats,
                'failed_rows' => $failedRows,
                'report_url' => $reportUrl,
            ], 'No matching SKUs to update.');
        }

        $chunks = array_chunk($updates, 500);
        $beforeProductSnapshots = [];

        if ($this->currentImportHistory && !empty($updates)) {
            $beforeProducts = Product::withTrashed()
                ->whereIn('id', array_values(array_unique(array_column($updates, 'id'))))
                ->get()
                ->keyBy('id');

            foreach ($beforeProducts as $productId => $product) {
                $beforeProductSnapshots[(int) $productId] = $this->snapshotProduct($product);
            }
        }

        try {
            DB::beginTransaction();

            foreach ($chunks as $chunk) {
                $ids = array_column($chunk, 'id');
                $baseSlugs = array_values(array_unique(array_map(fn($row) => $row['base_slug'], $chunk)));
                $slugRows = DB::table('products')
                    ->select(['id', 'slug'])
                    ->whereIn('slug', $baseSlugs)
                    ->get();

                $slugMap = [];
                foreach ($slugRows as $row) {
                    $slugMap[$row->slug] = $row->id;
                }

                $finalSlugs = [];
                foreach ($chunk as $row) {
                    $slug = $row['base_slug'];
                    if (isset($slugMap[$slug]) && $slugMap[$slug] !== $row['id']) {
                        $slug = $row['base_slug'] . '-' . $row['id'];
                    }
                    $finalSlugs[$row['id']] = $slug;
                }

                $bindings = [];
                $setStatements = [];

                $setStatements[] = $this->buildCaseStatement('name', $chunk, $bindings, fn($row) => $row['name']);
                if ($hasDescription) {
                    $setStatements[] = $this->buildCaseStatement('description', $chunk, $bindings, fn($row) => $row['description']);
                }
                if ($hasNameAr) {
                    $setStatements[] = $this->buildCaseStatement('name_ar', $chunk, $bindings, fn($row) => $row['name_ar']);
                }
                if ($hasDescriptionAr) {
                    $setStatements[] = $this->buildCaseStatement('description_ar', $chunk, $bindings, fn($row) => $row['description_ar']);
                }
                if ($hasShortDescription) {
                    $setStatements[] = $this->buildCaseStatement('short_description', $chunk, $bindings, fn($row) => $row['short_description']);
                }
                if ($hasShortDescriptionAr) {
                    $setStatements[] = $this->buildCaseStatement('short_description_ar', $chunk, $bindings, fn($row) => $row['short_description_ar']);
                }
                $setStatements[] = $this->buildCaseStatement('slug', $chunk, $bindings, fn($row) => $finalSlugs[$row['id']] ?? $row['base_slug']);

                $setStatements[] = 'updated_at = NOW()';

                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $sql = 'UPDATE products SET ' . implode(', ', $setStatements) . " WHERE id IN ($placeholders)";
                $bindings = array_merge($bindings, $ids);

                DB::update($sql, $bindings);
                $stats['products_updated'] += count($chunk);
            }

            DB::commit();
        } catch (\Exception $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            Log::error('Bulk update title import failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $this->markCurrentImportHistoryFailed($e->getMessage());
            return $this->error('Import failed: ' . $e->getMessage(), 500);
        }

        if ($this->currentImportHistory && !empty($updates)) {
            $afterProducts = Product::withTrashed()
                ->whereIn('id', array_values(array_unique(array_column($updates, 'id'))))
                ->get()
                ->keyBy('id');

            foreach ($afterProducts as $productId => $product) {
                $beforeSnapshot = $beforeProductSnapshots[(int) $productId] ?? null;
                $afterSnapshot = $this->snapshotProduct($product);
                $this->recordProductHistoryItem($product, 'updated', $beforeSnapshot, $afterSnapshot);
            }
        }

        Log::info('Bulk update title import completed', [
            'file_name' => $file->getClientOriginalName(),
            'user_id' => optional($request->user())->id,
            'summary' => $stats,
            'errors' => $failedRows,
        ]);

        $reportUrl = $this->generateActionReportFile($reportRows, 'product_update_title_report_');

        $response = [
            'summary' => $stats,
            'failed_rows' => $failedRows,
            'report_url' => $reportUrl,
        ];

        $this->finalizeCurrentImportHistorySuccess($response);

        return $this->success($response, 'Products updated successfully.');
    }

    protected function importUpdatePrices(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'action' => 'required|string',
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        if (in_array($extension, ['xlsx', 'xls'])) {
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();
        } else {
            $handle = fopen($file->getPathname(), 'r');
            if (!$handle) {
                return $this->error('Failed to open file.', 400);
            }
            $rows = [];
            while (($row = fgetcsv($handle)) !== false) {
                $rows[] = $row;
            }
            fclose($handle);
        }

        if (empty($rows)) {
            return $this->error('File is empty.', 400);
        }

        $rawHeader = $rows[0] ?? [];
        if (empty(array_filter($rawHeader, fn($value) => trim((string) $value) !== ''))) {
            return $this->error('Header row is missing.', 422);
        }

        $headers = array_map(function ($h) {
            return strtolower(trim(str_replace(' ', '_', $this->normalizeHeaderCell($h))));
        }, $rawHeader);

        $rows = array_slice($rows, 1);

        $columnIndex = array_flip($headers);
        $skuColumn = $columnIndex['variant_sku'] ?? $columnIndex['sku'] ?? null;
        $priceColumn = $columnIndex['regular_price'] ?? $columnIndex['price'] ?? null;
        $salePriceColumn = $columnIndex['sale_price'] ?? null;

        $hasSku = $skuColumn !== null;
        $hasProductSku = array_key_exists('product_sku', $columnIndex);
        $hasPrice = $priceColumn !== null;
        $hasSalePrice = $salePriceColumn !== null;
        $hasApplyAllVariants = array_key_exists('apply_to_all_variants', $columnIndex);

        if (!$hasSku || !$hasPrice) {
            return $this->error('Missing required columns: variant_sku and regular_price are required.', 422);
        }

        $stats = [
            'rows_processed' => 0,
            'products_updated' => 0,
            'variants_updated' => 0,
            'prices_updated' => 0,
            'skipped_not_found' => 0,
            'skipped_variant_not_found' => 0,
            'rows_failed_validation' => 0,
            'warnings_sku_mismatch' => 0,
            'skipped_rows' => 0,
        ];
        $errors = [];
        $warnings = [];
        $reportRows = [];

        $rowPayloads = [];
        $skus = [];
        $variantSkus = [];

        foreach ($rows as $rowIndex => $row) {
            $rowNumber = $rowIndex + 2;
            if (empty(array_filter($row, fn($value) => trim((string) $value) !== ''))) {
                continue;
            }

            $stats['rows_processed']++;
            $this->updateCurrentImportProgress($stats['rows_processed']);

            $sku = $hasSku ? trim((string) ($row[$skuColumn] ?? '')) : '';
            $productSku = $hasProductSku ? trim((string) ($row[$columnIndex['product_sku']] ?? '')) : '';
            if ($sku === '') {
                $stats['rows_failed_validation']++;
                $stats['skipped_rows']++;
                $errors[] = [
                    'row_number' => $rowNumber,
                    'sku' => null,
                    'variant_sku' => null,
                    'reason' => 'SKU is required',
                ];
                $reportRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => null,
                    'product_sku' => $productSku ?: null,
                    'price' => null,
                    'sale_price' => null,
                    'status' => 'failed',
                    'message' => 'SKU is required',
                ];
                continue;
            }

            $priceRaw = trim((string) ($row[$priceColumn] ?? ''));
            if ($priceRaw === '' || !is_numeric($priceRaw)) {
                $stats['rows_failed_validation']++;
                $stats['skipped_rows']++;
                $errors[] = [
                    'row_number' => $rowNumber,
                    'sku' => $sku,
                    'variant_sku' => null,
                    'reason' => 'Price is required and must be numeric',
                ];
                $reportRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => $sku,
                    'product_sku' => $productSku ?: null,
                    'price' => $priceRaw !== '' ? $priceRaw : null,
                    'sale_price' => null,
                    'status' => 'failed',
                    'message' => 'Price is required and must be numeric',
                ];
                continue;
            }

            $payload = [
                'row_number' => $rowNumber,
                'sku' => $sku,
                'product_sku' => $productSku,
                'price' => (float) $priceRaw,
                'sale_price' => $hasSalePrice ? trim((string) ($row[$salePriceColumn] ?? '')) : null,
                'apply_all_variants' => $hasApplyAllVariants ? $this->parseBoolean($row[$columnIndex['apply_to_all_variants']] ?? null) : false,
            ];

            if ($hasSalePrice && $payload['sale_price'] !== '' && !is_numeric($payload['sale_price'])) {
                $stats['rows_failed_validation']++;
                $stats['skipped_rows']++;
                $errors[] = [
                    'row_number' => $rowNumber,
                    'sku' => $sku,
                    'variant_sku' => null,
                    'reason' => 'Sale price must be numeric',
                ];
                $reportRows[] = [
                    'row_number' => $payload['row_number'],
                    'sku' => $sku,
                    'product_sku' => $productSku ?: null,
                    'price' => $priceRaw,
                    'sale_price' => $payload['sale_price'],
                    'status' => 'failed',
                    'message' => 'Sale price must be numeric',
                ];
                continue;
            }

            $rowPayloads[] = $payload;
            $variantSkus[] = $sku;
        }

        if (empty($rowPayloads)) {
            $reportUrl = $this->generateImportReportFile($reportRows, 'price_import_report_');
            return $this->success([
                'summary' => $stats,
                'errors' => $errors,
                'warnings' => $warnings,
                'report_url' => $reportUrl,
            ], 'No valid rows to process.');
        }

        $variants = collect();
        if (!empty($variantSkus)) {
            $variants = DB::table('product_variants')
                ->select(['id', 'sku', 'product_id'])
                ->whereIn('sku', $variantSkus)
                ->get()
                ->keyBy('sku');
        }

        $productSkuById = [];
        $variantProductIds = $variants->pluck('product_id')->unique()->filter()->values()->all();
        if (!empty($variantProductIds)) {
            $productSkuById = DB::table('products')
                ->whereIn('id', $variantProductIds)
                ->pluck('sku', 'id')
                ->all();
        }

        $productUpdates = [];
        $variantUpdates = [];
        $variantAllUpdates = [];
        $affectedProductIds = [];
        $productPriceIds = [];

        foreach ($rowPayloads as $payload) {
            $variantSkuValue = $payload['sku'];
            $productId = null;
            $variant = null;

            $variant = $variants->get($variantSkuValue);
            if (!$variant) {
                $stats['skipped_variant_not_found']++;
                $stats['skipped_rows']++;
                $errors[] = [
                    'row_number' => $payload['row_number'],
                    'sku' => $payload['sku'],
                    'variant_sku' => null,
                    'reason' => 'Variant SKU not found',
                ];
                $reportRows[] = [
                    'row_number' => $payload['row_number'],
                    'sku' => $payload['sku'],
                    'product_sku' => $payload['product_sku'] ?: null,
                    'price' => $payload['price'],
                    'sale_price' => $payload['sale_price'],
                    'status' => 'skipped',
                    'message' => 'Variant SKU not found',
                ];
                continue;
            }
            $productId = $variant->product_id;

            $warningMessage = null;
            if (!empty($payload['product_sku']) && isset($productSkuById[$productId]) && $payload['product_sku'] !== $productSkuById[$productId]) {
                $stats['warnings_sku_mismatch']++;
                $warningMessage = 'SKU mismatch ignored';
                $warnings[] = [
                    'row_number' => $payload['row_number'],
                    'sku' => $payload['product_sku'],
                    'variant_sku' => null,
                    'reason' => 'SKU mismatch ignored',
                ];
            }

            $salePrice = null;
            $hasSalePriceUpdate = false;
            if ($hasSalePrice) {
                if ($payload['sale_price'] === '' || $payload['sale_price'] === null) {
                    $salePrice = null;
                } else {
                    $salePriceValue = (float) $payload['sale_price'];
                    $salePrice = $salePriceValue > 0 ? $salePriceValue : null;
                }
                $hasSalePriceUpdate = true;
            }

            $variantUpdates[$variant->id] = [
                'id' => $variant->id,
                'product_id' => $productId,
                'price' => $payload['price'],
                'sale_price' => $salePrice,
                'has_sale_price' => $hasSalePriceUpdate,
            ];
            $affectedProductIds[$productId] = true;
            $reportRows[] = [
                'row_number' => $payload['row_number'],
                'sku' => $payload['sku'],
                'product_sku' => $payload['product_sku'] ?: null,
                'price' => $payload['price'],
                'sale_price' => $salePrice,
                'status' => 'updated',
                'message' => $warningMessage ?: 'Updated',
            ];
        }

        if (empty($variantUpdates)) {
            $reportUrl = $this->generateImportReportFile($reportRows, 'price_import_report_');
            return $this->success([
                'summary' => $stats,
                'errors' => $errors,
                'warnings' => $warnings,
                'report_url' => $reportUrl,
            ], 'No matching rows to update.');
        }

        $beforeVariantSnapshots = [];
        if ($this->currentImportHistory && !empty($variantUpdates)) {
            $beforeVariants = ProductVariant::query()
                ->whereIn('id', array_values(array_unique(array_keys($variantUpdates))))
                ->get()
                ->keyBy('id');

            foreach ($beforeVariants as $variantId => $variant) {
                $beforeVariantSnapshots[(int) $variantId] = $this->snapshotVariant($variant);
            }
        }

        try {
            DB::beginTransaction();

            if (!empty($variantUpdates)) {
                $variantChunks = array_chunk(array_values($variantUpdates), 500);
                foreach ($variantChunks as $chunk) {
                    $ids = array_column($chunk, 'id');
                    $bindings = [];
                    $setStatements = [];

                    $setStatements[] = $this->buildCaseStatement('price', $chunk, $bindings, fn($row) => $row['price']);

                    $saleRows = array_filter($chunk, fn($row) => $row['has_sale_price']);
                    if (!empty($saleRows)) {
                        $setStatements[] = $this->buildCaseStatement('sale_price', $saleRows, $bindings, fn($row) => $row['sale_price']);
                    }

                    $setStatements[] = 'updated_at = NOW()';
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $sql = 'UPDATE product_variants SET ' . implode(', ', $setStatements) . " WHERE id IN ($placeholders)";
                    $bindings = array_merge($bindings, $ids);
                    DB::update($sql, $bindings);
                    $stats['variants_updated'] += count($chunk);
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            Log::error('Bulk update price import failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $this->markCurrentImportHistoryFailed($e->getMessage());
            return $this->error('Import failed: ' . $e->getMessage(), 500);
        }

        if ($this->currentImportHistory && !empty($variantUpdates)) {
            $afterVariants = ProductVariant::query()
                ->whereIn('id', array_values(array_unique(array_keys($variantUpdates))))
                ->get()
                ->keyBy('id');

            foreach ($afterVariants as $variantId => $variant) {
                $beforeSnapshot = $beforeVariantSnapshots[(int) $variantId] ?? null;
                $afterSnapshot = $this->snapshotVariant($variant);
                $this->recordVariantHistoryItem($variant, 'updated', $beforeSnapshot, $afterSnapshot);
            }
        }

        $stats['prices_updated'] = $stats['variants_updated'];

        $resolver = app(PriceResolver::class);
        $productIds = array_keys($affectedProductIds);
        foreach (array_chunk($productIds, 100) as $chunk) {
            $productsChunk = Product::whereIn('id', $chunk)->get(['id', 'price', 'sale_price']);
            foreach ($productsChunk as $product) {
                $resolver->refreshCachedPrices($product);
            }
        }

        $this->refreshStorefrontCachesForProducts($productIds);

        $reportUrl = $this->generateImportReportFile($reportRows, 'price_import_report_');

        Log::info('Bulk update price import completed', [
            'file_name' => $file->getClientOriginalName(),
            'user_id' => optional($request->user())->id,
            'summary' => $stats,
            'errors' => $errors,
            'warnings' => $warnings,
            'report_url' => $reportUrl,
        ]);

        $response = [
            'summary' => $stats,
            'errors' => $errors,
            'warnings' => $warnings,
            'report_url' => $reportUrl,
        ];

        $this->finalizeCurrentImportHistorySuccess($response);

        return $this->success($response, 'Products updated successfully.');
    }

    protected function importUpdateParentPrices(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'action' => 'required|string',
        ]);

        if ($this->normalizeImportAction($validated['action']) !== 'update_parent_price') {
            return $this->error('Invalid action for this endpoint.', 422);
        }

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        if (in_array($extension, ['xlsx', 'xls'])) {
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();
        } else {
            $handle = fopen($file->getPathname(), 'r');
            if (!$handle) {
                return $this->error('Failed to open file.', 400);
            }

            $rows = [];
            while (($row = fgetcsv($handle)) !== false) {
                $rows[] = $row;
            }
            fclose($handle);
        }

        if (empty($rows)) {
            return $this->error('File is empty.', 400);
        }

        $rawHeader = $rows[0] ?? [];
        if (empty(array_filter($rawHeader, fn($value) => trim((string) $value) !== ''))) {
            return $this->error('Header row is missing.', 422);
        }

        $headers = array_map(function ($header) {
            return strtolower(trim(str_replace(' ', '_', $this->normalizeHeaderCell($header))));
        }, $rawHeader);

        $columnIndex = array_flip($headers);
        $articleColumn = $columnIndex['article'] ?? $columnIndex['sku'] ?? $columnIndex['product_sku'] ?? null;
        $priceColumn = $columnIndex['price'] ?? $columnIndex['regular_price'] ?? null;

        if ($articleColumn === null || $priceColumn === null) {
            return $this->error('Missing required columns: Article and Price are required.', 422);
        }

        $stats = [
            'processed' => 0,
            'updated' => 0,
            'prices_updated' => 0,
            'not_found' => 0,
            'skipped_rows' => 0,
            'rows_failed_validation' => 0,
        ];
        $errors = [];
        $warnings = [];
        $reportRows = [];
        $rowPayloads = [];
        $articles = [];

        foreach (array_slice($rows, 1) as $rowIndex => $row) {
            $rowNumber = $rowIndex + 2;
            if (empty(array_filter($row, fn($value) => trim((string) $value) !== ''))) {
                continue;
            }

            $stats['processed']++;
            $this->updateCurrentImportProgress($stats['processed']);

            $article = trim((string) ($row[$articleColumn] ?? ''));
            if ($article === '') {
                $stats['rows_failed_validation']++;
                $stats['skipped_rows']++;
                $errors[] = [
                    'row_number' => $rowNumber,
                    'sku' => null,
                    'variant_sku' => null,
                    'reason' => 'Article is required',
                ];
                $reportRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => null,
                    'product_sku' => null,
                    'price' => null,
                    'sale_price' => null,
                    'status' => 'failed',
                    'message' => 'Article is required',
                ];
                continue;
            }

            $priceRaw = trim((string) ($row[$priceColumn] ?? ''));
            if ($priceRaw === '' || !is_numeric($priceRaw)) {
                $stats['rows_failed_validation']++;
                $stats['skipped_rows']++;
                $errors[] = [
                    'row_number' => $rowNumber,
                    'sku' => $article,
                    'variant_sku' => null,
                    'reason' => 'Price is required and must be numeric',
                ];
                $reportRows[] = [
                    'row_number' => $rowNumber,
                    'sku' => $article,
                    'product_sku' => null,
                    'price' => $priceRaw !== '' ? $priceRaw : null,
                    'sale_price' => null,
                    'status' => 'failed',
                    'message' => 'Price is required and must be numeric',
                ];
                continue;
            }

            $rowPayloads[] = [
                'row_number' => $rowNumber,
                'article' => $article,
                'price' => (float) $priceRaw,
            ];
            $articles[] = $article;
        }

        if (empty($rowPayloads)) {
            $reportUrl = $this->generateImportReportFile($reportRows, 'parent_price_import_report_');
            return $this->success([
                'summary' => $stats,
                'errors' => $errors,
                'warnings' => $warnings,
                'report_url' => $reportUrl,
            ], 'No valid rows to process.');
        }

        $products = Product::query()
            ->select(['id', 'sku'])
            ->whereIn('sku', array_values(array_unique($articles)))
            ->get()
            ->keyBy('sku');
        $beforeProductSnapshots = [];

        if ($this->currentImportHistory && $products->isNotEmpty()) {
            $beforeProducts = Product::withTrashed()
                ->whereIn('id', $products->pluck('id')->all())
                ->get()
                ->keyBy('id');

            foreach ($beforeProducts as $productId => $productModel) {
                $beforeProductSnapshots[(int) $productId] = $this->snapshotProduct($productModel);
            }
        }

        $updatedProductIds = [];

        try {
            DB::beginTransaction();

            foreach ($rowPayloads as $payload) {
                $product = $products->get($payload['article']);

                if (!$product) {
                    $stats['not_found']++;
                    $stats['skipped_rows']++;
                    $errors[] = [
                        'row_number' => $payload['row_number'],
                        'sku' => $payload['article'],
                        'variant_sku' => null,
                        'reason' => 'Parent product Article not found',
                    ];
                    $reportRows[] = [
                        'row_number' => $payload['row_number'],
                        'sku' => $payload['article'],
                        'product_sku' => null,
                        'price' => $payload['price'],
                        'sale_price' => null,
                        'status' => 'skipped',
                        'message' => 'Parent product Article not found',
                    ];
                    continue;
                }

                Product::where('id', $product->id)->update([
                    'price' => $payload['price'],
                    'updated_at' => now(),
                ]);

                $updatedProductIds[] = $product->id;
                $stats['updated']++;
                $stats['prices_updated']++;

                $reportRows[] = [
                    'row_number' => $payload['row_number'],
                    'sku' => $payload['article'],
                    'product_sku' => $product->sku,
                    'price' => $payload['price'],
                    'sale_price' => null,
                    'status' => 'updated',
                    'message' => 'Updated',
                ];
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Bulk update parent price import failed', [
                'file_name' => $file->getClientOriginalName(),
                'user_id' => optional($request->user())->id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->markCurrentImportHistoryFailed($e->getMessage());
            return $this->error('Failed to update parent prices.', 500);
        }

        $updatedProductIds = array_values(array_unique($updatedProductIds));
        if ($this->currentImportHistory && !empty($updatedProductIds)) {
            $afterProducts = Product::withTrashed()
                ->whereIn('id', $updatedProductIds)
                ->get()
                ->keyBy('id');

            foreach ($afterProducts as $productId => $productModel) {
                $beforeSnapshot = $beforeProductSnapshots[(int) $productId] ?? null;
                $afterSnapshot = $this->snapshotProduct($productModel);
                $this->recordProductHistoryItem($productModel, 'updated', $beforeSnapshot, $afterSnapshot);
            }
        }

        if (!empty($updatedProductIds)) {
            $resolver = app(PriceResolver::class);
            foreach (array_chunk($updatedProductIds, 100) as $chunk) {
                $productsChunk = Product::whereIn('id', $chunk)->get(['id', 'price', 'sale_price']);
                foreach ($productsChunk as $product) {
                    $resolver->refreshCachedPrices($product);
                }
            }

            $this->refreshStorefrontCachesForProducts($updatedProductIds);
        }

        $reportUrl = $this->generateImportReportFile($reportRows, 'parent_price_import_report_');

        Log::info('Bulk update parent price import completed', [
            'file_name' => $file->getClientOriginalName(),
            'user_id' => optional($request->user())->id,
            'summary' => $stats,
            'errors' => $errors,
            'warnings' => $warnings,
            'report_url' => $reportUrl,
        ]);

        $response = [
            'summary' => $stats,
            'errors' => $errors,
            'warnings' => $warnings,
            'report_url' => $reportUrl,
        ];

        $this->finalizeCurrentImportHistorySuccess($response);

        return $this->success($response, 'Parent product prices updated successfully.');
    }

    protected function refreshStorefrontCachesForProducts(array $productIds): void
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $productIds), fn($id) => $id > 0)));
        if (empty($ids)) {
            return;
        }

        try {
            $slugsById = DB::table('products')
                ->whereIn('id', $ids)
                ->pluck('slug', 'id')
                ->all();

            foreach ($ids as $id) {
                Cache::forget("product_full_v3_{$id}");
                Cache::forget("product_variants_{$id}");
                Cache::forget("product_related_v3_{$id}_8");

                // Backward-compatible older keys
                Cache::forget("product_full_{$id}");

                $slug = trim((string) ($slugsById[$id] ?? ''));
                if ($slug !== '') {
                    Cache::forget("product_full_v3_{$slug}");
                    Cache::forget("product_full_{$slug}");
                }
            }

            $currentVersion = (int) Cache::get('products_list_version', 1);
            Cache::forever('products_list_version', max(1, $currentVersion + 1));
            Cache::forget('homepage_data_v2');
            app(ProductOfferService::class)->clearCache();
        } catch (\Throwable $e) {
            Log::warning('Failed to refresh storefront caches after import update price', [
                'message' => $e->getMessage(),
                'product_ids' => $ids,
            ]);
        }
    }

    protected function generateImportReportFile(array $rows, string $prefix): ?string
    {
        if (empty($rows)) {
            return null;
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Import Report');

        $headers = ['row_number', 'sku', 'product_sku', 'price', 'sale_price', 'status', 'message'];
        foreach ($headers as $index => $header) {
            $this->setCellByColRow($sheet, $index + 1, 1, $header);
        }

        $sheet->getStyle('A1:G1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
        ]);

        $rowIndex = 2;
        foreach ($rows as $row) {
            $sheet->setCellValue("A{$rowIndex}", $row['row_number'] ?? null);
            $sheet->setCellValue("B{$rowIndex}", $row['sku'] ?? null);
            $sheet->setCellValue("C{$rowIndex}", $row['product_sku'] ?? null);
            $sheet->setCellValue("D{$rowIndex}", $row['price'] ?? null);
            $sheet->setCellValue("E{$rowIndex}", $row['sale_price'] ?? null);
            $sheet->setCellValue("F{$rowIndex}", $row['status'] ?? null);
            $sheet->setCellValue("G{$rowIndex}", $row['message'] ?? null);

            $rowIndex++;
        }

        foreach (range('A', 'G') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = $prefix . date('Y-m-d_His') . '.xlsx';
        $path = 'imports/' . $filename;
        $tempFile = tempnam(sys_get_temp_dir(), $prefix);
        $writer->save($tempFile);

        Storage::disk('public')->put($path, file_get_contents($tempFile));
        unlink($tempFile);

        return $this->buildImportFilePublicUrl($path);
    }

    protected function generateUaeStoreQuantityReportFile(array $rows, string $prefix): ?string
    {
        if (empty($rows)) {
            return null;
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('UAE Quantity Report');

        $headers = ['row_number', 'sku', 'status', 'message'];
        foreach ($headers as $index => $header) {
            $this->setCellByColRow($sheet, $index + 1, 1, $header);
        }

        $sheet->getStyle('A1:D1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
        ]);

        $rowIndex = 2;
        foreach ($rows as $row) {
            $sheet->setCellValue("A{$rowIndex}", $row['row_number'] ?? null);
            $sheet->setCellValue("B{$rowIndex}", $row['sku'] ?? null);
            $sheet->setCellValue("C{$rowIndex}", $row['status'] ?? null);
            $sheet->setCellValue("D{$rowIndex}", $row['message'] ?? null);
            $rowIndex++;
        }

        foreach (range('A', 'D') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = $prefix . date('Y-m-d_His') . '.xlsx';
        $path = 'imports/' . $filename;

        $tempFile = tempnam(sys_get_temp_dir(), $prefix);
        $writer->save($tempFile);

        Storage::disk('public')->put($path, file_get_contents($tempFile));
        unlink($tempFile);

        return $this->buildImportFilePublicUrl($path);
    }


    protected function generateActionReportFile(array $rows, string $prefix): ?string
    {
        if (empty($rows)) {
            return null;
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Import Report');

        $headers = ['row_number', 'sku', 'action', 'status', 'message'];
        foreach ($headers as $index => $header) {
            $this->setCellByColRow($sheet, $index + 1, 1, $header);
        }

        $sheet->getStyle('A1:E1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
        ]);

        $rowIndex = 2;
        foreach ($rows as $row) {
            $sheet->setCellValue("A{$rowIndex}", $row['row_number'] ?? null);
            $sheet->setCellValue("B{$rowIndex}", $row['sku'] ?? null);
            $sheet->setCellValue("C{$rowIndex}", $row['action'] ?? null);
            $sheet->setCellValue("D{$rowIndex}", $row['status'] ?? null);
            $sheet->setCellValue("E{$rowIndex}", $row['message'] ?? null);
            $rowIndex++;
        }

        foreach (range('A', 'E') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = $prefix . date('Y-m-d_His') . '.xlsx';
        $path = 'imports/' . $filename;
        $tempFile = tempnam(sys_get_temp_dir(), $prefix);
        $writer->save($tempFile);

        Storage::disk('public')->put($path, file_get_contents($tempFile));
        unlink($tempFile);

        return $this->buildImportFilePublicUrl($path);
    }

    protected function buildCaseStatement(string $column, array $rows, array &$bindings, callable $valueResolver, string $keyColumn = 'id'): string
    {
        $sql = "{$column} = CASE {$keyColumn}";
        foreach ($rows as $row) {
            $sql .= " WHEN ? THEN ?";
            $bindings[] = $row[$keyColumn];
            $bindings[] = $valueResolver($row);
        }
        $sql .= " ELSE {$column} END";
        return $sql;
    }

    protected function getFirstValue(array $data, array $keys)
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== '' && $data[$key] !== null) {
                return $data[$key];
            }
        }
        return null;
    }

    protected function normalizeImportAction($action): ?string
    {
        $action = strtolower(trim((string) $action));
        $allowed = [
            'update_quantity',
            'update_price',
            'update_parent_price',
            'update_title',
            'new_sell',
            'add_update_category',
            'add_update_tag',
            'remove_product',
        ];
        return in_array($action, $allowed) ? $action : null;
    }

    protected function countImportDataRows(string $fullPath, string $extension): int
    {
        $rows = [];

        if (in_array($extension, ['xlsx', 'xls'], true)) {
            $spreadsheet = IOFactory::load($fullPath);
            $rows = $spreadsheet->getActiveSheet()->toArray();
        } else {
            $handle = fopen($fullPath, 'r');
            if (!$handle) {
                return 0;
            }

            while (($row = fgetcsv($handle)) !== false) {
                $rows[] = $row;
            }
            fclose($handle);
        }

        if (empty($rows)) {
            return 0;
        }

        return count(array_filter(array_slice($rows, 1), function ($row) {
            return !empty(array_filter((array) $row, fn($value) => trim((string) $value) !== ''));
        }));
    }

    protected function setCurrentImportHistory(?ImportHistory $history): void
    {
        $this->currentImportHistory = $history;
        $this->lastImportProgressPercent = -1;
    }

    protected function getImportRuntimeCacheKey(int $historyId): string
    {
        return "import_history_runtime_{$historyId}";
    }

    protected function getImportRuntimeState(int $historyId): array
    {
        $state = Cache::get($this->getImportRuntimeCacheKey($historyId));
        return is_array($state) ? $state : [];
    }

    protected function putImportRuntimeState(ImportHistory $history, array $state): void
    {
        Cache::put(
            $this->getImportRuntimeCacheKey((int) $history->id),
            array_merge([
                'status' => $history->status,
                'progress_percentage' => (int) $history->progress_percentage,
                'processed_rows' => (int) $history->processed_rows,
                'total_rows' => (int) $history->total_rows,
                'message' => null,
            ], $state),
            now()->addHours(6)
        );
    }

    protected function updateCurrentImportProgress(int $processedRows, int $cap = 95, ?string $message = null): void
    {
        if (!$this->currentImportHistory) {
            return;
        }

        $totalRows = max(1, (int) $this->currentImportHistory->total_rows);
        $processedRows = max(0, min($totalRows, $processedRows));
        $percent = (int) floor(($processedRows / $totalRows) * $cap);
        $percent = max(1, min($cap, $percent));

        if ($percent === $this->lastImportProgressPercent && $message === null) {
            return;
        }

        $this->lastImportProgressPercent = $percent;

        $this->putImportRuntimeState($this->currentImportHistory, [
            'status' => 'processing',
            'progress_percentage' => $percent,
            'processed_rows' => $processedRows,
            'total_rows' => $totalRows,
            'message' => $message ?: 'Import is processing.',
        ]);
    }

    protected function finalizeCurrentImportHistorySuccess(array $responseData): void
    {
        if (!$this->currentImportHistory) {
            return;
        }

        $summary = $responseData['summary'] ?? null;
        $message = (string) ($responseData['message'] ?? 'Import completed successfully.');
        $reportUrl = $responseData['report_url'] ?? null;
        $errorUrl = $responseData['error_file'] ?? null;

        $this->currentImportHistory->update([
            'status' => 'completed',
            'progress_percentage' => 100,
            'processed_rows' => (int) $this->currentImportHistory->total_rows,
            'summary' => $summary,
            'result_payload' => array_merge($responseData, ['message' => $message]),
            'report_file_path' => $this->extractImportStoragePathFromUrl($reportUrl),
            'error_file_path' => $this->extractImportStoragePathFromUrl($errorUrl),
            'last_error' => null,
            'completed_at' => now(),
            'failed_at' => null,
        ]);

        $this->putImportRuntimeState($this->currentImportHistory->fresh(), [
            'status' => 'completed',
            'progress_percentage' => 100,
            'processed_rows' => (int) $this->currentImportHistory->total_rows,
            'total_rows' => (int) $this->currentImportHistory->total_rows,
            'message' => $message,
        ]);
    }

    protected function markCurrentImportHistoryFailed(string $message): void
    {
        if (!$this->currentImportHistory) {
            return;
        }

        $runtime = $this->getImportRuntimeState((int) $this->currentImportHistory->id);
        $processedRows = (int) ($runtime['processed_rows'] ?? $this->currentImportHistory->processed_rows);
        $progress = (int) ($runtime['progress_percentage'] ?? $this->currentImportHistory->progress_percentage);

        $this->currentImportHistory->update([
            'status' => 'failed',
            'processed_rows' => $processedRows,
            'progress_percentage' => $progress,
            'last_error' => $message,
            'failed_at' => now(),
        ]);

        $this->putImportRuntimeState($this->currentImportHistory->fresh(), [
            'status' => 'failed',
            'progress_percentage' => $progress,
            'processed_rows' => $processedRows,
            'total_rows' => (int) $this->currentImportHistory->total_rows,
            'message' => $message,
        ]);
    }

    protected function transformImportHistory(ImportHistory $history): array
    {
        $runtime = in_array($history->status, ['pending', 'processing', 'failed'], true)
            ? $this->getImportRuntimeState((int) $history->id)
            : [];
        $resultPayload = is_array($history->result_payload) ? $history->result_payload : [];
        $summary = is_array($history->summary) ? $history->summary : [];
        $itemsCount = $history->getAttribute('items_count') !== null
            ? (int) $history->getAttribute('items_count')
            : $history->items()->count();

        $reportUrl = $resultPayload['report_url'] ?? null;
        if (!$reportUrl && $history->report_file_path) {
            $reportUrl = $this->buildImportFilePublicUrl($history->report_file_path);
        }

        $errorUrl = $resultPayload['error_file'] ?? null;
        if (!$errorUrl && $history->error_file_path) {
            $errorUrl = $this->buildImportFilePublicUrl($history->error_file_path);
        }

        return [
            'id' => (int) $history->id,
            'module' => $history->module,
            'action' => $history->action,
            'original_file_name' => $history->original_file_name,
            'status' => $runtime['status'] ?? $history->status,
            'progress_percentage' => (int) ($runtime['progress_percentage'] ?? $history->progress_percentage ?? 0),
            'processed_rows' => (int) ($runtime['processed_rows'] ?? $history->processed_rows ?? 0),
            'total_rows' => (int) ($runtime['total_rows'] ?? $history->total_rows ?? 0),
            'summary' => $summary,
            'message' => $runtime['message'] ?? $resultPayload['message'] ?? $history->last_error,
            'report_url' => $reportUrl,
            'error_file' => $errorUrl,
            'errors_count' => (int) ($resultPayload['errors_count'] ?? 0),
            'warnings_count' => (int) ($resultPayload['warnings_count'] ?? 0),
            'rollback_status' => $history->rollback_status,
            'rollback_summary' => $history->rollback_summary,
            'can_rollback' => $history->status === 'completed' && $itemsCount > 0 && $history->rollback_status !== 'completed',
            'items_count' => $itemsCount,
            'last_error' => $history->last_error,
            'created_at' => optional($history->created_at)->toISOString(),
            'started_at' => optional($history->started_at)->toISOString(),
            'completed_at' => optional($history->completed_at)->toISOString(),
            'rolled_back_at' => optional($history->rolled_back_at)->toISOString(),
        ];
    }

    protected function extractImportStoragePathFromUrl($url): ?string
    {
        $url = trim((string) $url);
        if ($url === '') {
            return null;
        }

        $path = parse_url($url, PHP_URL_PATH);
        $path = is_string($path) ? $path : $url;
        $marker = '/storage/';
        $position = strpos($path, $marker);
        if ($position === false) {
            return null;
        }

        $relativePath = substr($path, $position + strlen($marker));
        $relativePath = ltrim(str_replace('\\', '/', $relativePath), '/');

        return $relativePath !== '' ? $relativePath : null;
    }

    protected function deleteImportHistoryFiles(ImportHistory $history): void
    {
        if ($history->stored_file_path) {
            Storage::disk('local')->delete($history->stored_file_path);
        }

        foreach ([$history->report_file_path, $history->error_file_path] as $path) {
            if ($path) {
                Storage::disk('public')->delete($path);
            }
        }
    }

    protected function recordProductHistoryItem(Product $product, string $operation, ?array $beforeState, ?array $afterState): void
    {
        if (!$this->currentImportHistory) {
            return;
        }

        if ($operation === 'updated' && $this->snapshotsAreEquivalent($beforeState, $afterState)) {
            return;
        }

        ImportHistoryItem::create([
            'import_history_id' => $this->currentImportHistory->id,
            'target_type' => 'product',
            'operation' => $operation,
            'product_id' => $product->id,
            'sku' => $product->sku,
            'before_state' => $beforeState,
            'after_state' => $afterState,
        ]);
    }

    protected function recordVariantHistoryItem(ProductVariant $variant, string $operation, ?array $beforeState, ?array $afterState): void
    {
        if (!$this->currentImportHistory) {
            return;
        }

        if ($operation === 'updated' && $this->snapshotsAreEquivalent($beforeState, $afterState)) {
            return;
        }

        ImportHistoryItem::create([
            'import_history_id' => $this->currentImportHistory->id,
            'target_type' => 'variant',
            'operation' => $operation,
            'product_id' => $variant->product_id,
            'product_variant_id' => $variant->id,
            'sku' => $variant->sku,
            'before_state' => $beforeState,
            'after_state' => $afterState,
        ]);
    }

    protected function recordInventoryHistoryItem(string $sku, string $operation, ?array $beforeState, ?array $afterState): void
    {
        if (!$this->currentImportHistory) {
            return;
        }

        if ($operation === 'updated' && $this->snapshotsAreEquivalent($beforeState, $afterState)) {
            return;
        }

        ImportHistoryItem::create([
            'import_history_id' => $this->currentImportHistory->id,
            'target_type' => 'inventory_sku',
            'operation' => $operation,
            'sku' => $sku,
            'before_state' => $beforeState,
            'after_state' => $afterState,
        ]);
    }

    protected function snapshotsAreEquivalent(?array $beforeState, ?array $afterState): bool
    {
        if ($beforeState === null && $afterState === null) {
            return true;
        }

        if ($beforeState === null || $afterState === null) {
            return false;
        }

        return json_encode($beforeState) === json_encode($afterState);
    }

    protected function snapshotProduct(Product $product): array
    {
        $product = Product::withTrashed()->find($product->id) ?? $product;
        $fields = (new Product())->getFillable();
        $attributes = [];

        foreach ($fields as $field) {
            $attributes[$field] = $product->getAttribute($field);
        }

        $categoryIds = $product->categories()
            ->pluck('categories.id')
            ->map(fn($id) => (int) $id)
            ->all();
        sort($categoryIds);

        $tagIds = $product->tags()
            ->pluck('tags.id')
            ->map(fn($id) => (int) $id)
            ->all();
        sort($tagIds);

        $images = $product->images()
            ->orderBy('sort_order')
            ->get(['image', 'thumbnail', 'alt_text', 'is_primary', 'sort_order', 'product_variant_id'])
            ->map(function ($image) {
                return [
                    'image' => $image->image,
                    'thumbnail' => $image->thumbnail,
                    'alt_text' => $image->alt_text,
                    'is_primary' => (bool) $image->is_primary,
                    'sort_order' => (int) ($image->sort_order ?? 0),
                    'product_variant_id' => $image->product_variant_id ? (int) $image->product_variant_id : null,
                ];
            })
            ->values()
            ->all();

        return [
            'id' => (int) $product->id,
            'attributes' => $attributes,
            'deleted_at' => optional($product->deleted_at)->toDateTimeString(),
            'category_ids' => $categoryIds,
            'tag_ids' => $tagIds,
            'images' => $images,
        ];
    }

    protected function snapshotVariant(ProductVariant $variant): array
    {
        $fields = (new ProductVariant())->getFillable();
        $attributes = [];

        foreach ($fields as $field) {
            $attributes[$field] = $variant->getAttribute($field);
        }

        $attributeValueIds = $variant->attributeValues()
            ->pluck('attribute_values.id')
            ->map(fn($id) => (int) $id)
            ->all();
        sort($attributeValueIds);

        return [
            'id' => (int) $variant->id,
            'attributes' => $attributes,
            'attribute_value_ids' => $attributeValueIds,
        ];
    }

    protected function snapshotInventorySku(string $sku): array
    {
        $inventoryRows = [];
        if (Schema::hasTable('uae_store_on_hand_raw')) {
            $inventoryRows = DB::table('uae_store_on_hand_raw')
                ->where('sku', $sku)
                ->orderBy('store_code')
                ->get(['store_code', 'quantity'])
                ->map(fn($row) => [
                    'store_code' => (string) $row->store_code,
                    'quantity' => (int) $row->quantity,
                ])
                ->values()
                ->all();
        }

        $variant = ProductVariant::where('sku', $sku)->first();
        $product = Product::withTrashed()->where('sku', $sku)->first();

        return [
            'sku' => $sku,
            'inventory_rows' => $inventoryRows,
            'variant' => $variant ? $this->snapshotVariant($variant) : null,
            'product' => $product ? $this->snapshotProduct($product) : null,
        ];
    }

    protected function rollbackImportHistoryItem(ImportHistoryItem $item, array &$summary): void
    {
        switch ($item->target_type) {
            case 'product':
                $this->rollbackProductHistoryItem($item, $summary);
                break;
            case 'variant':
                $this->rollbackVariantHistoryItem($item, $summary);
                break;
            case 'inventory_sku':
                $this->rollbackInventoryHistoryItem($item, $summary);
                break;
            default:
                $summary['skipped']++;
                $item->update([
                    'rollback_status' => 'skipped',
                    'rollback_message' => 'Unsupported rollback target.',
                ]);
                break;
        }
    }

    protected function rollbackProductHistoryItem(ImportHistoryItem $item, array &$summary): void
    {
        if ($item->operation === 'created') {
            $product = Product::withTrashed()->find($item->product_id);
            if ($product) {
                $product->delete();
                $summary['products_removed']++;
                $this->refreshStorefrontCachesForProducts([$product->id]);
                $item->update([
                    'rollback_status' => 'completed',
                    'rollback_message' => 'Created product removed.',
                ]);
                return;
            }

            $summary['skipped']++;
            $item->update([
                'rollback_status' => 'skipped',
                'rollback_message' => 'Created product no longer exists.',
            ]);
            return;
        }

        $product = $this->restoreProductFromSnapshot($item->before_state ?? []);
        if ($product) {
            $summary['products_restored']++;
            $this->refreshStorefrontCachesForProducts([$product->id]);
            $item->update([
                'rollback_status' => 'completed',
                'rollback_message' => 'Product restored.',
            ]);
            return;
        }

        $summary['skipped']++;
        $item->update([
            'rollback_status' => 'skipped',
            'rollback_message' => 'Product snapshot could not be restored.',
        ]);
    }

    protected function rollbackVariantHistoryItem(ImportHistoryItem $item, array &$summary): void
    {
        if ($item->operation === 'created') {
            $variant = ProductVariant::find($item->product_variant_id);
            if ($variant) {
                $productId = (int) $variant->product_id;
                $variant->delete();
                $summary['variants_removed']++;
                $this->syncProductAggregatesFromVariants($productId);
                $item->update([
                    'rollback_status' => 'completed',
                    'rollback_message' => 'Created variant removed.',
                ]);
                return;
            }

            $summary['skipped']++;
            $item->update([
                'rollback_status' => 'skipped',
                'rollback_message' => 'Created variant no longer exists.',
            ]);
            return;
        }

        $variant = $this->restoreVariantFromSnapshot($item->before_state ?? []);
        if ($variant) {
            $summary['variants_restored']++;
            $this->syncProductAggregatesFromVariants((int) $variant->product_id);
            $item->update([
                'rollback_status' => 'completed',
                'rollback_message' => 'Variant restored.',
            ]);
            return;
        }

        $summary['skipped']++;
        $item->update([
            'rollback_status' => 'skipped',
            'rollback_message' => 'Variant snapshot could not be restored.',
        ]);
    }

    protected function rollbackInventoryHistoryItem(ImportHistoryItem $item, array &$summary): void
    {
        $restored = $this->restoreInventorySnapshot($item->before_state ?? []);
        if ($restored) {
            $summary['inventory_restored']++;
            $item->update([
                'rollback_status' => 'completed',
                'rollback_message' => 'Inventory restored.',
            ]);
            return;
        }

        $summary['skipped']++;
        $item->update([
            'rollback_status' => 'skipped',
            'rollback_message' => 'Inventory snapshot could not be restored.',
        ]);
    }

    protected function restoreProductFromSnapshot(array $snapshot): ?Product
    {
        $productId = (int) ($snapshot['id'] ?? 0);
        if ($productId <= 0) {
            return null;
        }

        $product = Product::withTrashed()->find($productId);
        if (!$product) {
            return null;
        }

        $attributes = is_array($snapshot['attributes'] ?? null) ? $snapshot['attributes'] : [];
        if ($product->trashed() && empty($snapshot['deleted_at'])) {
            $product->restore();
        }

        if (!empty($attributes)) {
            $product->update($attributes);
        }

        $categoryIds = array_map('intval', (array) ($snapshot['category_ids'] ?? []));
        $tagIds = array_map('intval', (array) ($snapshot['tag_ids'] ?? []));
        $product->categories()->sync($categoryIds);
        $product->tags()->sync($tagIds);

        $product->images()->delete();
        foreach ((array) ($snapshot['images'] ?? []) as $image) {
            ProductImage::create([
                'product_id' => $product->id,
                'product_variant_id' => $image['product_variant_id'] ?? null,
                'image' => $image['image'] ?? null,
                'thumbnail' => $image['thumbnail'] ?? null,
                'alt_text' => $image['alt_text'] ?? null,
                'is_primary' => (bool) ($image['is_primary'] ?? false),
                'sort_order' => (int) ($image['sort_order'] ?? 0),
            ]);
        }

        if (!empty($snapshot['deleted_at'])) {
            if (!$product->trashed()) {
                $product->delete();
            }
        }

        return Product::withTrashed()->find($productId);
    }

    protected function restoreVariantFromSnapshot(array $snapshot): ?ProductVariant
    {
        $variantId = (int) ($snapshot['id'] ?? 0);
        if ($variantId <= 0) {
            return null;
        }

        $variant = ProductVariant::find($variantId);
        if (!$variant) {
            return null;
        }

        $attributes = is_array($snapshot['attributes'] ?? null) ? $snapshot['attributes'] : [];
        if (!empty($attributes)) {
            $variant->update($attributes);
        }

        $attributeValueIds = array_map('intval', (array) ($snapshot['attribute_value_ids'] ?? []));
        $variant->attributeValues()->sync($attributeValueIds);

        return ProductVariant::find($variantId);
    }

    protected function restoreInventorySnapshot(array $snapshot): bool
    {
        $sku = trim((string) ($snapshot['sku'] ?? ''));
        if ($sku === '') {
            return false;
        }

        if (Schema::hasTable('uae_store_on_hand_raw')) {
            DB::table('uae_store_on_hand_raw')->where('sku', $sku)->delete();

            $rows = [];
            $now = now();
            foreach ((array) ($snapshot['inventory_rows'] ?? []) as $row) {
                $storeCode = trim((string) ($row['store_code'] ?? ''));
                if ($storeCode === '') {
                    continue;
                }

                $rows[] = [
                    'sku' => $sku,
                    'store_code' => $storeCode,
                    'quantity' => (int) ($row['quantity'] ?? 0),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (!empty($rows)) {
                DB::table('uae_store_on_hand_raw')->insert($rows);
            }
        }

        $variantSnapshot = $snapshot['variant'] ?? null;
        if (is_array($variantSnapshot)) {
            $this->restoreVariantFromSnapshot($variantSnapshot);
        }

        $productSnapshot = $snapshot['product'] ?? null;
        if (is_array($productSnapshot)) {
            $product = $this->restoreProductFromSnapshot($productSnapshot);
            if ($product) {
                $this->refreshStorefrontCachesForProducts([$product->id]);
            }
        }

        return true;
    }

    protected function syncProductAggregatesFromVariants(int $productId): void
    {
        if ($productId <= 0) {
            return;
        }

        $product = Product::find($productId);
        if (!$product) {
            return;
        }

        $variantCount = $product->variants()->count();
        if ($variantCount > 0) {
            $totalStock = (int) $product->variants()->sum('stock_quantity');
            $product->update([
                'stock_quantity' => $totalStock,
                'stock_status' => $totalStock > 0 ? 'in_stock' : 'out_of_stock',
            ]);
        } else {
            $product->update([
                'stock_quantity' => 0,
                'stock_status' => 'out_of_stock',
            ]);
        }

        app(PriceResolver::class)->refreshCachedPrices($product);
        $this->refreshStorefrontCachesForProducts([$productId]);
    }

    protected function parseDelimitedList($value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map('trim', $value)));
        }
        $value = trim((string) $value);
        if ($value === '')
            return [];
        $parts = preg_split('/[|,]+/', $value);
        return array_values(array_filter(array_map('trim', $parts), fn($v) => $v !== ''));
    }

    protected function resolveCategoryIds($value): array
    {
        $items = $this->parseDelimitedList($value);
        if (empty($items))
            return [];

        $ids = [];
        $names = [];
        foreach ($items as $item) {
            if (is_numeric($item)) {
                $ids[] = (int) $item;
            } else {
                $names[] = $item;
            }
        }

        if (!empty($names)) {
            $matched = Category::whereIn('name', $names)
                ->orWhereIn('slug', $names)
                ->pluck('id')
                ->toArray();
            $ids = array_merge($ids, $matched);
        }

        return array_values(array_unique(array_filter($ids)));
    }

    protected function resolveOrCreateCategoryIdsByNameWithCache(string $raw, array &$cache, int &$createdCounter, ?string $arRaw = null): array
    {
        // Split: supports comma, |, ;, new line
        $parts = preg_split('/[,\|\;\n\r]+/', (string) $raw);

        $names = [];
        foreach ($parts as $p) {
            $name = trim((string) $p);
            if ($name === '')
                continue;

            // Normalize multiple spaces
            $name = preg_replace('/\s+/', ' ', $name);

            $names[] = $name;
        }

        $names = array_values(array_unique($names));
        if (empty($names)) {
            return [];
        }

        // Parse Arabic names (same order as English)
        $arNames = [];
        if ($arRaw !== null && trim($arRaw) !== '') {
            $arParts = preg_split('/[,\|\;\n\r]+/', (string) $arRaw);
            foreach ($arParts as $p) {
                $arNames[] = trim((string) $p);
            }
        }

        $ids = [];

        foreach ($names as $index => $name) {
            // Cache by lowercase to avoid duplicates like "Shoes" vs "shoes"
            $key = mb_strtolower($name);
            $arName = isset($arNames[$index]) && $arNames[$index] !== '' ? $arNames[$index] : null;

            if (isset($cache[$key])) {
                // Update Arabic name if provided and not yet set
                if ($arName) {
                    $existingCat = Category::find($cache[$key]);
                    if ($existingCat && empty($existingCat->name_ar)) {
                        $existingCat->update(['name_ar' => $arName]);
                    }
                }
                $ids[] = (int) $cache[$key];
                continue;
            }

            // Find by exact name
            $category = Category::where('name', $name)->first();

            // If not found, create new category
            if (!$category) {
                $category = Category::create([
                    'name' => $name,
                    'name_ar' => $arName,
                    'slug' => Str::slug($name) . '-' . Str::random(6),
                    'is_active' => true,
                ]);
                $createdCounter++;
            } else if ($arName && empty($category->name_ar)) {
                $category->update(['name_ar' => $arName]);
            }

            $cache[$key] = (int) $category->id;
            $ids[] = (int) $category->id;
        }

        return array_values(array_unique($ids));
    }


    protected function normalizeCategoryName($value): string
    {
        $name = trim((string) $value);
        if ($name === '')
            return '';
        $name = preg_replace('/\s+/', ' ', $name);
        return $name;
    }

    protected function generateUniqueCategorySlug(string $name): string
    {
        $baseSlug = Str::slug($name);
        if ($baseSlug === '') {
            $baseSlug = 'category';
        }

        $slug = $baseSlug;
        $counter = 1;
        while (Category::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    protected function resolveTagIds($value): array
    {
        $items = $this->parseDelimitedList($value);
        if (empty($items))
            return [];

        $ids = [];
        $names = [];
        foreach ($items as $item) {
            if (is_numeric($item)) {
                $ids[] = (int) $item;
            } else {
                $names[] = $item;
            }
        }

        if (!empty($names)) {
            $matched = Tag::whereIn('name', $names)
                ->orWhereIn('slug', $names)
                ->pluck('id')
                ->toArray();
            $ids = array_merge($ids, $matched);
        }

        return array_values(array_unique(array_filter($ids)));
    }

    protected function resolveOrCreateTagIdsByNameWithCache($value, array &$cache, int &$createdCount): array
    {
        $items = $this->parseDelimitedList($value);
        if (empty($items))
            return [];

        $ids = [];
        foreach ($items as $item) {
            $cleanName = $this->normalizeTagName($item);
            if ($cleanName === '')
                continue;

            $cacheKey = Str::lower($cleanName);
            if (isset($cache[$cacheKey])) {
                $ids[] = $cache[$cacheKey];
                continue;
            }

            $tag = Tag::whereRaw('LOWER(name) = ?', [$cacheKey])->first();
            if (!$tag) {
                $tag = Tag::create([
                    'name' => $cleanName,
                    'slug' => $this->generateUniqueTagSlug($cleanName),
                    'status' => true,
                ]);
                $createdCount++;
            }

            $cache[$cacheKey] = $tag->id;
            $ids[] = $tag->id;
        }

        return array_values(array_unique($ids));
    }

    protected function normalizeTagName($value): string
    {
        $name = trim((string) $value);
        if ($name === '')
            return '';
        $name = preg_replace('/\s+/', ' ', $name);
        return $name;
    }

    protected function generateUniqueTagSlug(string $name): string
    {
        $baseSlug = Str::slug($name);
        if ($baseSlug === '') {
            $baseSlug = 'tag';
        }

        $slug = $baseSlug;
        $counter = 1;
        while (Tag::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    protected function resolveOrCreateBrandIdByNameWithCache($value, array &$cache): ?int
    {
        $name = $this->normalizeBrandName($value);
        if ($name === '') {
            return null;
        }

        $cacheKey = Str::lower($name);
        if (isset($cache[$cacheKey])) {
            return (int) $cache[$cacheKey];
        }

        $attempts = 3;
        $lastError = null;

        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            try {
                $brand = Brand::whereRaw('LOWER(name) = ?', [$cacheKey])->first();
                if (!$brand) {
                    $slug = Str::slug($name);
                    if ($slug === '') {
                        $slug = 'brand-' . substr(hash('sha1', $name), 0, 12);
                    }

                    $brand = Brand::where('slug', $slug)->first();

                    if (!$brand) {
                        try {
                            $brand = Brand::create([
                                'name' => $name,
                                'slug' => $slug,
                                'is_active' => true,
                            ]);
                        } catch (QueryException $createException) {
                            if ($this->isDuplicateKeyException($createException)) {
                                $brand = Brand::where('slug', $slug)->first()
                                    ?? Brand::whereRaw('LOWER(name) = ?', [$cacheKey])->first();
                            } else {
                                throw $createException;
                            }
                        }
                    }
                }

                if (!$brand) {
                    return null;
                }

                $cache[$cacheKey] = (int) $brand->id;
                return (int) $brand->id;
            } catch (QueryException $e) {
                $lastError = $e;
                if (!$this->isRetryableDbException($e) || $attempt === $attempts) {
                    break;
                }

                // Backoff to let the concurrent transaction commit and release locks.
                usleep(150000 * $attempt);
            }
        }

        Log::warning('Import brand resolution failed', [
            'brand' => $name,
            'error' => $lastError?->getMessage(),
        ]);

        // Do not fail full import due to transient lock/contention on brands.
        return null;
    }

    protected function isRetryableDbException(QueryException $exception): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? '');
        $driverCode = (int) ($exception->errorInfo[1] ?? 0);

        return $driverCode === 1205 // lock wait timeout
            || $driverCode === 1213 // deadlock
            || $sqlState === '40001'; // serialization failure
    }

    protected function isDuplicateKeyException(QueryException $exception): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? '');
        $driverCode = (int) ($exception->errorInfo[1] ?? 0);

        return $sqlState === '23000' || $driverCode === 1062;
    }

    protected function isDuplicateProductSlugException(QueryException $exception): bool
    {
        return $this->isDuplicateKeyException($exception)
            && $this->exceptionContainsConstraint($exception, 'products_slug_unique');
    }

    protected function isDuplicateProductSkuException(QueryException $exception): bool
    {
        return $this->isDuplicateKeyException($exception)
            && (
                $this->exceptionContainsConstraint($exception, 'products_sku_unique')
                || $this->exceptionContainsConstraint($exception, "for key 'sku'")
                || $this->exceptionContainsConstraint($exception, 'for key `sku`')
            );
    }

    protected function exceptionContainsConstraint(QueryException $exception, string $needle): bool
    {
        if ($needle === '') {
            return false;
        }

        $message = Str::lower($exception->getMessage());
        return str_contains($message, Str::lower($needle));
    }

    protected function resolveStoreIdByNameWithCache($value, array &$cache): ?int
    {
        $rawName = trim((string) $value);
        if ($rawName === '') {
            return null;
        }

        if (!Schema::hasColumn('products', 'store_id')) {
            throw new \Exception("Store column is not configured on products table.");
        }

        // Stores are served from uae_store_priority in this app.
        if (!Schema::hasTable('uae_store_priority')) {
            throw new \Exception("Store table is not configured.");
        }

        $normalizedInput = $this->normalizeStoreLookupValue($rawName);
        $aliasInput = $this->normalizeStoreLookupAlias($rawName);
        $cacheKeys = array_values(array_unique(array_filter([
            Str::lower($rawName),
            $normalizedInput,
            $aliasInput,
        ])));

        foreach ($cacheKeys as $cacheKey) {
            if (array_key_exists($cacheKey, $cache)) {
                return (int) $cache[$cacheKey];
            }
        }

        $codeColumn = null;
        if (Schema::hasColumn('uae_store_priority', 'store_key')) {
            $codeColumn = 'store_key';
        } elseif (Schema::hasColumn('uae_store_priority', 'store_code')) {
            $codeColumn = 'store_code';
        }

        $selectColumns = ['id'];
        if (Schema::hasColumn('uae_store_priority', 'store_name')) {
            $selectColumns[] = 'store_name';
        }
        if ($codeColumn) {
            $selectColumns[] = $codeColumn;
        }

        $stores = DB::table('uae_store_priority')->select($selectColumns)->get();
        if ($stores->isEmpty()) {
            throw new \Exception("Store table has no rows.");
        }

        if (is_numeric($rawName)) {
            $directById = $stores->firstWhere('id', (int) $rawName);
            if ($directById) {
                $storeId = (int) $directById->id;
                foreach ($cacheKeys as $key) {
                    $cache[$key] = $storeId;
                }
                return $storeId;
            }
        }

        $exactMatches = [];
        $aliasMatches = [];
        $looseMatches = [];

        foreach ($stores as $store) {
            $storeId = (int) $store->id;
            $tokenBuckets = $this->collectStoreLookupTokens($store, $codeColumn);
            $tokens = $tokenBuckets['tokens'];
            $aliasTokens = $tokenBuckets['alias_tokens'];

            if ($normalizedInput !== '' && in_array($normalizedInput, $tokens, true)) {
                $exactMatches[$storeId] = true;
                continue;
            }

            if ($aliasInput !== '' && (in_array($aliasInput, $tokens, true) || in_array($aliasInput, $aliasTokens, true))) {
                $aliasMatches[$storeId] = true;
                continue;
            }

            if ($this->hasLooseStoreTokenMatch($normalizedInput, $aliasInput, $tokens, $aliasTokens)) {
                $looseMatches[$storeId] = true;
            }
        }

        $candidateIds = array_keys($exactMatches);
        if (count($candidateIds) === 1) {
            $storeId = (int) $candidateIds[0];
            foreach ($cacheKeys as $key) {
                $cache[$key] = $storeId;
            }
            return $storeId;
        }

        $candidateIds = array_keys($aliasMatches);
        if (count($candidateIds) === 1) {
            $storeId = (int) $candidateIds[0];
            foreach ($cacheKeys as $key) {
                $cache[$key] = $storeId;
            }
            return $storeId;
        }

        $candidateIds = array_keys($looseMatches);
        if (count($candidateIds) === 1) {
            $storeId = (int) $candidateIds[0];
            foreach ($cacheKeys as $key) {
                $cache[$key] = $storeId;
            }
            return $storeId;
        }

        // Single-store setups should accept any non-empty value.
        if ($stores->count() === 1) {
            $storeId = (int) $stores->first()->id;
            foreach ($cacheKeys as $key) {
                $cache[$key] = $storeId;
            }
            return $storeId;
        }

        throw new \Exception("Store '{$rawName}' not found.");
    }

    protected function normalizeBrandName($value): string
    {
        $name = trim((string) $value);
        if ($name === '') return '';
        return preg_replace('/\s+/', ' ', $name);
    }

    protected function normalizeStoreLookupValue($value): string
    {
        $name = Str::lower(trim((string) $value));
        if ($name === '') {
            return '';
        }

        $name = str_replace(['_', '-', '/'], ' ', $name);
        $name = preg_replace('/\s+/', ' ', $name);

        return trim((string) $name);
    }

    protected function normalizeStoreLookupAlias($value): string
    {
        $name = $this->normalizeStoreLookupValue($value);
        if ($name === '') {
            return '';
        }

        $name = preg_replace('/\bcuple\b/', ' ', $name);
        $name = preg_replace('/\bstore\b/', ' ', $name);
        $name = preg_replace('/\s+/', ' ', (string) $name);

        return trim((string) $name);
    }

    protected function collectStoreLookupTokens(object $store, ?string $codeColumn): array
    {
        $rawValues = [];
        if (isset($store->store_name)) {
            $rawValues[] = (string) $store->store_name;
        }
        if ($codeColumn && isset($store->{$codeColumn})) {
            $rawValues[] = (string) $store->{$codeColumn};
        }
        $rawValues[] = (string) $store->id;

        $tokens = [];
        $aliasTokens = [];

        foreach ($rawValues as $rawValue) {
            $token = $this->normalizeStoreLookupValue($rawValue);
            if ($token !== '') {
                $tokens[$token] = true;
            }

            $alias = $this->normalizeStoreLookupAlias($rawValue);
            if ($alias !== '') {
                $aliasTokens[$alias] = true;
            }
        }

        return [
            'tokens' => array_keys($tokens),
            'alias_tokens' => array_keys($aliasTokens),
        ];
    }

    protected function hasLooseStoreTokenMatch(string $normalizedInput, string $aliasInput, array $tokens, array $aliasTokens): bool
    {
        $inputs = array_values(array_filter([$normalizedInput, $aliasInput]));
        $allTokens = array_values(array_unique(array_merge($tokens, $aliasTokens)));

        foreach ($inputs as $input) {
            foreach ($allTokens as $token) {
                if ($input === '' || $token === '') {
                    continue;
                }

                if (str_contains($token, $input) || str_contains($input, $token)) {
                    return true;
                }
            }
        }

        return false;
    }

    protected function buildActionSummaryMessage(array $stats, string $action): string
    {
        $parts = [];

        if (!empty($stats['created'])) {
            $parts[] = "{$stats['created']} product(s) created";
        }
        if (!empty($stats['updated'])) {
            $parts[] = "{$stats['updated']} product(s) updated";
        }
        if (!empty($stats['deleted'])) {
            $parts[] = "{$stats['deleted']} product(s) deleted";
        }
        if (!empty($stats['skipped'])) {
            $parts[] = "{$stats['skipped']} row(s) skipped";
        }
        if (!empty($stats['not_found'])) {
            $parts[] = "{$stats['not_found']} not found";
        }
        if (!empty($stats['rows_failed'])) {
            $parts[] = "{$stats['rows_failed']} row(s) failed";
        }

        return empty($parts)
            ? 'No changes made.'
            : implode(', ', $parts) . '.';
    }

    protected function buildSummaryMessage(): string
    {
        $parts = [];

        if ($this->stats['products_created'] > 0) {
            $parts[] = "{$this->stats['products_created']} product(s) created";
        }
        if ($this->stats['products_updated'] > 0) {
            $parts[] = "{$this->stats['products_updated']} product(s) updated";
        }
        if ($this->stats['variations_created'] > 0) {
            $parts[] = "{$this->stats['variations_created']} variation(s) created";
        }
        if ($this->stats['variations_updated'] > 0) {
            $parts[] = "{$this->stats['variations_updated']} variation(s) updated";
        }
        if ($this->stats['rows_failed'] > 0) {
            $parts[] = "{$this->stats['rows_failed']} row(s) failed";
        }

        return empty($parts) ? 'No changes made.' : implode(', ', $parts) . '.';
    }

    protected function generateErrorFile(array $originalHeaders): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Import Errors');

        // Add headers (original headers + error column)
        $headers = array_merge(['row_number'], $originalHeaders, ['error_message']);
        foreach ($headers as $col => $header) {
            $this->setCellByColRow($sheet, $col + 1, 1, $header);
        }

        // Style headers
        $lastCol = count($headers);
        $headerRange = 'A1:' . $this->getColumnLetter($lastCol) . '1';
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'DC3545'],
            ],
        ]);

        // Add error rows
        $rowNum = 2;
        foreach ($this->errorRows as $errorRow) {
            $col = 1;
            $this->setCellByColRow($sheet, $col++, $rowNum, $errorRow['row_number']);

            foreach ($errorRow['original_row'] as $value) {
                $this->setCellByColRow($sheet, $col++, $rowNum, $value);
            }

            // Pad if original row was shorter than headers
            while ($col <= count($originalHeaders) + 1) {
                $this->setCellByColRow($sheet, $col++, $rowNum, '');
            }

            $this->setCellByColRow($sheet, $col, $rowNum, $errorRow['error']);
            $rowNum++;
        }

        // Auto-size columns
        foreach (range(1, $lastCol) as $col) {
            $sheet->getColumnDimension($this->getColumnLetter($col))->setAutoSize(true);
        }

        // Save file
        $filename = 'import_errors_' . date('Y-m-d_His') . '.xlsx';
        $path = 'imports/' . $filename;

        $writer = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'import_errors_');
        $writer->save($tempFile);

        Storage::disk('public')->put($path, file_get_contents($tempFile));
        unlink($tempFile);

        return $this->buildImportFilePublicUrl($path);
    }

    protected function buildImportFilePublicUrl(string $path): string
    {
        $normalizedPath = ltrim(str_replace('\\', '/', $path), '/');
        return MediaUrl::fromPath($normalizedPath) ?? asset('storage/' . $normalizedPath);
    }

    protected function getColumnLetter(int $columnNumber): string
    {
        $letter = '';
        while ($columnNumber > 0) {
            $columnNumber--;
            $letter = chr(65 + ($columnNumber % 26)) . $letter;
            $columnNumber = intval($columnNumber / 26);
        }
        return $letter;
    }

    /**
     * Helper to set cell value using column number and row (compatible with new PhpSpreadsheet)
     */
    protected function setCellByColRow($sheet, int $col, int $row, $value): void
    {
        $cellAddress = $this->getColumnLetter($col) . $row;
        $sheet->setCellValue($cellAddress, $value);
    }

    /**
     * Bulk update product status fields via Excel
     * Matches products by SKU/article number and updates only status fields
     */
    public function bulkStatusUpdate(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        try {
            if (in_array($extension, ['xlsx', 'xls'])) {
                $spreadsheet = IOFactory::load($file->getPathname());
                $worksheet = $spreadsheet->getActiveSheet();
                $rows = $worksheet->toArray();
            } else {
                $handle = fopen($file->getPathname(), 'r');
                $rows = [];
                while (($row = fgetcsv($handle)) !== false) {
                    $rows[] = $row;
                }
                fclose($handle);
            }

            if (empty($rows)) {
                return $this->error('File is empty.', 400);
            }

            // First row is headers
            $headers = array_map(function ($h) {
                return strtolower(trim(str_replace(' ', '_', $h ?? '')));
            }, $rows[0]);

            $dataRows = array_slice($rows, 1);

            $stats = [
                'updated' => 0,
                'not_found' => 0,
                'skipped' => 0,
                'errors' => [],
            ];

            DB::beginTransaction();

            foreach ($dataRows as $rowIndex => $row) {
                $rowNumber = $rowIndex + 2;

                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                // Combine headers with row data
                $data = [];
                foreach ($headers as $index => $header) {
                    if (!empty($header)) {
                        $data[$header] = $row[$index] ?? '';
                    }
                }

                // Get SKU to find product
                $sku = $data['sku'] ?? $data['product_sku'] ?? $data['article'] ?? $data['article_number'] ?? null;

                if (empty($sku)) {
                    $stats['skipped']++;
                    continue;
                }

                // Find product by SKU
                $product = Product::where('sku', $sku)->first();

                if (!$product) {
                    $stats['not_found']++;
                    $stats['errors'][] = "Row {$rowNumber}: Product with SKU '{$sku}' not found";
                    continue;
                }

                // Build update array with only the status fields that are present in the file
                $updateData = [];

                // Status/Active field
                if (isset($data['status']) || isset($data['is_active']) || isset($data['active'])) {
                    $updateData['is_active'] = $this->parseBoolean($data['status'] ?? $data['is_active'] ?? $data['active']);
                }

                // Featured
                if (isset($data['is_featured']) || isset($data['featured'])) {
                    $updateData['is_featured'] = $this->parseBoolean($data['is_featured'] ?? $data['featured']);
                }

                // Trending
                if (isset($data['is_trending']) || isset($data['trending'])) {
                    $updateData['is_trending'] = $this->parseBoolean($data['is_trending'] ?? $data['trending']);
                }

                // Safe checkout
                if (isset($data['safe_checkout'])) {
                    $updateData['safe_checkout'] = $this->parseBoolean($data['safe_checkout']);
                }

                // Secure checkout
                if (isset($data['secure_checkout'])) {
                    $updateData['secure_checkout'] = $this->parseBoolean($data['secure_checkout']);
                }

                // Social share
                if (isset($data['social_share'])) {
                    $updateData['social_share'] = $this->parseBoolean($data['social_share']);
                }

                // Encourage order
                if (isset($data['encourage_order'])) {
                    $updateData['encourage_order'] = $this->parseBoolean($data['encourage_order']);
                }

                // Encourage view
                if (isset($data['encourage_view'])) {
                    $updateData['encourage_view'] = $this->parseBoolean($data['encourage_view']);
                }

                if (!empty($updateData)) {
                    $product->update($updateData);
                    $stats['updated']++;
                } else {
                    $stats['skipped']++;
                }
            }

            DB::commit();

            $message = "{$stats['updated']} product(s) updated";
            if ($stats['not_found'] > 0) {
                $message .= ", {$stats['not_found']} not found";
            }
            if ($stats['skipped'] > 0) {
                $message .= ", {$stats['skipped']} skipped";
            }

            return $this->success([
                'summary' => $stats,
                'message' => $message,
            ], $message);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Bulk status update failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('Bulk update failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Bulk update product fields via action-specific template
     */

    public function startProductActionImport(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'action' => 'required|string',
        ]);

        $action = $this->normalizeImportAction($validated['action']);
        if (!$action) {
            return $this->error('Invalid action.', 422);
        }

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        $storedFilePath = $file->storeAs(
            'imports/temp',
            sprintf('%s.%s', (string) Str::uuid(), $extension)
            ,
            'local'
        );
        $storedFullPath = Storage::disk('local')->path($storedFilePath);

        $history = ImportHistory::create([
            'module' => 'product',
            'action' => $action,
            'original_file_name' => $file->getClientOriginalName(),
            'stored_file_path' => $storedFilePath,
            'status' => 'pending',
            'progress_percentage' => 0,
            'total_rows' => $this->countImportDataRows($storedFullPath, $extension),
            'processed_rows' => 0,
            'created_by' => optional($request->user())->id,
        ]);

        $this->putImportRuntimeState($history, [
            'status' => 'pending',
            'progress_percentage' => 0,
            'processed_rows' => 0,
            'total_rows' => (int) $history->total_rows,
            'message' => 'Import prepared.',
        ]);

        return $this->success([
            'import' => $this->transformImportHistory($history->fresh(['items'])->loadCount('items')),
        ], 'Import prepared successfully.');
    }

    public function processProductActionImport(Request $request, int $id)
    {
        $history = ImportHistory::findOrFail($id);

        if ($history->module !== 'product') {
            return $this->error('Invalid import history.', 404);
        }

        if ($history->status === 'processing') {
            return $this->error('Import is already processing.', 409);
        }

        if (!in_array($history->status, ['pending', 'failed'], true)) {
            return $this->error('This import cannot be processed again.', 422);
        }

        $storedFilePath = ltrim((string) $history->stored_file_path, '/');
        if (!Storage::disk('local')->exists($storedFilePath)) {
            $history->update([
                'status' => 'failed',
                'failed_at' => now(),
                'last_error' => 'Stored import file was not found.',
            ]);
            return $this->error('Stored import file was not found.', 404);
        }
        $fullPath = Storage::disk('local')->path($storedFilePath);

        ignore_user_abort(true);

        $history->update([
            'status' => 'processing',
            'progress_percentage' => 0,
            'processed_rows' => 0,
            'summary' => null,
            'result_payload' => null,
            'report_file_path' => null,
            'error_file_path' => null,
            'last_error' => null,
            'started_at' => now(),
            'completed_at' => null,
            'failed_at' => null,
            'rollback_status' => 'none',
            'rollback_summary' => null,
            'rolled_back_at' => null,
        ]);

        $history->items()->delete();

        $this->setCurrentImportHistory($history->fresh());
        $this->putImportRuntimeState($history, [
            'status' => 'processing',
            'progress_percentage' => 0,
            'processed_rows' => 0,
            'total_rows' => (int) $history->total_rows,
            'message' => 'Import started.',
        ]);

        try {
            $uploadedFile = LaravelUploadedFile::createFromBase(new SymfonyUploadedFile(
                $fullPath,
                $history->original_file_name,
                mime_content_type($fullPath) ?: null,
                UPLOAD_ERR_OK,
                true
            ), true);

            $processingRequest = Request::create(
                '/api/admin/import/products-action',
                'POST',
                ['action' => $history->action]
            );
            $processingRequest->files->set('file', $uploadedFile);
            $processingRequest->setUserResolver(fn() => $request->user());

            $response = $this->importProductsAction($processingRequest);
            $freshHistory = $this->currentImportHistory?->fresh();

            if ($freshHistory && $freshHistory->status === 'processing') {
                $payload = json_decode($response->getContent(), true) ?: [];
                if (($payload['success'] ?? false) === true) {
                    $this->finalizeCurrentImportHistorySuccess($payload['data'] ?? []);
                } else {
                    $this->markCurrentImportHistoryFailed((string) ($payload['message'] ?? 'Import failed.'));
                }
            }

            return $response;
        } catch (ValidationException $e) {
            $message = (string) ($e->validator->errors()->first() ?: $e->getMessage());
            $this->markCurrentImportHistoryFailed($message);

            return response()->json([
                'success' => false,
                'message' => $message,
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            $this->markCurrentImportHistoryFailed($e->getMessage());
            Log::error('Async product import failed', [
                'import_history_id' => $history->id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->error('Import failed: ' . $e->getMessage(), 500);
        } finally {
            $this->setCurrentImportHistory(null);
        }
    }

    public function listProductActionImportHistory(Request $request)
    {
        $perPage = max(5, min(50, (int) $request->get('per_page', 10)));
        $paginator = ImportHistory::query()
            ->where('module', 'product')
            ->latest('id')
            ->withCount('items')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Success',
            'data' => collect($paginator->items())
                ->map(fn(ImportHistory $history) => $this->transformImportHistory($history))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function showProductActionImportHistory(int $id)
    {
        $history = ImportHistory::query()
            ->where('module', 'product')
            ->withCount('items')
            ->findOrFail($id);

        return $this->success([
            'import' => $this->transformImportHistory($history),
        ]);
    }

    public function rollbackProductActionImportHistory(int $id)
    {
        $history = ImportHistory::query()
            ->where('module', 'product')
            ->withCount('items')
            ->findOrFail($id);

        if ($history->status !== 'completed') {
            return $this->error('Only completed imports can be rolled back.', 422);
        }

        if ($history->items_count < 1) {
            return $this->error('This import does not have any reversible changes.', 422);
        }

        if ($history->rollback_status === 'processing') {
            return $this->error('Rollback is already in progress.', 409);
        }

        if ($history->rollback_status === 'completed') {
            return $this->error('This import has already been rolled back.', 422);
        }

        $history->update([
            'rollback_status' => 'processing',
            'rollback_summary' => null,
        ]);

        $summary = [
            'items_processed' => 0,
            'products_removed' => 0,
            'products_restored' => 0,
            'variants_removed' => 0,
            'variants_restored' => 0,
            'inventory_restored' => 0,
            'skipped' => 0,
        ];

        try {
            DB::beginTransaction();

            $items = $history->items()->orderByDesc('id')->get();
            foreach ($items as $item) {
                $this->rollbackImportHistoryItem($item, $summary);
                $summary['items_processed']++;
            }

            DB::commit();

            $history->update([
                'rollback_status' => 'completed',
                'rollback_summary' => $summary,
                'rolled_back_at' => now(),
            ]);

            return $this->success([
                'import' => $this->transformImportHistory($history->fresh()->loadCount('items')),
            ], 'Import rollback completed successfully.');
        } catch (\Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            $history->update([
                'rollback_status' => 'failed',
                'rollback_summary' => array_merge($summary, ['error' => $e->getMessage()]),
            ]);

            return $this->error('Rollback failed: ' . $e->getMessage(), 500);
        }
    }

    public function destroyProductActionImportHistory(int $id)
    {
        $history = ImportHistory::query()
            ->where('module', 'product')
            ->findOrFail($id);

        if ($history->status === 'processing' || $history->rollback_status === 'processing') {
            return $this->error('Processing imports cannot be removed.', 422);
        }

        $this->deleteImportHistoryFiles($history);
        Cache::forget($this->getImportRuntimeCacheKey($history->id));
        $history->delete();

        return $this->success(null, 'Import history removed successfully.');
    }

    public function importProductsAction(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            'action' => 'required|string',
        ]);

        $action = $this->normalizeImportAction($validated['action']);
        if (!$action) {
            return $this->error('Invalid action.', 422);
        }

        // Route action handlers first (specialized endpoints)
        if ($action === 'update_quantity') {
            return $this->importUaeStoreQuantityCsv($request);
        }
        if ($action === 'update_title') {
            return $this->importUpdateTitles($request);
        }
        if ($action === 'update_price') {
            return $this->importUpdatePrices($request);
        }
        if ($action === 'update_parent_price') {
            return $this->importUpdateParentPrices($request);
        }

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        try {
            // -----------------------------
            // 1) Read file
            // -----------------------------
            if (in_array($extension, ['xlsx', 'xls'])) {
                $spreadsheet = IOFactory::load($file->getPathname());
                $worksheet = $spreadsheet->getActiveSheet();
                $rows = $worksheet->toArray();
            } else {
                $handle = fopen($file->getPathname(), 'r');
                if (!$handle) {
                    return $this->error('Failed to open file.', 400);
                }
                $rows = [];
                while (($row = fgetcsv($handle)) !== false) {
                    $rows[] = $row;
                }
                fclose($handle);
            }

            if (empty($rows)) {
                return $this->error('File is empty.', 400);
            }

            // -----------------------------
            // 2) Headers (FIX Bug 3: BOM/normalize)
            // -----------------------------
            $originalHeaders = $rows[0] ?? [];
            if (empty(array_filter($originalHeaders, fn($v) => trim((string) $v) !== ''))) {
                return $this->error('Header row is missing.', 422);
            }

            $headers = array_map(function ($h) {
                $h = $this->normalizeHeaderCell($h);             // ✅ removes BOM + trims
                $h = strtolower(trim((string) $h));
                $h = str_replace(' ', '_', $h);
                return $h;
            }, $originalHeaders);

            $dataRows = array_slice($rows, 1);

            // -----------------------------
            // 3) Stats + init
            // -----------------------------
            $stats = [
                'processed' => 0,
                'created' => 0,
                'updated' => 0,
                'deleted' => 0,
                'skipped' => 0,
                'not_found' => 0,
                'skipped_not_found' => 0,
                'rows_failed' => 0,
                'rows_failed_validation' => 0,
                'products_linked' => 0,
                'categories_created' => 0,
                'tags_created' => 0,
            ];

            $this->stats = [
                'products_created' => 0,
                'products_updated' => 0,
                'variations_created' => 0,
                'variations_updated' => 0,
                'rows_failed' => 0,
            ];
            $this->errorRows = [];
            $this->importWarnings = [];
            $reportRows = [];

            $categoryNameCache = [];
            $tagNameCache = [];
            $brandNameCache = [];
            $storeNameCache = [];

            // -----------------------------
            // 4) Transaction
            // -----------------------------
            if ($action === 'new_sell') {
                return $this->processNewSellRows(
                    $headers,
                    $dataRows,
                    $originalHeaders,
                    $stats,
                    $categoryNameCache,
                    $tagNameCache,
                    $brandNameCache,
                    $storeNameCache
                );
            }

            DB::beginTransaction();

            foreach ($dataRows as $rowIndex => $row) {
                $rowNumber = $rowIndex + 2;

                // FIX Bug 3: robust empty-row detection (spaces should be empty)
                if (empty(array_filter($row, fn($v) => trim((string) $v) !== ''))) {
                    continue;
                }

                $stats['processed']++;
                $this->updateCurrentImportProgress($stats['processed']);

                // Combine header -> row
                $data = [];
                foreach ($headers as $index => $header) {
                    if ($header !== '') {
                        $data[$header] = $row[$index] ?? '';
                    }
                }
                $sku = trim((string) $this->getFirstValue($data, ['sku', 'product_sku', 'article']));

                try {
                    if ($action === 'new_sell') {
                        $article = trim((string) $this->getFirstValue($data, ['article']));
                        if ($article === '') {
                            throw new \Exception('article is required');
                        }

                        $variantSku = trim((string) $this->getFirstValue($data, ['sku', 'variant_sku']));
                        $data['sku'] = $article;
                        if ($variantSku !== '' && $variantSku !== $article) {
                            $data['variant_sku'] = $variantSku;
                        }

                        $title = trim((string) ($data['title'] ?? $data['name'] ?? ''));
                        if ($title === '' && !Product::where('sku', $article)->exists()) {
                            $data['title'] = $article;
                        }

                        if (!empty($data['price'])) {
                            $data['variant_price'] = $data['price'];
                        }
                        if (!empty($data['inventory'])) {
                            $data['variant_stock'] = $data['inventory'];
                        }

                        $this->createOrUpdateProduct($data, [], true, $categoryNameCache, $tagNameCache, $brandNameCache);
                        $stats['updated']++;
                        $reportRows[] = [
                            'row_number' => $rowNumber,
                            'sku' => $article,
                            'action' => $action,
                            'status' => 'updated',
                            'message' => 'Updated',
                        ];
                        continue;
                    }

                    if ($sku === '') {
                        $this->addErrorRow($rowNumber, $row, $headers, 'SKU is required');
                        $stats['rows_failed']++;
                        $stats['rows_failed_validation']++;
                        $reportRows[] = [
                            'row_number' => $rowNumber,
                            'sku' => null,
                            'action' => $action,
                            'status' => 'failed',
                            'message' => 'SKU is required',
                        ];
                        continue;
                    }

                    $product = Product::where('sku', $sku)->first();
                    if (!$product) {
                        $this->addErrorRow($rowNumber, $row, $headers, "Product with SKU '{$sku}' not found");
                        $stats['not_found']++;
                        $stats['skipped_not_found']++;
                        $reportRows[] = [
                            'row_number' => $rowNumber,
                            'sku' => $sku,
                            'action' => $action,
                            'status' => 'skipped',
                            'message' => 'SKU not found',
                        ];
                        continue;
                    }

                    $beforeSnapshot = $this->currentImportHistory
                        ? $this->snapshotProduct($product)
                        : null;

                    switch ($action) {

                        case 'add_update_category':
                            $categoryRaw = $this->getFirstValue($data, ['category_name', 'category_names', 'category']);
                            if (trim((string) $categoryRaw) === '') {
                                throw new \Exception('category_name is required');
                            }

                            $arCategoryRaw = $this->getFirstValue($data, ['ar_category', 'category_ar', 'arabic_category']);

                            $categoryIds = $this->resolveOrCreateCategoryIdsByNameWithCache(
                                $categoryRaw,
                                $categoryNameCache,
                                $stats['categories_created'],
                                $arCategoryRaw
                            );

                            if (empty($categoryIds)) {
                                throw new \Exception('category_name is required');
                            }

                            $product->categories()->syncWithoutDetaching($categoryIds);
                            $stats['products_linked'] += count($categoryIds);
                            $stats['updated']++;
                            $this->recordProductHistoryItem($product, 'updated', $beforeSnapshot, $this->snapshotProduct($product));

                            $reportRows[] = [
                                'row_number' => $rowNumber,
                                'sku' => $sku,
                                'action' => $action,
                                'status' => 'updated',
                                'message' => 'Updated',
                            ];
                            break;

                        case 'add_update_tag':
                            $tagRaw = $this->getFirstValue($data, ['tag_name', 'tag_names', 'tag']);
                            if (trim((string) $tagRaw) === '') {
                                throw new \Exception('tag_name is required');
                            }

                            $tagIds = $this->resolveOrCreateTagIdsByNameWithCache(
                                $tagRaw,
                                $tagNameCache,
                                $stats['tags_created']
                            );

                            if (empty($tagIds)) {
                                throw new \Exception('tag_name is required');
                            }

                            $product->tags()->syncWithoutDetaching($tagIds);
                            $stats['products_linked'] += count($tagIds);
                            $stats['updated']++;
                            $this->recordProductHistoryItem($product, 'updated', $beforeSnapshot, $this->snapshotProduct($product));

                            $reportRows[] = [
                                'row_number' => $rowNumber,
                                'sku' => $sku,
                                'action' => $action,
                                'status' => 'updated',
                                'message' => 'Updated',
                            ];
                            break;

                        case 'remove_product':
                            $product->delete();
                            $stats['deleted']++;
                            $this->recordProductHistoryItem($product, 'deleted', $beforeSnapshot, null);

                            $reportRows[] = [
                                'row_number' => $rowNumber,
                                'sku' => $sku,
                                'action' => $action,
                                'status' => 'deleted',
                                'message' => 'Deleted',
                            ];
                            break;

                        // Safety: should never reach (because update_* are routed above)
                        default:
                            $stats['skipped']++;
                            $reportRows[] = [
                                'row_number' => $rowNumber,
                                'sku' => $sku,
                                'action' => $action,
                                'status' => 'skipped',
                                'message' => 'Unsupported action in this endpoint',
                            ];
                            break;
                    }
                } catch (\Exception $e) {
                    $this->addErrorRow($rowNumber, $row, $headers, $e->getMessage());
                    $stats['rows_failed']++;

                    if (in_array($action, ['add_update_category', 'add_update_tag', 'new_sell'], true)) {
                        $stats['rows_failed_validation']++;
                    }

                    $reportRows[] = [
                        'row_number' => $rowNumber,
                        'sku' => $sku,
                        'action' => $action,
                        'status' => 'failed',
                        'message' => $e->getMessage(),
                    ];
                }
            }

            DB::commit();
            $this->appendImportWarningsToReportRows($reportRows, $action);

            $reportUrl = $this->generateActionReportFile($reportRows, 'product_action_report_');

            $response = [
                'success' => true,
                'summary' => $stats,
                'message' => $this->buildActionSummaryMessage($stats, $action),
                'report_url' => $reportUrl,
            ];

            if (!empty($this->errorRows)) {
                // Keep ORIGINAL headers as user sees them in file
                $errorFileUrl = $this->generateErrorFile($originalHeaders);
                $response['error_file'] = $errorFileUrl;
                $response['errors_count'] = count($this->errorRows);
            }

            if (!empty($this->importWarnings)) {
                $response['warnings_count'] = count($this->importWarnings);
                $response['warnings_by_type'] = $this->getImportWarningsByType();
                $response['warnings_sample'] = $this->getImportWarningsSample();
            }

            if (in_array($action, ['add_update_category', 'add_update_tag'], true) && $stats['products_linked'] > 0) {
                Cache::increment('products_list_version');
            }

            $this->finalizeCurrentImportHistorySuccess($response);
            return $this->success($response, $response['message']);

        } catch (\Exception $e) {
            // FIX Bug 3: rollback only if a transaction is still open
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            Log::error('Action import failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $this->markCurrentImportHistoryFailed($e->getMessage());
            return $this->error('Import failed: ' . $e->getMessage(), 500);
        }
    }


    /**
     * Download bulk status update template
     */
    public function downloadStatusTemplate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Status Update');

        // Headers
        $headers = [
            'A1' => 'sku',
            'B1' => 'status',
            'C1' => 'is_featured',
            'D1' => 'is_trending',
            'E1' => 'safe_checkout',
            'F1' => 'secure_checkout',
            'G1' => 'social_share',
            'H1' => 'encourage_order',
            'I1' => 'encourage_view',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        // Style headers
        $sheet->getStyle('A1:I1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Add helper row
        $helpTexts = [
            'A2' => 'Required - SKU/Article',
            'B2' => 'true/false',
            'C2' => 'true/false',
            'D2' => 'true/false',
            'E2' => 'true/false',
            'F2' => 'true/false',
            'G2' => 'true/false',
            'H2' => 'true/false',
            'I2' => 'true/false',
        ];

        foreach ($helpTexts as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $sheet->getStyle('A2:I2')->applyFromArray([
            'font' => ['italic' => true, 'size' => 9, 'color' => ['rgb' => '666666']],
        ]);

        // Example data
        $sheet->setCellValue('A3', 'SKU-001');
        $sheet->setCellValue('B3', 'true');
        $sheet->setCellValue('C3', 'true');
        $sheet->setCellValue('D3', 'false');
        $sheet->setCellValue('E3', 'true');
        $sheet->setCellValue('F3', 'true');
        $sheet->setCellValue('G3', 'true');
        $sheet->setCellValue('H3', 'true');
        $sheet->setCellValue('I3', 'true');

        $sheet->getStyle('A3:I3')->applyFromArray([
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E2EFDA'],
            ],
        ]);

        // Add note
        $sheet->setCellValue('A5', 'Notes:');
        $sheet->setCellValue('A6', '- Only SKU column is required. Leave other columns empty to skip updating that field.');
        $sheet->setCellValue('A7', '- Use true/false, yes/no, 1/0 for boolean values.');
        $sheet->setCellValue('A8', '- Products are matched by SKU (article number).');

        $sheet->getStyle('A5')->applyFromArray(['font' => ['bold' => true]]);

        // Freeze header row
        $sheet->freezePane('A3');

        // Auto-size columns
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Create the file
        $writer = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'status_template_') . '.xlsx';
        $writer->save($tempFile);

        return response()->download($tempFile, 'product_status_update_template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    protected function downloadActionTemplate(string $action)
    {
        if ($action === 'update_quantity') {
            return $this->downloadUaeStoreQuantityCsvTemplate();
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(ucwords(str_replace('_', ' ', $action)));

        $this->buildActionTemplateSheet($sheet, $action);

        $writer = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'product_action_template_') . '.xlsx';
        $writer->save($tempFile);

        $filename = "product_{$action}_template.xlsx";
        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    protected function buildActionTemplateSheet($sheet, string $action): void
    {
        $headers = ['sku'];
        $helpTexts = ['Required - SKU/Article'];
        $exampleRow = ['SKU-001'];

        switch ($action) {
            case 'update_quantity':
                $storeColumns = array_values(array_filter(
                    $this->getUaeStoreHeaderList(),
                    fn($header) => strtolower((string) $header) !== 'sku'
                ));

                foreach ($storeColumns as $store) {
                    $headers[] = $store;
                    $helpTexts[] = 'Store quantity (number)';
                    $exampleRow[] = '10';
                }
                break;
            case 'update_price':
                $headers = ['variant_sku', 'regular_price', 'sale_price'];
                $helpTexts = [
                    'Variant SKU (required)',
                    'Number (required)',
                    'Number (optional)',
                ];
                $exampleRow = ['F25C120007BGN25602', '249', '220'];
                break;
            case 'update_parent_price':
                $headers = ['Article', 'Price'];
                $helpTexts = [
                    'Parent product Article/SKU (required)',
                    'Number (required)',
                ];
                $exampleRow = ['ART-001', '249'];
                break;
            case 'update_title':
                $headers[] = 'name';
                $headers[] = 'name_ar';
                $headers[] = 'short_description';
                $headers[] = 'short_description_ar';
                $headers[] = 'description';
                $headers[] = 'description_ar';
                $helpTexts[] = 'Product title (required)';
                $helpTexts[] = 'Arabic title (optional)';
                $helpTexts[] = 'Short description (optional)';
                $helpTexts[] = 'Arabic short description (optional)';
                $helpTexts[] = 'Full description (optional)';
                $helpTexts[] = 'Arabic full description (optional)';
                $exampleRow[] = 'Updated Product Name';
                $exampleRow[] = 'اسم المنتج المحدث';
                $exampleRow[] = 'Short description';
                $exampleRow[] = 'وصف قصير';
                $exampleRow[] = 'Full description';
                $exampleRow[] = 'الوصف الكامل';
                break;
            case 'new_sell':
                $headers = [
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
                $helpTexts = [
                    'Parent SKU (required). Leave SKU empty for parent row.',
                    'Variant SKU (leave empty for parent row)',
                    'Color (optional)',
                    'Size (optional)',
                    'Inventory quantity (required)',
                    'Price (required)',
                    'Category name(s) separated by |',
                    'Arabic category name(s) separated by | (optional, same order as Category)',
                    'Main image URL(s) separated by comma or | (optional)',
                    'Product title (required for parent row)',
                    'Arabic product title (optional)',
                    'Short description in English (optional)',
                    'Short description in Arabic (optional)',
                    'Full description (optional)',
                    'Arabic full description (optional)',
                    'Weight in kg (optional)',
                    'Tags separated by | (optional)',
                    'true/false (optional)',
                    'Brand name (optional)',
                    'Store name/code/id from Stores list (optional)',
                ];
                $exampleRow = [
                    'ART-001',
                    'SKU-001',
                    'Black',
                    'M',
                    '25',
                    '99.00',
                    'Men|Shoes',
                    'رجالي|أحذية',
                    'https://example.com/product.jpg',
                    'Sample Product Title',
                    'عنوان المنتج',
                    'Short product description',
                    'وصف قصير للمنتج',
                    'Full product description',
                    'وصف المنتج الكامل',
                    '0.50',
                    'New|Sale',
                    'true',
                    'ExampleBrand',
                    'Dubai Hills',
                ];
                break;
            case 'add_update_category':
                $headers[] = 'category_name';
                $headers[] = 'ar_category';
                $helpTexts[] = 'Category name(s) separated by comma or |';
                $helpTexts[] = 'Arabic category name(s) separated by | (optional, same order as category_name)';
                $exampleRow[] = 'Men|Shoes';
                $exampleRow[] = 'رجالي|أحذية';
                break;
            case 'add_update_tag':
                $headers[] = 'tag_name';
                $helpTexts[] = 'Tag name(s) separated by comma or |';
                $exampleRow[] = 'New|Sale';
                break;
            case 'remove_product':
                $headers = ['sku'];
                $helpTexts = ['Required - SKU/Article'];
                $exampleRow = ['SKU-001'];
                break;
        }

        foreach ($headers as $index => $header) {
            $this->setCellByColRow($sheet, $index + 1, 1, $header);
        }

        foreach ($helpTexts as $index => $text) {
            $this->setCellByColRow($sheet, $index + 1, 2, $text);
        }

        foreach ($exampleRow as $index => $value) {
            $this->setCellByColRow($sheet, $index + 1, 3, $value);
        }

        $lastCol = count($headers);
        $headerRange = 'A1:' . $this->getColumnLetter($lastCol) . '1';
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        $helpRange = 'A2:' . $this->getColumnLetter($lastCol) . '2';
        $sheet->getStyle($helpRange)->applyFromArray([
            'font' => ['italic' => true, 'size' => 9, 'color' => ['rgb' => '666666']],
        ]);

        $exampleRange = 'A3:' . $this->getColumnLetter($lastCol) . '3';
        $sheet->getStyle($exampleRange)->applyFromArray([
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E2EFDA'],
            ],
        ]);

        foreach (range(1, $lastCol) as $col) {
            $sheet->getColumnDimension($this->getColumnLetter($col))->setAutoSize(true);
        }

        $sheet->freezePane('A3');
    }

    public function downloadTemplate(Request $request)
    {
        $action = $this->normalizeImportAction($request->query('action'));
        if ($action) {
            return $this->downloadActionTemplate($action);
        }

        // Check if custom template exists in storage
        $storedTemplate = storage_path('app/public/product_import_template.xlsx');
        if (file_exists($storedTemplate)) {
            return response()->download($storedTemplate, 'product_import_template.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]);
        }

        // Generate new template if no custom one exists
        $spreadsheet = new Spreadsheet();

        // Sheet 1: Products Template
        $productsSheet = $spreadsheet->getActiveSheet();
        $productsSheet->setTitle('Products');
        $this->buildProductsTemplate($productsSheet);

        // Sheet 2: Instructions
        $instructionsSheet = $spreadsheet->createSheet();
        $instructionsSheet->setTitle('Instructions');
        $this->buildInstructionsSheet($instructionsSheet);

        // Sheet 3: Example Data
        $exampleSheet = $spreadsheet->createSheet();
        $exampleSheet->setTitle('Example Data');
        $this->buildExampleSheet($exampleSheet);

        // Set Products sheet as active
        $spreadsheet->setActiveSheetIndex(0);

        // Create the file
        $writer = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'product_template_') . '.xlsx';
        $writer->save($tempFile);

        return response()->download($tempFile, 'product_import_template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    protected function buildProductsTemplate($sheet): void
    {
        // Headers with categories
        $columns = [
            // Required fields (Red background)
            ['header' => 'sku', 'required' => true, 'description' => 'Unique product identifier'],
            ['header' => 'name', 'required' => true, 'description' => 'Product name in English'],

            // Optional main fields (Blue background)
            ['header' => 'name_ar', 'required' => false, 'description' => 'Product name in Arabic'],
            ['header' => 'description', 'required' => false, 'description' => 'Full product description'],
            ['header' => 'short_description', 'required' => false, 'description' => 'Brief description'],

            // Pricing (Green background)
            ['header' => 'price', 'required' => false, 'description' => 'Regular price (default: 0)'],
            ['header' => 'sale_price', 'required' => false, 'description' => 'Discounted price'],
            ['header' => 'cost_price', 'required' => false, 'description' => 'Cost/purchase price'],

            // Inventory
            ['header' => 'stock', 'required' => false, 'description' => 'Stock quantity (default: 0)'],
            ['header' => 'weight', 'required' => false, 'description' => 'Product weight in kg'],

            // Categories & Tags
            ['header' => 'category', 'required' => false, 'description' => 'Categories separated by | (pipe)'],
            ['header' => 'ar_category', 'required' => false, 'description' => 'Arabic category names separated by | (same order as category)'],
            ['header' => 'tags', 'required' => false, 'description' => 'Tags separated by | (pipe)'],

            // Variants
            ['header' => 'size', 'required' => false, 'description' => 'Sizes separated by comma (S,M,L)'],
            ['header' => 'color', 'required' => false, 'description' => 'Colors separated by comma'],
            ['header' => 'variants', 'required' => false, 'description' => 'Complex variant format (see instructions)'],

            // Images
            ['header' => 'main_image_url', 'required' => false, 'description' => 'Main product image URL'],
            ['header' => 'gallery_images', 'required' => false, 'description' => 'Additional image URLs separated by |'],

            // Status
            ['header' => 'is_active', 'required' => false, 'description' => 'true/false (default: true)'],
            ['header' => 'is_featured', 'required' => false, 'description' => 'true/false (default: false)'],
            ['header' => 'is_trending', 'required' => false, 'description' => 'true/false (default: false)'],
            ['header' => 'safe_checkout', 'required' => false, 'description' => 'true/false (default: true)'],
            ['header' => 'secure_checkout', 'required' => false, 'description' => 'true/false (default: true)'],
            ['header' => 'social_share', 'required' => false, 'description' => 'true/false (default: true)'],
            ['header' => 'encourage_order', 'required' => false, 'description' => 'true/false (default: true)'],
            ['header' => 'encourage_view', 'required' => false, 'description' => 'true/false (default: true)'],

            // SEO
            ['header' => 'meta_title', 'required' => false, 'description' => 'SEO title'],
            ['header' => 'meta_description', 'required' => false, 'description' => 'SEO description'],
        ];

        // Write headers
        foreach ($columns as $col => $column) {
            $cellCol = $col + 1;
            $this->setCellByColRow($sheet, $cellCol, 1, $column['header']);
            $this->setCellByColRow($sheet, $cellCol, 2, $column['required'] ? 'REQUIRED' : 'Optional');

            // Style based on required/optional
            $cellAddress = $this->getColumnLetter($cellCol) . '1';
            $sheet->getStyle($cellAddress)->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => $column['required'] ? 'DC3545' : '28A745'],
                ],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            // Required/Optional row style
            $cellAddress2 = $this->getColumnLetter($cellCol) . '2';
            $sheet->getStyle($cellAddress2)->applyFromArray([
                'font' => ['italic' => true, 'size' => 9],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => $column['required'] ? 'F8D7DA' : 'D4EDDA'],
                ],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            // Add comment with description
            $sheet->getComment($cellAddress)->getText()->createTextRun($column['description']);
        }

        // Freeze rows 1-2
        $sheet->freezePane('A3');

        // Auto-size columns
        foreach (range('A', $this->getColumnLetter(count($columns))) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    protected function buildInstructionsSheet($sheet): void
    {
        $instructions = [
            ['PRODUCT IMPORT INSTRUCTIONS', ''],
            ['', ''],
            ['REQUIRED FIELDS:', ''],
            ['sku', 'Unique product identifier (SKU/Article code). Used to identify if product exists for updates.'],
            ['name', 'Product name in English'],
            ['', ''],
            ['OPTIONAL FIELDS:', ''],
            ['name_ar', 'Product name in Arabic (for bilingual stores)'],
            ['description', 'Full product description (can include HTML)'],
            ['short_description', 'Brief description shown in product listings'],
            ['price', 'Regular product price (number only, no currency symbol)'],
            ['sale_price', 'Sale/discounted price (leave empty if no discount)'],
            ['cost_price', 'Your cost/purchase price (for profit calculations)'],
            ['stock', 'Available stock quantity (number)'],
            ['weight', 'Product weight in kilograms'],
            ['', ''],
            ['CATEGORIES & TAGS:', ''],
            ['category', 'Use pipe (|) to separate multiple categories. Example: Bags|Handbags|Evening Bags'],
            ['tags', 'Use pipe (|) to separate multiple tags. Example: New Arrival|Sale|Summer'],
            ['', ''],
            ['VARIANTS (Method 1 - Simple):', ''],
            ['size', 'Comma-separated sizes. Example: S,M,L,XL'],
            ['color', 'Comma-separated colors. Example: Black,White,Red'],
            ['', 'This creates variants for ALL combinations (e.g., S-Black, S-White, M-Black, etc.)'],
            ['', ''],
            ['VARIANTS (Method 2 - With Prices):', ''],
            ['variants', 'Format: Size:VALUE|Color:VALUE|Price:NUMBER|Stock:NUMBER'],
            ['', 'Example: Size:S|Color:Red|Price:100|Stock:10,Size:M|Color:Red|Price:100|Stock:15'],
            ['', ''],
            ['VARIANTS (Method 3 - Simple Format):', ''],
            ['variants', 'Format: VALUE:PRICE:STOCK'],
            ['', 'Example: S:100:10,M:100:15,L:100:20'],
            ['', ''],
            ['IMAGES:', ''],
            ['main_image_url', 'Full URL to main product image (https://...)'],
            ['gallery_images', 'Additional image URLs separated by pipe (|)'],
            ['', 'Example: https://site.com/img1.jpg|https://site.com/img2.jpg'],
            ['', ''],
            ['STATUS FLAGS:', ''],
            ['is_active', 'true or false (default: true) - Whether product is visible'],
            ['is_featured', 'true or false (default: false) - Featured products shown prominently'],
            ['', ''],
            ['SEO FIELDS:', ''],
            ['meta_title', 'SEO page title (defaults to product name if empty)'],
            ['meta_description', 'SEO description for search engines'],
            ['', ''],
            ['AUTO-GENERATED FIELDS (Do NOT include):', ''],
            ['id', 'Product ID - auto-generated'],
            ['slug', 'URL-friendly product slug - auto-generated from name'],
            ['created_at', 'Creation timestamp - auto-generated'],
            ['updated_at', 'Last update timestamp - auto-generated'],
            ['stock_status', 'Auto-calculated from stock quantity'],
            ['', ''],
            ['UPDATING EXISTING PRODUCTS:', ''],
            ['', 'If a product with the same SKU already exists, it will be UPDATED.'],
            ['', 'New variants will be added, existing variants (by SKU) will be updated.'],
            ['', ''],
            ['ERROR HANDLING:', ''],
            ['', 'After import, you will receive a summary showing:'],
            ['', '- Number of products created/updated'],
            ['', '- Number of variations created/updated'],
            ['', '- An error file (if any rows failed) with detailed error messages'],
        ];

        foreach ($instructions as $row => $data) {
            $this->setCellByColRow($sheet, 1, $row + 1, $data[0]);
            $this->setCellByColRow($sheet, 2, $row + 1, $data[1]);
        }

        // Style title
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 16],
        ]);

        // Style section headers
        $sectionRows = [3, 7, 16, 19, 23, 27, 31, 35, 39, 43, 49, 52, 55];
        foreach ($sectionRows as $row) {
            $sheet->getStyle("A{$row}")->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => '0066CC']],
            ]);
        }

        $sheet->getColumnDimension('A')->setWidth(25);
        $sheet->getColumnDimension('B')->setWidth(80);
    }

    protected function buildExampleSheet($sheet): void
    {
        // Headers
        $headers = ['sku', 'name', 'name_ar', 'description', 'price', 'sale_price', 'stock', 'category', 'size', 'color', 'main_image_url', 'is_active', 'is_featured'];

        foreach ($headers as $col => $header) {
            $this->setCellByColRow($sheet, $col + 1, 1, $header);
        }

        // Style headers
        $lastCol = count($headers);
        $headerRange = 'A1:' . $this->getColumnLetter($lastCol) . '1';
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '0066CC'],
            ],
        ]);

        // Example data rows
        $examples = [
            ['BAG-001', 'Classic Leather Handbag', 'حقيبة جلدية كلاسيكية', 'Elegant leather handbag with gold hardware', '299.00', '249.00', '50', 'Bags|Handbags', 'Small,Medium,Large', 'Black,Brown,Tan', 'https://example.com/bag1.jpg', 'true', 'true'],
            ['SHOE-001', 'High Heel Pumps', 'كعب عالي', 'Elegant stiletto heels for special occasions', '189.00', '', '30', 'Shoes|Heels', '36,37,38,39,40', 'Black,Red,Nude', 'https://example.com/heel1.jpg', 'true', 'false'],
            ['ACC-001', 'Gold Chain Necklace', 'سلسلة ذهبية', 'Delicate 18k gold plated chain necklace', '79.00', '59.00', '100', 'Accessories|Jewelry', '', 'Gold,Silver,Rose Gold', 'https://example.com/necklace1.jpg', 'true', 'true'],
            ['DRESS-001', 'Evening Gown', 'فستان سهرة', 'Floor-length evening dress with sequin details', '599.00', '', '15', 'Clothing|Dresses|Evening', 'XS,S,M,L,XL', 'Black,Navy,Burgundy', 'https://example.com/dress1.jpg', 'true', 'false'],
        ];

        $rowNum = 2;
        foreach ($examples as $example) {
            foreach ($example as $col => $value) {
                $this->setCellByColRow($sheet, $col + 1, $rowNum, $value);
            }
            $rowNum++;
        }

        // Auto-size columns
        foreach (range('A', $this->getColumnLetter($lastCol)) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Add note
        $sheet->setCellValue('A7', 'NOTE: Copy the format above to the "Products" sheet. Delete this example data.');
        $sheet->getStyle('A7')->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '666666']],
        ]);
    }
}
