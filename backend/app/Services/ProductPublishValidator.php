<?php

namespace App\Services;

use App\Models\Product;
use App\Support\MediaUrl;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductPublishValidator
{
    private const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];

    private const STOCK_STATUSES = ['in_stock', 'out_of_stock', 'on_backorder'];

    private const FIELD_MESSAGES = [
        'image' => 'Main image is required',
        'price' => 'Regular price must be greater than 0',
        'stock' => 'Stock is required',
        'category' => 'At least one category is required',
        'attributes' => 'At least one attribute with value is required',
        'sku' => 'SKU is required',
    ];

    private const BULK_REASON_MESSAGES = [
        'image' => 'Missing image',
        'price' => 'Missing regular price',
        'stock' => 'Missing stock',
        'category' => 'Missing category',
        'attributes' => 'Missing attributes',
        'sku' => 'Missing SKU',
    ];

    /** @var array<string, bool> */
    private array $imageReachabilityCache = [];

    /**
     * Validate if a product can be published.
     *
     * @return array{
     *     valid: bool,
     *     errors: array<string, array<int, string>>,
     *     reasons: array<int, string>
     * }
     */
    public function validate(Product $product): array
    {
        $product->loadMissing([
            'images:id,product_id,product_variant_id,image,is_primary',
            'categories:id',
            'variants:id,product_id,sku,price,stock_quantity,is_active',
            'variants.attributeValues:id,attribute_id',
        ]);

        $errors = [];
        $isVariantProduct = $this->isVariantProduct($product);
        $variants = $this->relevantVariants($product);

        if (!$this->hasImage($product)) {
            $errors['image'][] = self::FIELD_MESSAGES['image'];
        }

        if (!$this->hasValidRegularPrice($product, $isVariantProduct, $variants)) {
            $errors['price'][] = self::FIELD_MESSAGES['price'];
        }

        if (!$this->hasValidStock($product, $isVariantProduct, $variants)) {
            $errors['stock'][] = self::FIELD_MESSAGES['stock'];
        }

        if ($product->categories->isEmpty()) {
            $errors['category'][] = self::FIELD_MESSAGES['category'];
        }

        if (!$this->hasAttributesWithValues($variants)) {
            $errors['attributes'][] = self::FIELD_MESSAGES['attributes'];
        }

        if (!$this->hasValidSku($product, $isVariantProduct, $variants)) {
            $errors['sku'][] = self::FIELD_MESSAGES['sku'];
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'reasons' => $this->buildReasons($errors),
        ];
    }

    private function isVariantProduct(Product $product): bool
    {
        $type = strtolower((string) $product->type);

        if (in_array($type, ['variable', 'classified', 'variant'], true)) {
            return true;
        }

        if ((bool) $product->has_variants) {
            return true;
        }

        return $product->variants->isNotEmpty();
    }

    private function relevantVariants(Product $product): Collection
    {
        $activeVariants = $product->variants->where('is_active', true);

        return $activeVariants->isNotEmpty() ? $activeVariants : $product->variants;
    }

    private function hasImage(Product $product): bool
    {
        $images = $product->images
            ->filter(fn($image) => trim((string) $image->image) !== '')
            ->sortByDesc(fn($image) => (bool) $image->is_primary)
            ->values();

        if ($images->isEmpty()) {
            return false;
        }

        foreach ($images as $image) {
            if ($this->isImageReachable((string) $image->image)) {
                return true;
            }
        }

        return false;
    }

    private function hasValidRegularPrice(Product $product, bool $isVariantProduct, Collection $variants): bool
    {
        if ($isVariantProduct) {
            if ($variants->isEmpty()) {
                return false;
            }

            foreach ($variants as $variant) {
                if ($variant->price === null || (float) $variant->price <= 0) {
                    return false;
                }
            }

            return true;
        }

        return $product->price !== null && (float) $product->price > 0;
    }

    private function hasValidStock(Product $product, bool $isVariantProduct, Collection $variants): bool
    {
        if ($isVariantProduct) {
            if ($variants->isEmpty()) {
                return false;
            }

            foreach ($variants as $variant) {
                if ($variant->stock_quantity === null || (int) $variant->stock_quantity < 0) {
                    return false;
                }
            }

            return true;
        }

        $hasStockQuantity = $product->stock_quantity !== null && (int) $product->stock_quantity >= 0;
        $hasStockStatus = in_array((string) $product->stock_status, self::STOCK_STATUSES, true);

        return $hasStockQuantity && $hasStockStatus;
    }

    private function hasAttributesWithValues(Collection $variants): bool
    {
        if ($variants->isEmpty()) {
            return false;
        }

        foreach ($variants as $variant) {
            if ($variant->attributeValues->isNotEmpty()) {
                return true;
            }
        }

        return false;
    }

    private function hasValidSku(Product $product, bool $isVariantProduct, Collection $variants): bool
    {
        if ($isVariantProduct) {
            if ($variants->isEmpty()) {
                return false;
            }

            foreach ($variants as $variant) {
                if (trim((string) $variant->sku) === '') {
                    return false;
                }
            }

            return true;
        }

        return trim((string) $product->sku) !== '';
    }

    private function buildReasons(array $errors): array
    {
        $reasons = [];

        foreach (array_keys($errors) as $field) {
            $reasons[] = self::BULK_REASON_MESSAGES[$field] ?? 'Missing required publish fields';
        }

        return array_values(array_unique($reasons));
    }

    private function isImageReachable(string $imagePath): bool
    {
        $rawPath = trim((string) html_entity_decode($imagePath, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if ($rawPath === '') {
            return false;
        }

        if (!$this->isAbsoluteHttpUrl($rawPath)) {
            $storagePath = str_replace('\\', '/', ltrim($rawPath, '/'));
            if (Str::startsWith($storagePath, 'storage/')) {
                $storagePath = ltrim(Str::after($storagePath, 'storage/'), '/');
            }

            return $storagePath !== '' && Storage::disk('public')->exists($storagePath);
        }

        $normalizedUrl = MediaUrl::fromPath($rawPath);
        if (!$normalizedUrl) {
            return false;
        }

        if (array_key_exists($normalizedUrl, $this->imageReachabilityCache)) {
            return $this->imageReachabilityCache[$normalizedUrl];
        }

        $reachable = $this->checkImageUrl($normalizedUrl);
        $this->imageReachabilityCache[$normalizedUrl] = $reachable;

        return $reachable;
    }

    private function checkImageUrl(string $url): bool
    {
        try {
            $client = Http::timeout(4)
                ->connectTimeout(2)
                ->retry(1, 150)
                ->withHeaders([
                    'User-Agent' => 'CupleProductPublishValidator/1.0',
                    'Accept' => 'image/*,*/*;q=0.8',
                ]);

            $headResponse = $client->head($url);
            if ($this->isValidImageResponse($headResponse, $url)) {
                return true;
            }

            if (in_array($headResponse->status(), [405, 403], true)) {
                $getResponse = $client->withHeaders(['Range' => 'bytes=0-0'])->get($url);
                return $this->isValidImageResponse($getResponse, $url);
            }

            return false;
        } catch (\Throwable) {
            return false;
        }
    }

    private function isValidImageResponse(Response $response, string $url): bool
    {
        if (!$response->successful()) {
            return false;
        }

        $contentType = strtolower((string) $response->header('Content-Type'));
        if ($contentType !== '' && Str::contains($contentType, 'image/')) {
            return true;
        }

        $path = (string) parse_url($url, PHP_URL_PATH);
        $extension = strtolower((string) pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, self::IMAGE_EXTENSIONS, true);
    }

    private function isAbsoluteHttpUrl(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_URL) !== false
            || preg_match('#^https?://#i', $value) === 1;
    }
}
