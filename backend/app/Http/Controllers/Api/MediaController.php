<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function show(Request $request, string $path)
    {
        $normalizedPath = trim(str_replace('\\', '/', $path), '/');

        if ($normalizedPath === '' || str_contains($normalizedPath, '..')) {
            abort(404);
        }

        $disk = Storage::disk('public');

        if (!$disk->exists($normalizedPath)) {
            abort(404);
        }

        $width = max((int) $request->query('w', 0), 0);
        $height = max((int) $request->query('h', 0), 0);
        $fit = strtolower((string) $request->query('fit', 'contain'));

        if (($width > 0 || $height > 0) && $this->supportsResizedPreview($normalizedPath)) {
            $thumbnailPath = $this->generateThumbnail($disk->path($normalizedPath), $normalizedPath, $width, $height, $fit);

            if ($thumbnailPath && $disk->exists($thumbnailPath)) {
                return $disk->response(
                    $thumbnailPath,
                    basename($thumbnailPath),
                    ['Cache-Control' => 'public, max-age=31536000, immutable'],
                    'inline'
                );
            }
        }

        return $disk->response(
            $normalizedPath,
            basename($normalizedPath),
            ['Cache-Control' => 'public, max-age=31536000, immutable'],
            'inline'
        );
    }

    protected function supportsResizedPreview(string $path): bool
    {
        return (bool) preg_match('/\.(jpe?g|png|webp)$/i', $path);
    }

    protected function generateThumbnail(string $sourcePath, string $relativePath, int $width, int $height, string $fit): ?string
    {
        if (!extension_loaded('gd') || !is_file($sourcePath)) {
            return null;
        }

        $imageInfo = @getimagesize($sourcePath);
        if (!$imageInfo) {
            return null;
        }

        [$sourceWidth, $sourceHeight] = $imageInfo;
        $mime = $imageInfo['mime'] ?? null;

        $targetWidth = $width > 0 ? $width : (int) round(($height / max($sourceHeight, 1)) * $sourceWidth);
        $targetHeight = $height > 0 ? $height : (int) round(($width / max($sourceWidth, 1)) * $sourceHeight);

        $targetWidth = max($targetWidth, 1);
        $targetHeight = max($targetHeight, 1);

        $cacheKey = md5(implode('|', [
            $relativePath,
            (string) @filemtime($sourcePath),
            $targetWidth,
            $targetHeight,
            $fit,
        ]));

        $extension = strtolower(pathinfo($relativePath, PATHINFO_EXTENSION)) ?: 'jpg';
        $cachePath = "cache/attachments/{$cacheKey}.{$extension}";
        $disk = Storage::disk('public');

        if ($disk->exists($cachePath)) {
            return $cachePath;
        }

        $sourceImage = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($sourcePath),
            'image/png' => @imagecreatefrompng($sourcePath),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($sourcePath) : null,
            default => null,
        };

        if (!$sourceImage) {
            return null;
        }

        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        if (!$canvas) {
            imagedestroy($sourceImage);
            return null;
        }

        if (in_array($mime, ['image/png', 'image/webp'], true)) {
            imagealphablending($canvas, false);
            imagesavealpha($canvas, true);
            $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
            imagefilledrectangle($canvas, 0, 0, $targetWidth, $targetHeight, $transparent);
        }

        if ($fit === 'cover' && $width > 0 && $height > 0) {
            $scale = max($targetWidth / $sourceWidth, $targetHeight / $sourceHeight);
            $resizeWidth = (int) ceil($sourceWidth * $scale);
            $resizeHeight = (int) ceil($sourceHeight * $scale);
            $destinationX = (int) floor(($targetWidth - $resizeWidth) / 2);
            $destinationY = (int) floor(($targetHeight - $resizeHeight) / 2);
        } else {
            $scale = min($targetWidth / $sourceWidth, $targetHeight / $sourceHeight);
            $resizeWidth = max((int) round($sourceWidth * $scale), 1);
            $resizeHeight = max((int) round($sourceHeight * $scale), 1);
            $destinationX = (int) floor(($targetWidth - $resizeWidth) / 2);
            $destinationY = (int) floor(($targetHeight - $resizeHeight) / 2);
        }

        imagecopyresampled(
            $canvas,
            $sourceImage,
            $destinationX,
            $destinationY,
            0,
            0,
            $resizeWidth,
            $resizeHeight,
            $sourceWidth,
            $sourceHeight
        );

        $cacheAbsolutePath = $disk->path($cachePath);
        if (!is_dir(dirname($cacheAbsolutePath))) {
            mkdir(dirname($cacheAbsolutePath), 0755, true);
        }

        $saved = match ($mime) {
            'image/jpeg' => imagejpeg($canvas, $cacheAbsolutePath, 82),
            'image/png' => imagepng($canvas, $cacheAbsolutePath, 7),
            'image/webp' => function_exists('imagewebp') ? imagewebp($canvas, $cacheAbsolutePath, 82) : false,
            default => false,
        };

        imagedestroy($canvas);
        imagedestroy($sourceImage);

        return $saved ? $cachePath : null;
    }
}
