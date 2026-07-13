<?php

namespace App\Support;

use Illuminate\Support\Str;

class MediaUrl
{
    /**
     * Normalize media paths/URLs into a browser-safe public URL.
     *
     * Handles:
     * - Relative storage paths (attachments/foo.webp)
     * - /storage/... paths
     * - Legacy absolute localhost URLs stored in DB
     * - External absolute URLs (left as-is)
     */
    public static function fromPath(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $path = trim(self::decodeHtmlEntities($path));
        if ($path === '') {
            return null;
        }

        // Check for URLs: filter_var fails on URLs with spaces/special chars (common in migrated data)
        if (filter_var($path, FILTER_VALIDATE_URL) || preg_match('#^https?://#i', $path)) {
            return self::normalizeAbsoluteUrl($path);
        }

        if (!self::looksLikeFilePath($path)) {
            return null;
        }

        return self::toStorageUrl($path);
    }

    private static function normalizeAbsoluteUrl(string $url): string
    {
        $url = self::decodeHtmlEntities($url);
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $storagePath = self::extractStoragePath($url);

        if ($storagePath !== null && self::shouldRewriteStorageHost($host)) {
            return self::toStorageUrl($storagePath);
        }

        return $url;
    }

    public static function extractStoragePath(string $value): ?string
    {
        if ($value === '') {
            return null;
        }

        $path = $value;
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            $path = (string) parse_url($value, PHP_URL_PATH);
        }

        $path = str_replace('\\', '/', $path);
        $path = ltrim($path, '/');

        if ($path === '') {
            return null;
        }

        if (Str::startsWith($path, 'storage/')) {
            return ltrim(Str::after($path, 'storage/'), '/');
        }

        if (Str::startsWith($path, 'api/media/')) {
            $mediaPath = ltrim(Str::after($path, 'api/media/'), '/');
            if ($mediaPath === '') {
                return null;
            }

            $segments = array_filter(explode('/', $mediaPath), static fn ($segment) => $segment !== '');
            return implode('/', array_map('rawurldecode', $segments));
        }

        return null;
    }

    private static function toStorageUrl(string $path): string
    {
        $path = str_replace('\\', '/', trim($path));
        $path = ltrim($path, '/');

        if (Str::startsWith($path, 'storage/')) {
            $path = ltrim(Str::after($path, 'storage/'), '/');
        }

        return url('api/media/' . self::encodePath($path));
    }

    private static function encodePath(string $path): string
    {
        $segments = array_filter(explode('/', $path), static fn ($segment) => $segment !== '');
        return implode('/', array_map('rawurlencode', $segments));
    }

    private static function shouldRewriteStorageHost(string $host): bool
    {
        if ($host === '' || self::isLocalHost($host)) {
            return true;
        }

        return in_array($host, self::managedHosts(), true);
    }

    private static function managedHosts(): array
    {
        $hosts = [];

        foreach ([config('app.url'), config('app.asset_url')] as $baseUrl) {
            if (!is_string($baseUrl) || $baseUrl === '') {
                continue;
            }

            $parsedHost = strtolower((string) parse_url($baseUrl, PHP_URL_HOST));
            if ($parsedHost !== '') {
                $hosts[] = $parsedHost;
            }
        }

        return array_values(array_unique($hosts));
    }

    private static function isLocalHost(string $host): bool
    {
        return in_array($host, ['localhost', '127.0.0.1', '0.0.0.0', '::1'], true);
    }

    private static function looksLikeFilePath(string $path): bool
    {
        if (preg_match('/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif|mp4|webm|mov|mp3|wav|ogg|m4a)$/i', $path)) {
            return true;
        }

        return Str::contains($path, ['/','\\']) || Str::startsWith($path, 'storage');
    }

    private static function decodeHtmlEntities(string $value): string
    {
        return html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
