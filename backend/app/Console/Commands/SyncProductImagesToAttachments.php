<?php

namespace App\Console\Commands;

use App\Models\Attachment;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema;

class SyncProductImagesToAttachments extends Command
{
    protected $signature = 'cuple:sync-product-images-to-attachments
                            {--dry-run : Preview changes without writing data}
                            {--limit= : Process up to N products}
                            {--product_id= : Process one specific product ID}';

    protected $description = 'Create attachment records from product_images and link products.thumbnail/galleries IDs';

    private int $productsProcessed = 0;
    private int $productsLinked = 0;
    private int $productsAlreadyLinked = 0;
    private int $productsSkippedNoImages = 0;
    private int $productsSkippedNoResolvableMedia = 0;
    private int $attachmentsCreated = 0;
    private int $attachmentsReused = 0;
    private int $normalizedImageValues = 0;
    private int $warningsCount = 0;

    /** @var array<string, int|string> */
    private array $attachmentIdByHash = [];

    /** @var array<string, int> */
    private array $singleAttachmentIdByFileName = [];

    /** @var array<string, bool> */
    private array $ambiguousFileNames = [];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit = max(0, (int) ($this->option('limit') ?? 0));
        $productIdOption = $this->option('product_id');

        if (!Schema::hasTable('attachments')) {
            $this->error('Missing table: attachments. Run migrations first.');
            return self::FAILURE;
        }

        if (!Schema::hasColumn('products', 'product_thumbnail_id') || !Schema::hasColumn('products', 'product_galleries_id')) {
            $this->error('Missing products.product_thumbnail_id/product_galleries_id columns. Run migrations first.');
            return self::FAILURE;
        }

        $productId = null;
        if ($productIdOption !== null && $productIdOption !== '') {
            if (!ctype_digit((string) $productIdOption)) {
                $this->error('Option --product_id must be a positive integer.');
                return self::FAILURE;
            }

            $productId = (int) $productIdOption;
        }

        $this->hydrateAttachmentCaches();

        $query = $this->buildProductQuery($productId);
        $candidateCount = (clone $query)->count();

        if ($candidateCount === 0) {
            $this->info('No products matched the selection.');
            return self::SUCCESS;
        }

        $targetCount = $limit > 0 ? min($candidateCount, $limit) : $candidateCount;

        $this->info(sprintf(
            'Sync started (%s): %d candidate products',
            $dryRun ? 'dry-run' : 'write',
            $targetCount
        ));

        $query->chunkById(100, function ($products) use ($dryRun, $limit) {
            foreach ($products as $product) {
                if ($limit > 0 && $this->productsProcessed >= $limit) {
                    return false;
                }

                $this->productsProcessed++;
                $this->processProduct($product, $dryRun);
            }

            return null;
        });

        $this->newLine();
        $this->line('Summary');
        $this->line('-------');
        $this->line('Products processed: ' . $this->productsProcessed);
        $this->line('Products linked: ' . $this->productsLinked);
        $this->line('Products already linked: ' . $this->productsAlreadyLinked);
        $this->line('Products skipped (no images): ' . $this->productsSkippedNoImages);
        $this->line('Products skipped (no resolvable media): ' . $this->productsSkippedNoResolvableMedia);
        $this->line('Attachments created: ' . $this->attachmentsCreated);
        $this->line('Attachments reused: ' . $this->attachmentsReused);
        $this->line('Normalized image values: ' . $this->normalizedImageValues);
        $this->line('Warnings: ' . $this->warningsCount);

