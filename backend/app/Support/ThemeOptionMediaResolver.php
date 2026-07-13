<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ThemeOptionMediaResolver
{
    /**
     * Cache attachment-path lookups for the request lifetime.
     *
     * @var array<string, string>|null
     */
    protected static ?array $attachmentPathMap = null;

    /**
     * Hydrate theme-option media objects from attachment IDs.
     */
    public static function hydrate(array $options): array
    {
        $options = self::hydrateNode($options, 'logo.header_logo_id', 'logo.header_logo');
        $options = self::hydrateNode($options, 'logo.footer_logo_id', 'logo.footer_logo');
        $options = self::hydrateNode($options, 'logo.favicon_icon_id', 'logo.favicon_icon');
        $options = self::hydrateNode($options, 'seo.og_image_id', 'seo.og_image');

        return $options;
    }

    protected static function hydrateNode(array $options, string $idPath, string $objectPath): array
    {
        $id = data_get($options, $idPath);
        $fallbackUrl = data_get($options, $objectPath . '.original_url')
            ?? data_get($options, $objectPath . '.url')
            ?? data_get($options, $objectPath);

        $resolved = self::resolveAttachment(
            is_scalar($id) ? (string) $id : null,
            is_string($fallbackUrl) ? $fallbackUrl : null
        );

        data_set($options, $objectPath, $resolved);

        return $options;
    }

    /**
     * Resolve an attachment ID into the object shape expected by admin/frontend media fields.
     *
     * @return array<string, mixed>|null
     */
    public static function resolveAttachment(?string $attachmentId, ?string $fallbackUrl = null): ?array
    {
        $id = trim((string) $attachmentId);

        // ✅ 1) DB lookup by real attachment id
// ✅ 1) DB lookup by real attachment id (no Eloquent model required)
        if ($id !== '') {
            // حاول نعرف اسم الجدول من الشائع "attachments"
            // إذا كان اسم مختلف سنعدله بعد الاختبار
            $row = DB::table('attachments')
                ->select(['id', 'name', 'path', 'mime_type'])
                ->where('id', $id)
                ->first();

            if ($row && !empty($row->path)) {
                $path = $row->path;
                $url = MediaUrl::fromPath($path) ?: asset('storage/' . ltrim($path, '/'));
                $name = $row->name ?: basename($path);

                return [
                    'id' => (string) $row->id,
                    'name' => $name,
                    'file_name' => $name,
                    'path' => $path,
                    'url' => $url,
                    'original_url' => $url,
                    'mime_type' => $row->mime_type ?? null,
                ];
            }
        }

        // ✅ 2) Fallback: try resolve by path/md5/basename scans
        $path = self::findPathByAttachmentId($id);

        if ($path) {
            $url = MediaUrl::fromPath($path);
            if (!$url) {
                $url = asset('storage/' . ltrim($path, '/'));
            }

            $name = basename($path);

            return [
                'id' => $id !== '' ? $id : md5($path),
                'name' => $name,
                'file_name' => $name,
                'path' => $path,
                'url' => $url,
                'original_url' => $url,
                'mime_type' => Storage::disk('public')->mimeType($path) ?: null,
            ];
        }

        // ✅ 3) Last fallback: try keep a usable URL if present
        $url = HomeBannerMediaResolver::resolveUrl($fallbackUrl, $id !== '' ? $id : null);
        if ($url) {
            return [
                'id' => $id !== '' ? $id : null,
                'original_url' => $url,
                'url' => $url,
            ];
        }

        return null;
    }

    protected static function findPathByAttachmentId(?string $attachmentId): ?string
    {
        $id = trim((string) $attachmentId);
        if ($id === '') {
            return null;
        }

        if (Str::contains($id, ['/', '\\']) || preg_match('/\.[a-z0-9]{2,5}$/i', $id)) {
            $path = MediaUrl::extractStoragePath($id);
            if ($path && Storage::disk('public')->exists($path)) {
                return $path;
            }
        }

        if (self::$attachmentPathMap === null) {
            self::$attachmentPathMap = [];
            foreach (Storage::disk('public')->files('attachments') as $file) {
                self::$attachmentPathMap[md5($file)] = $file;
                self::$attachmentPathMap[$file] = $file;
                self::$attachmentPathMap[basename($file)] = $file;
            }
        }

        return self::$attachmentPathMap[$id] ?? null;
    }
}
