<?php

namespace App\Services;

use App\Models\Attachment;
use App\Support\MediaUrl;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class ExternalImageDownloader
{
    /**
     * Download an external image URL, store it locally, and create/reuse an attachment.
     *
     * @throws RuntimeException
     */
    public function downloadAndCreateAttachment(string $url, bool $force = false): ?Attachment
    {
        $normalizedUrl = $this->normalizeUrl($url);
        if ($normalizedUrl === null || !$this->isAbsoluteHttpUrl($normalizedUrl)) {
            return null;
        }

        if (!$this->isExternalUrl($normalizedUrl)) {
            return null;
        }

        if (!$force && !$this->isEnabled()) {
            return null;
        }

        $host = strtolower((string) parse_url($normalizedUrl, PHP_URL_HOST));
        if (!$this->isAllowedHost($host)) {
            throw new RuntimeException("External host is not allowed for media localization: {$host}");
        }

        if ($bySource = $this->findAttachmentBySourceUrl($normalizedUrl)) {
            return $bySource;
        }

        $response = Http::timeout($this->downloadTimeoutSeconds())
            ->withHeaders(['User-Agent' => $this->downloadUserAgent()])
            ->get($normalizedUrl);

        if (!$response->successful()) {
            throw new RuntimeException("Failed to download external image (HTTP {$response->status()}): {$normalizedUrl}");
        }

        $contentType = $this->normalizeContentType($response->header('Content-Type'));
        if (!$this->isImageContentType($contentType)) {
            $displayType = $contentType ?: 'unknown';
            throw new RuntimeException("External URL is not an image ({$displayType}): {$normalizedUrl}");
        }

        $contentLength = (int) ($response->header('Content-Length') ?? 0);
        $maxBytes = $this->maxFileSizeBytes();
        if ($contentLength > 0 && $contentLength > $maxBytes) {
            throw new RuntimeException("External image exceeds max size of {$this->maxFileSizeMb()}MB: {$normalizedUrl}");
        }

        $body = $response->body();
        if ($body === '') {
            throw new RuntimeException("External image response is empty: {$normalizedUrl}");
        }

        $size = strlen($body);
        if ($size > $maxBytes) {
            throw new RuntimeException("External image exceeds max size of {$this->maxFileSizeMb()}MB after download: {$normalizedUrl}");
        }

        $fileHash = hash('sha256', $body);
        if ($byFileHash = $this->findAttachmentByFileHash($fileHash)) {
            $this->attachSourceUrlIfPossible($byFileHash, $normalizedUrl);
            return $byFileHash;
        }

        $path = $this->storeDownloadedImage($normalizedUrl, $contentType, $fileHash, $body);

        $attachmentPayload = [
            'name' => basename($path),
            'file_name' => basename($path),
            'path' => $path,
            'original_url' => $path,
            'url_hash' => hash('sha256', $path),
            'disk' => 'public',
            'source' => 'external_download',
            'mime_type' => $contentType,
            'size' => $size,
        ];

        if (Schema::hasColumn('attachments', 'source_url')) {
            $attachmentPayload['source_url'] = $normalizedUrl;
        }

        if (Schema::hasColumn('attachments', 'file_hash')) {
            $attachmentPayload['file_hash'] = $fileHash;
        }

        return Attachment::query()->create($attachmentPayload);
    }

    public function shouldLocalize(string $value): bool
    {
        $normalized = $this->normalizeUrl($value);
        if ($normalized === null || !$this->isAbsoluteHttpUrl($normalized)) {
            return false;
        }

        return $this->isEnabled() && $this->isExternalUrl($normalized);
    }

    public function isEnabled(): bool
    {
        return (bool) config('media.localize_external', true);
    }

    private function findAttachmentBySourceUrl(string $sourceUrl): ?Attachment
    {
        if (!Schema::hasTable('attachments')) {
            return null;
        }

        $query = Attachment::query();

        if (Schema::hasColumn('attachments', 'source_url')) {
            $match = $query->where('source_url', $sourceUrl)->first();
            if ($match) {
                return $match;
            }
        }

        return Attachment::query()
            ->where('original_url', $sourceUrl)
            ->where('source', 'external_download')
            ->first();
    }

    private function findAttachmentByFileHash(string $fileHash): ?Attachment
    {
        if (!Schema::hasTable('attachments')) {
            return null;
        }

        $query = Attachment::query();

        if (Schema::hasColumn('attachments', 'file_hash')) {
            $byHash = $query->where('file_hash', $fileHash)->first();
            if ($byHash) {
                return $byHash;
            }
        }

        return Attachment::query()
            ->where('url_hash', $fileHash)
            ->first();
    }

    private function attachSourceUrlIfPossible(Attachment $attachment, string $sourceUrl): void
    {
        if (!Schema::hasColumn('attachments', 'source_url')) {
            return;
        }

        if ($attachment->source_url) {
            return;
        }

        $attachment->forceFill(['source_url' => $sourceUrl])->save();
    }

    private function storeDownloadedImage(string $sourceUrl, ?string $contentType, string $fileHash, string $body): string
    {
        $disk = Storage::disk('public');
        if (!$disk->exists('attachments')) {
            $disk->makeDirectory('attachments');
        }

        $extension = $this->resolveExtension($sourceUrl, $contentType);
        $baseName = $this->resolveBaseName($sourceUrl);
        $fileName = "{$baseName}-" . substr($fileHash, 0, 16) . ".{$extension}";
        $path = "attachments/{$fileName}";

        $disk->put($path, $body);

        return $path;
    }

    private function resolveBaseName(string $url): string
    {
        $path = (string) parse_url($url, PHP_URL_PATH);
        $candidate = pathinfo($path, PATHINFO_FILENAME);
        $candidate = trim((string) rawurldecode($candidate));
        $candidate = preg_replace('/[^A-Za-z0-9\-_]+/', '-', $candidate ?: '');
        $candidate = trim((string) $candidate, '-_');

        if ($candidate === '') {
            return 'external-image';
        }

        return Str::limit($candidate, 80, '');
    }

    private function resolveExtension(string $url, ?string $contentType): string
    {
        $mimeMap = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/svg+xml' => 'svg',
            'image/bmp' => 'bmp',
            'image/avif' => 'avif',
            'image/x-icon' => 'ico',
        ];

        if ($contentType && isset($mimeMap[$contentType])) {
            return $mimeMap[$contentType];
        }

        $extension = strtolower((string) pathinfo((string) parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
        if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'], true)) {
            return $extension === 'jpeg' ? 'jpg' : $extension;
        }

        return 'jpg';
    }

    private function normalizeUrl(mixed $value): ?string
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
        $trimmed = trim($decoded);

        return $trimmed === '' ? null : $trimmed;
    }

    private function isExternalUrl(string $url): bool
    {
        if (!$this->isAbsoluteHttpUrl($url)) {
            return false;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ($host === '') {
            return false;
        }

        return !in_array($host, $this->managedHosts(), true);
    }

    private function isAllowedHost(string $host): bool
    {
        $patterns = $this->allowedHostPatterns();
        if (empty($patterns)) {
            return true;
        }

        foreach ($patterns as $pattern) {
            if ($pattern === '*') {
                return true;
            }

            if ($this->hostMatchesPattern($host, $pattern)) {
                return true;
            }
        }

        return false;
    }

    private function hostMatchesPattern(string $host, string $pattern): bool
    {
        $host = strtolower(trim($host));
        $pattern = strtolower(trim($pattern));

        if ($host === '' || $pattern === '') {
            return false;
        }

        if ($host === $pattern) {
            return true;
        }

        if (str_starts_with($pattern, '*.')) {
            $suffix = substr($pattern, 1); // keep leading dot
            $rootHost = ltrim($suffix, '.');

            return $host === $rootHost || str_ends_with($host, $suffix);
        }

        return false;
    }

    /**
     * @return array<int, string>
     */
    private function managedHosts(): array
    {
        $hosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

        foreach ([config('app.url'), config('app.asset_url')] as $url) {
            if (!is_string($url) || $url === '') {
                continue;
            }

            $host = strtolower((string) parse_url($url, PHP_URL_HOST));
            if ($host !== '') {
                $hosts[] = $host;
            }
        }

        return array_values(array_unique($hosts));
    }

    /**
     * @return array<int, string>
     */
    private function allowedHostPatterns(): array
    {
        $raw = config('media.allowed_external_hosts', []);
        if (!is_array($raw)) {
            return [];
        }

        return array_values(array_filter(array_map(
            static fn ($item) => strtolower(trim((string) $item)),
            $raw
        )));
    }

    private function isAbsoluteHttpUrl(string $value): bool
    {
        return (bool) preg_match('#^https?://#i', trim($value));
    }

    private function isImageContentType(?string $contentType): bool
    {
        return $contentType !== null && str_starts_with($contentType, 'image/');
    }

    private function normalizeContentType(?string $contentType): ?string
    {
        if ($contentType === null) {
            return null;
        }

        $first = trim(strtolower(explode(';', $contentType)[0] ?? ''));
        return $first !== '' ? $first : null;
    }

    private function maxFileSizeMb(): int
    {
        return max(1, (int) config('media.max_file_size_mb', 15));
    }

    private function maxFileSizeBytes(): int
    {
        return $this->maxFileSizeMb() * 1024 * 1024;
    }

    private function downloadTimeoutSeconds(): int
    {
        return max(1, (int) config('media.download_timeout_seconds', 15));
    }

    private function downloadUserAgent(): string
    {
        $configured = trim((string) config('media.download_user_agent', 'CupleBot/1.0'));
        return $configured !== '' ? $configured : 'CupleBot/1.0';
    }

    public function resolveAttachmentPath(Attachment $attachment): ?string
    {
        $candidate = $attachment->path ?: $attachment->original_url;

        if (!is_string($candidate) || trim($candidate) === '') {
            return null;
        }

        $storagePath = MediaUrl::extractStoragePath($candidate);
        if ($storagePath !== null) {
            return $storagePath;
        }

        if (!$this->isAbsoluteHttpUrl($candidate)) {
            return ltrim(str_replace('\\', '/', $candidate), '/');
        }

        return null;
    }
}
