<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class HomeBannerMediaResolver
{
    /**
     * Cache attachment path lookups for the current request.
     *
     * @var array<string, string>|null
     */
    protected static ?array $attachmentPathMap = null;

    /**
     * Normalize home banner image fields and ensure mobile image is always usable.
     *
     * @param array<int, mixed> $banners
     * @param bool $fallbackMobileToDesktop If true, missing/broken mobile image falls back to desktop.
     * @return array<int, mixed>
     */
    public static function normalizeBanners(array $banners, bool $fallbackMobileToDesktop = true): array
    {
        return collect($banners)
            ->values()
            ->sortBy(function ($banner, $index) {
                if (is_array($banner) && is_numeric($banner['sort_order'] ?? null)) {
                    return (int) $banner['sort_order'];
                }

                return 100000 + $index;
            })
            ->map(function ($banner) use ($fallbackMobileToDesktop) {
                if (!is_array($banner)) {
                    return $banner;
                }

                $desktopUrl = self::resolveUrl(
                    self::extractImageValue($banner['image_url'] ?? $banner['image'] ?? null),
                    (string) ($banner['image_id'] ?? '')
                );

                $mobileUrl = self::resolveUrl(
                    self::extractImageValue(
                        $banner['image_mobile_url'] ??
                        $banner['mobile_image'] ??
                        $banner['image_mobile'] ??
                        null
                    ),
                    (string) ($banner['image_mobile_id'] ?? '')
                );

                if ($fallbackMobileToDesktop && !$mobileUrl) {
                    $mobileUrl = $desktopUrl;
                }

                $banner['image_url'] = $desktopUrl ?? '';
                $banner['image'] = $desktopUrl ? [
                        'id' => $banner['image_id'] ?? null,
                        'original_url' => $desktopUrl,
                    ] : null;

                $banner['image_mobile_url'] = $mobileUrl ?? '';
                $banner['mobile_image'] = $mobileUrl ? [
                        'id' => $banner['image_mobile_id'] ?? null,
                        'original_url' => $mobileUrl,
                    ] : null;

                return $banner;
            })
            ->values()
            ->all();
    }

    /**
     * Resolve an image value to a public URL.
     *
     * For storage assets, this also validates file existence.
     */
    public static function resolveUrl(?string $value, ?string $attachmentId = null): ?string
    {
        $pathFromId = self::findPathByAttachmentId($attachmentId);
        if ($pathFromId) {
            $fromId = MediaUrl::fromPath($pathFromId);
            if ($fromId) {
                return $fromId;
            }
        }

        $trimmed = is_string($value) ? trim($value) : '';

        if ($trimmed !== '') {
            if (self::isLocalAssetPath($trimmed)) {
                return Str::startsWith($trimmed, '/') ? $trimmed : '/' . ltrim($trimmed, '/');
            }

            $normalized = MediaUrl::fromPath($trimmed);
            if ($normalized && self::isStorageUrlAvailable($normalized)) {
                return $normalized;
            }

            if ($normalized && !self::isStorageUrl($normalized)) {
                return $normalized;
            }
        }

        return null;
    }

    /**
     * @param mixed $value
     */
    protected static function extractImageValue($value): ?string
    {
        if (is_string($value)) {
            return $value;
        }

        if (is_array($value)) {
            $candidate = $value['original_url'] ?? $value['url'] ?? $value['path'] ?? $value['name'] ?? null;
            return is_string($candidate) ? $candidate : null;
        }

        return null;
    }

    protected static function isLocalAssetPath(string $value): bool
    {
        return Str::startsWith($value, ['/assets/', 'assets/']);
    }

    protected static function isStorageUrl(string $url): bool
    {
        return MediaUrl::extractStoragePath($url) !== null;
    }

    protected static function isStorageUrlAvailable(string $url): bool
    {
        $storagePath = MediaUrl::extractStoragePath($url);
        if ($storagePath === null) {
            return true;
        }

        return Storage::disk('public')->exists($storagePath);
    }

    protected static function findPathByAttachmentId(?string $attachmentId): ?string
    {
        $id = trim((string) $attachmentId);
        if ($id === '') {
            return null;
        }

        if (Str::contains($id, ['/','\\']) || preg_match('/\.[a-z0-9]{2,5}$/i', $id)) {
            $path = MediaUrl::extractStoragePath($id);
            if ($path && Storage::disk('public')->exists($path)) {
                return $path;
            }
        }

        if (self::$attachmentPathMap === null) {
            self::$attachmentPathMap = [];
            foreach (Storage::disk('public')->files('attachments') as $file) {
                $hash = md5($file);
                self::$attachmentPathMap[$hash] = $file;
                self::$attachmentPathMap[$file] = $file;
                self::$attachmentPathMap[basename($file)] = $file;
            }
        }

        return self::$attachmentPathMap[$id] ?? null;
    }
}