        return self::SUCCESS;
    }

    private function buildProductQuery(?int $productId): Builder
    {
        $query = Product::query()
            ->select(['id', 'product_thumbnail_id', 'product_galleries_id'])
            ->whereHas('images', function ($q) {
                $q->whereNull('product_variant_id');
            })
            ->orderBy('id');

        if ($productId !== null) {
            $query->where('id', $productId);
        }

        return $query;
    }

    private function processProduct(Product $product, bool $dryRun): void
    {
        $images = ProductImage::query()
            ->where('product_id', $product->id)
            ->whereNull('product_variant_id')
            ->orderByDesc('is_primary')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'image', 'is_primary', 'sort_order']);

        if ($images->isEmpty()) {
            $this->productsSkippedNoImages++;
            return;
        }

        $orderedAttachmentIds = [];
        $thumbnailAttachmentId = null;

        foreach ($images as $image) {
            $rawImageValue = $this->stringValue($image->getRawOriginal('image'));
            $normalizedImageValue = $this->normalizeMediaValue($rawImageValue);

            if ($normalizedImageValue === null) {
                $this->warningsCount++;
                $this->warn("[product {$product->id}] image {$image->id} skipped: empty media value");
                continue;
            }

            if ($normalizedImageValue !== $rawImageValue) {
                $this->normalizedImageValues++;

                if (!$dryRun) {
                    $image->forceFill(['image' => $normalizedImageValue])->save();
                }
            }

            $attachment = $this->findOrCreateAttachment($normalizedImageValue, $dryRun);
            if ($attachment === null || !array_key_exists('id', $attachment)) {
                $this->warningsCount++;
                $this->warn("[product {$product->id}] image {$image->id} skipped: attachment resolution failed");
                continue;
            }

            $attachmentId = $attachment['id'];
            if (!in_array($attachmentId, $orderedAttachmentIds, true)) {
                $orderedAttachmentIds[] = $attachmentId;
            }

            if ($thumbnailAttachmentId === null && (bool) $image->is_primary) {
                $thumbnailAttachmentId = $attachmentId;
            }
        }

        if (empty($orderedAttachmentIds)) {
            $this->productsSkippedNoResolvableMedia++;
            return;
        }

        if ($thumbnailAttachmentId === null) {
            $thumbnailAttachmentId = $orderedAttachmentIds[0];
        }

        $currentThumbnailId = $this->stringValue($product->getRawOriginal('product_thumbnail_id'));
        $currentGalleryIds = array_map('strval', $this->normalizeGalleryIds($product->getRawOriginal('product_galleries_id')));

        $newThumbnailId = (string) $thumbnailAttachmentId;
        $newGalleryIds = array_map('strval', $orderedAttachmentIds);

        $needsUpdate = $currentThumbnailId !== $newThumbnailId || $currentGalleryIds !== $newGalleryIds;

        if (!$needsUpdate) {
            $this->productsAlreadyLinked++;
            return;
        }

        $this->productsLinked++;

        if ($dryRun) {
            return;
        }

        $product->forceFill([
            'product_thumbnail_id' => is_numeric($thumbnailAttachmentId) ? (int) $thumbnailAttachmentId : null,
            'product_galleries_id' => array_map(
                static fn ($id) => is_numeric($id) ? (int) $id : $id,
                $orderedAttachmentIds
            ),
        ])->save();
    }

    /**
     * @return array{id: int|string, created: bool}|null
     */
    private function findOrCreateAttachment(string $normalizedUrl, bool $dryRun): ?array
    {
        $hash = hash('sha256', $normalizedUrl);

        if (array_key_exists($hash, $this->attachmentIdByHash)) {
            $this->attachmentsReused++;
            return [
                'id' => $this->attachmentIdByHash[$hash],
                'created' => false,
            ];
        }

        $fileName = $this->extractFileName($normalizedUrl);
        $fileNameKey = mb_strtolower($fileName);

        $existing = Attachment::query()
            ->select(['id', 'url_hash'])
            ->where('url_hash', $hash)
            ->orWhere('original_url', $normalizedUrl)
            ->first();

        if (!$existing && isset($this->singleAttachmentIdByFileName[$fileNameKey]) && !isset($this->ambiguousFileNames[$fileNameKey])) {
            $existing = Attachment::query()
                ->select(['id', 'url_hash'])
                ->find($this->singleAttachmentIdByFileName[$fileNameKey]);
        }

        if ($existing) {
            $resolvedHash = $existing->url_hash ?: $hash;
            $resolvedId = (int) $existing->id;
            $this->attachmentIdByHash[$resolvedHash] = $resolvedId;
            $this->attachmentIdByHash[$hash] = $resolvedId;
            $this->attachmentsReused++;

            return [
                'id' => $resolvedId,
                'created' => false,
            ];
        }

        if ($dryRun) {
            $syntheticId = 'dry-' . substr($hash, 0, 12);
            $this->attachmentIdByHash[$hash] = $syntheticId;
            $this->attachmentsCreated++;

            return [
                'id' => $syntheticId,
                'created' => true,
            ];
        }

        $created = Attachment::query()->create([
            'name' => $fileName,
            'file_name' => $fileName,
            'path' => $this->extractStoragePath($normalizedUrl),
            'original_url' => $normalizedUrl,
            'url_hash' => $hash,
            'disk' => 'external',
            'source' => $this->isAbsoluteHttpUrl($normalizedUrl) ? 'external' : 'local',
            'mime_type' => $this->mimeTypeFromFileName($fileName),
        ]);

        $createdId = (int) $created->id;
        $this->attachmentIdByHash[$hash] = $createdId;
        $this->attachmentsCreated++;

        if ($fileNameKey !== '') {
            if (isset($this->singleAttachmentIdByFileName[$fileNameKey]) && $this->singleAttachmentIdByFileName[$fileNameKey] !== $createdId) {
                $this->ambiguousFileNames[$fileNameKey] = true;
                unset($this->singleAttachmentIdByFileName[$fileNameKey]);
            } elseif (!isset($this->ambiguousFileNames[$fileNameKey])) {
                $this->singleAttachmentIdByFileName[$fileNameKey] = $createdId;
            }
        }

        return [
            'id' => $createdId,
            'created' => true,
        ];
    }

    private function hydrateAttachmentCaches(): void
    {
        Attachment::query()
            ->select(['id', 'url_hash', 'file_name'])
            ->orderBy('id')
            ->chunkById(1000, function ($rows) {
                foreach ($rows as $row) {
                    if ($row->url_hash) {
                        $this->attachmentIdByHash[$row->url_hash] = (int) $row->id;
                    }

                    $fileNameKey = mb_strtolower(trim((string) $row->file_name));
                    if ($fileNameKey === '') {
                        continue;
                    }

                    if (isset($this->ambiguousFileNames[$fileNameKey])) {
                        continue;
                    }

                    if (isset($this->singleAttachmentIdByFileName[$fileNameKey]) && $this->singleAttachmentIdByFileName[$fileNameKey] !== (int) $row->id) {
                        unset($this->singleAttachmentIdByFileName[$fileNameKey]);
                        $this->ambiguousFileNames[$fileNameKey] = true;
                        continue;
                    }

                    $this->singleAttachmentIdByFileName[$fileNameKey] = (int) $row->id;
                }
            });
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
        foreach ($raw as $item) {
            if (is_numeric($item)) {
                $normalized[] = (int) $item;
            } elseif (is_string($item) && trim($item) !== '') {
                $normalized[] = trim($item);
            }
        }

        return array_values(array_unique($normalized, SORT_REGULAR));
    }

    private function extractFileName(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH);
        $candidate = $path ? basename($path) : basename($url);
        $decoded = rawurldecode((string) $candidate);
        $clean = trim(preg_replace('/[\x00-\x1F\x7F]/', '', $decoded));

        if ($clean === '' || $clean === '.' || $clean === '..') {
            return 'media-' . substr(hash('sha1', $url), 0, 16);
        }

        return mb_substr($clean, 0, 255);
    }

    private function extractStoragePath(string $url): ?string
    {
        if ($this->isAbsoluteHttpUrl($url)) {
            $path = (string) parse_url($url, PHP_URL_PATH);
            $path = ltrim(str_replace('\\', '/', $path), '/');

            if (str_starts_with($path, 'storage/')) {
                return ltrim(substr($path, 8), '/');
            }

            return null;
        }

        $relative = ltrim(str_replace('\\', '/', $url), '/');
        if (str_starts_with($relative, 'storage/')) {
            return ltrim(substr($relative, 8), '/');
        }

        return $relative !== '' ? $relative : null;
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
