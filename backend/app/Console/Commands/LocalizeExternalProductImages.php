<?php

namespace App\Console\Commands;

use App\Models\Attachment;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Services\ExternalImageDownloader;
use App\Support\MediaUrl;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LocalizeExternalProductImages extends Command
{
    protected $signature = 'media:localize-external-product-images
                            {--dry-run : Preview updates without writing}
                            {--limit= : Process up to N products}
                            {--product_id= : Process one specific product ID}';

    protected $description = 'Download external product images to local storage and relink products to local attachments';

    private int $productsProcessed = 0;
    private int $productImagesProcessed = 0;
    private int $productImagesUpdated = 0;
    private int $variantImagesProcessed = 0;
    private int $variantImagesUpdated = 0;
    private int $attachmentsDownloaded = 0;
    private int $attachmentsReused = 0;
    private int $attachmentsCreated = 0;
    private int $productsLinksUpdated = 0;
    private int $failed = 0;

    /** @var array<string, int|string> */
    private array $attachmentIdByHash = [];

    public function __construct(private readonly ExternalImageDownloader $downloader)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit = max(0, (int) ($this->option('limit') ?? 0));
        $productId = $this->readProductIdOption();
        if ($productId === false) {
            return self::FAILURE;
        }

        if (!Schema::hasTable('attachments')) {
            $this->error('Missing table: attachments. Run migrations first.');
            return self::FAILURE;
        }

        if (!Schema::hasColumn('attachments', 'source_url') || !Schema::hasColumn('attachments', 'file_hash')) {
            $this->error('Missing attachments.source_url/file_hash columns. Run migrations first.');
            return self::FAILURE;
        }

        if (!Schema::hasColumn('products', 'product_thumbnail_id') || !Schema::hasColumn('products', 'product_galleries_id')) {
            $this->error('Missing products.product_thumbnail_id/product_galleries_id columns. Run migrations first.');
            return self::FAILURE;
        }

        $query = $this->buildProductQuery($productId);
        $candidateCount = (clone $query)->count();
        if ($candidateCount === 0) {
            $this->info('No products matched the selection.');
            return self::SUCCESS;
        }

        $targetCount = $limit > 0 ? min($limit, $candidateCount) : $candidateCount;
        $this->info(sprintf(
            'Starting external image localization (%s): %d product(s)',
            $dryRun ? 'dry-run' : 'write',
            $targetCount
        ));

        $query->chunkById(100, function ($products) use ($dryRun, $limit) {
            foreach ($products as $product) {
                if ($limit > 0 && $this->productsProcessed >= $limit) {
                    return false;
                }

                $this->processProduct($product, $dryRun);
            }

            return null;
        });

        $this->newLine();
        $this->line('Summary');
        $this->line('-------');
        $this->line('Products processed: ' . $this->productsProcessed);
        $this->line('Product images processed: ' . $this->productImagesProcessed);
        $this->line('Product images updated: ' . $this->productImagesUpdated);
        $this->line('Variant images processed: ' . $this->variantImagesProcessed);
        $this->line('Variant images updated: ' . $this->variantImagesUpdated);
        $this->line('Attachments downloaded: ' . $this->attachmentsDownloaded);
        $this->line('Attachments reused: ' . $this->attachmentsReused);
        $this->line('Attachments created (local refs): ' . $this->attachmentsCreated);
        $this->line('Product link fields updated: ' . $this->productsLinksUpdated);
        $this->line('Failed: ' . $this->failed);

        return self::SUCCESS;
    }

    private function processProduct(Product $product, bool $dryRun): void
    {
        $this->productsProcessed++;

        $this->processProductImages($product, $dryRun);
        $this->processVariantImages($product, $dryRun);
        $this->syncProductAttachmentLinks($product, $dryRun);
    }

    private function processProductImages(Product $product, bool $dryRun): void
    {
        $images = ProductImage::query()
            ->where('product_id', $product->id)
            ->orderByDesc('is_primary')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'image']);

        foreach ($images as $image) {
            $this->productImagesProcessed++;
            $originalValue = $this->stringValue($image->getRawOriginal('image'));
            $normalizedOriginal = $this->normalizeMediaValue($originalValue);

            if ($normalizedOriginal === null) {
                continue;
            }

            try {
                $resolved = $this->localizeMediaReference($normalizedOriginal, true);
            } catch (\Throwable $e) {
                $this->failed++;
                $this->warn(sprintf('[product %d] product_image %d failed: %s', $product->id, $image->id, $e->getMessage()));
                continue;
            }

            if ($resolved === null || $resolved === $normalizedOriginal) {
                continue;
            }

            $this->productImagesUpdated++;
            if (!$dryRun) {
                $image->forceFill(['image' => $resolved])->save();
            }
        }
    }

    private function processVariantImages(Product $product, bool $dryRun): void
    {
        $variants = ProductVariant::query()
            ->where('product_id', $product->id)
            ->whereNotNull('image')
            ->get(['id', 'image']);

        foreach ($variants as $variant) {
            $this->variantImagesProcessed++;
            $originalValue = $this->stringValue($variant->getRawOriginal('image'));
            $normalizedOriginal = $this->normalizeMediaValue($originalValue);

            if ($normalizedOriginal === null) {
                continue;
            }

            try {
                $resolved = $this->localizeMediaReference($normalizedOriginal, true);
            } catch (\Throwable $e) {
                $this->failed++;
                $this->warn(sprintf('[product %d] variant %d failed: %s', $product->id, $variant->id, $e->getMessage()));
                continue;
            }

            if ($resolved === null || $resolved === $normalizedOriginal) {
                continue;
            }

            $this->variantImagesUpdated++;
            if (!$dryRun) {
                $variant->forceFill(['image' => $resolved])->save();
            }
        }
    }

    private function syncProductAttachmentLinks(Product $product, bool $dryRun): void
    {
        $images = ProductImage::query()
            ->where('product_id', $product->id)
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
            $attachmentId = $this->ensureAttachmentIdForMedia($image->image, $dryRun);
            if ($attachmentId !== null && !in_array($attachmentId, $galleryIds, true)) {
                $galleryIds[] = $attachmentId;
            }
        }

        if (empty($galleryIds)) {
            return;
        }

        $thumbnailId = $galleryIds[0] ?? null;
        $currentThumbnail = $this->stringValue($product->getRawOriginal('product_thumbnail_id'));
        $currentGalleryIds = array_map('strval', $this->normalizeGalleryIds($product->getRawOriginal('product_galleries_id')));
        $newGalleryIds = array_map('strval', $galleryIds);
        $newThumbnail = $thumbnailId === null ? null : (string) $thumbnailId;

        if ($currentThumbnail === $newThumbnail && $currentGalleryIds === $newGalleryIds) {
            return;
        }

        $this->productsLinksUpdated++;
        if ($dryRun) {
            return;
        }

        $product->forceFill([
            'product_thumbnail_id' => is_numeric($thumbnailId) ? (int) $thumbnailId : null,
            'product_galleries_id' => array_map(
                static fn ($id) => is_numeric($id) ? (int) $id : $id,
                $galleryIds
            ),
        ])->save();
    }

    /**
     * @return int|string|null
     */
    private function ensureAttachmentIdForMedia(?string $media, bool $dryRun): int|string|null
    {
        $normalized = $this->normalizeMediaValue($media);
        if ($normalized === null) {
            return null;
        }

        $storagePath = MediaUrl::extractStoragePath($normalized);
        $normalizedForStorage = $storagePath ?? $normalized;
        $hash = hash('sha256', $normalizedForStorage);

        if (array_key_exists($hash, $this->attachmentIdByHash)) {
            return $this->attachmentIdByHash[$hash];
        }

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
            $this->attachmentIdByHash[$hash] = (int) $existing->id;
            return (int) $existing->id;
        }

        if ($dryRun) {
            $syntheticId = 'dry-' . substr($hash, 0, 12);
            $this->attachmentIdByHash[$hash] = $syntheticId;
            return $syntheticId;
        }

        $fileName = $this->extractFileName($normalizedForStorage);
        $isAbsolute = $this->isAbsoluteHttpUrl($normalized);
        $isLocal = $storagePath !== null || !$isAbsolute;
        $size = null;

        if ($storagePath !== null && Storage::disk('public')->exists($storagePath)) {
            $size = Storage::disk('public')->size($storagePath);
        }

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
            $payload['size'] = $size;
        }

        $created = Attachment::query()->create($payload);
        $createdId = (int) $created->id;
        $this->attachmentIdByHash[$hash] = $createdId;
        $this->attachmentsCreated++;

        return $createdId;
    }

    private function localizeMediaReference(string $normalized, bool $force): ?string
    {
        $storagePath = MediaUrl::extractStoragePath($normalized);
        if ($storagePath !== null) {
            return $storagePath;
        }

        if (!$this->isAbsoluteHttpUrl($normalized)) {
            return ltrim(str_replace('\\', '/', $normalized), '/');
        }

        $attachment = $this->downloader->downloadAndCreateAttachment($normalized, $force);
        if ($attachment === null) {
            return $normalized;
        }

        if ($attachment->wasRecentlyCreated) {
            $this->attachmentsDownloaded++;
        } else {
            $this->attachmentsReused++;
        }

        $resolvedPath = $this->downloader->resolveAttachmentPath($attachment);
        if ($resolvedPath !== null) {
            return $resolvedPath;
        }

        $candidate = $attachment->path ?: $attachment->original_url;
        $candidateNormalized = $this->normalizeMediaValue($candidate);
        if ($candidateNormalized === null) {
            return null;
        }

        $candidateStorage = MediaUrl::extractStoragePath($candidateNormalized);
        return $candidateStorage ?? $candidateNormalized;
    }

    private function buildProductQuery(int|false|null $productId): Builder
    {
        $query = Product::query()
            ->select(['id', 'product_thumbnail_id', 'product_galleries_id'])
            ->orderBy('id');

        if (is_int($productId)) {
            $query->where('id', $productId);
        }

        return $query;
    }

    /**
     * @return int|false|null
     */
    private function readProductIdOption(): int|false|null
    {
        $productIdOption = $this->option('product_id');
        if ($productIdOption === null || $productIdOption === '') {
            return null;
        }

        if (!ctype_digit((string) $productIdOption)) {
            $this->error('Option --product_id must be a positive integer.');
            return false;
        }

        return (int) $productIdOption;
    }

    /**
     * @return array<int, int|string>
     */
    private function normalizeGalleryIds(mixed $value): array
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
        foreach ($raw as $id) {
            if (is_numeric($id)) {
                $normalized[] = (int) $id;
            } elseif (is_string($id) && trim($id) !== '') {
                $normalized[] = trim($id);
            }
        }

        return array_values(array_unique($normalized, SORT_REGULAR));
    }

    private function normalizeMediaValue(mixed $value): ?string
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

        $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $normalizedExt = preg_replace_callback(
            '/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(?=($|[?#]))/i',
            static fn ($matches) => '.' . strtolower($matches[1]),
            $decoded
        );

        $trimmed = trim((string) $normalizedExt);
        return $trimmed !== '' ? $trimmed : null;
    }

    private function extractFileName(string $value): string
    {
        $path = parse_url($value, PHP_URL_PATH);
        $candidate = $path ? basename($path) : basename($value);
        $decoded = rawurldecode((string) $candidate);
        $clean = trim((string) preg_replace('/[\x00-\x1F\x7F]/', '', $decoded));

        if ($clean === '' || $clean === '.' || $clean === '..') {
            return 'media-' . substr(hash('sha1', $value), 0, 16);
        }

        return Str::limit($clean, 255, '');
    }

    private function mimeTypeFromFileName(string $fileName): ?string
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

    private function isAbsoluteHttpUrl(string $value): bool
    {
        return (bool) preg_match('#^https?://#i', trim($value));
    }

    private function stringValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            return $value;
        }

        if (is_scalar($value)) {
            return (string) $value;
        }

        return null;
    }
}
