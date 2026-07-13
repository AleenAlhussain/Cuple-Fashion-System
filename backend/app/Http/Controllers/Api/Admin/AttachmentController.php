<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Collection;

class AttachmentController extends BaseController
{
    /**
     * Build an absolute public URL for a stored file using the current request host.
     * This avoids leaking localhost URLs when APP_URL is misconfigured.
     */
    protected function publicFileUrl(Request $request, string $path): string
    {
        $url = MediaUrl::fromPath($path) ?: Storage::disk('public')->url($path);

        // Relative URL from disk config (e.g. /storage/attachments/xxx.webp)
        if (str_starts_with($url, '/')) {
            return rtrim($request->getSchemeAndHttpHost(), '/') . $url;
        }

        // Absolute URL - rewrite localhost hosts to the current request host.
        if (filter_var($url, FILTER_VALIDATE_URL)) {
            $host = strtolower((string) parse_url($url, PHP_URL_HOST));
            if (in_array($host, ['localhost', '127.0.0.1', '0.0.0.0', '::1'], true)) {
                $pathOnly = (string) parse_url($url, PHP_URL_PATH);
                return rtrim($request->getSchemeAndHttpHost(), '/') . $pathOnly;
            }
            return $url;
        }

        return rtrim($request->getSchemeAndHttpHost(), '/') . '/' . ltrim($url, '/');
    }

    protected function thumbnailFileUrl(Request $request, string $path): string
    {
        $url = $this->publicFileUrl($request, $path);
        $separator = str_contains($url, '?') ? '&' : '?';

        return "{$url}{$separator}w=320&h=320&fit=cover";
    }

    protected function normalizeTypeFilters(Request $request): array
    {
        $rawFilter = $request->get('type', $request->get('mime_type', ''));
        if (!is_string($rawFilter) || trim($rawFilter) === '') {
            return [];
        }

        return collect(explode(',', $rawFilter))
            ->flatMap(function ($item) {
                $normalized = strtolower(trim($item));
                if ($normalized === '') {
                    return [];
                }

                return $this->mimeFilterToExtensions($normalized);
            })
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    protected function mimeFilterToExtensions(string $filter): array
    {
        if (!str_contains($filter, '/')) {
            return [$filter];
        }

        return match ($filter) {
            'image/jpeg', 'image/jpg', 'image/pjpeg' => ['jpg', 'jpeg'],
            'image/png', 'image/apng' => ['png'],
            'image/gif' => ['gif'],
            'image/webp' => ['webp'],
            'image/avif' => ['avif'],
            'image/svg', 'image/svg+xml' => ['svg'],
            'video/mp4' => ['mp4'],
            'video/webm' => ['webm'],
            'video/ogg' => ['ogv', 'ogg'],
            'audio/mpeg' => ['mp3'],
            'audio/wav', 'audio/x-wav' => ['wav'],
            'audio/ogg' => ['ogg'],
            'application/pdf' => ['pdf'],
            'application/zip', 'application/x-zip-compressed' => ['zip'],
            'application/x-tar' => ['tar'],
            'application/gzip', 'application/x-gzip' => ['gz'],
            'application/msword' => ['doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ['docx'],
            'application/vnd.ms-excel' => ['xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => ['xlsx'],
            'application/vnd.ms-powerpoint' => ['ppt'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' => ['pptx'],
            default => [],
        };
    }

    protected function fileTimestamp(string $fullPath, string $relativePath): int
    {
        $timestamp = @filemtime($fullPath);

        if ($timestamp !== false) {
            return (int) $timestamp;
        }

        return (int) Storage::disk('public')->lastModified($relativePath);
    }

    protected function fileSize(string $fullPath, string $relativePath): int
    {
        $size = @filesize($fullPath);

        if ($size !== false) {
            return (int) $size;
        }

        return (int) Storage::disk('public')->size($relativePath);
    }

    protected function fileMimeType(string $fullPath, string $relativePath): string
    {
        $mimeType = @mime_content_type($fullPath);

        if (is_string($mimeType) && $mimeType !== '') {
            return $mimeType;
        }

        return (string) (Storage::disk('public')->mimeType($relativePath) ?: 'application/octet-stream');
    }

    protected function buildAttachmentIndex(Request $request): Collection
    {
        $search = trim((string) $request->get('search', ''));
        $typeFilters = $this->normalizeTypeFilters($request);
        $fromDate = trim((string) $request->get('from_date', ''));
        $toDate = trim((string) $request->get('to_date', ''));

        $fromTimestamp = $fromDate !== '' ? strtotime($fromDate . ' 00:00:00') : null;
        $toTimestamp = $toDate !== '' ? strtotime($toDate . ' 23:59:59') : null;

        return collect(Storage::disk('public')->files('attachments'))
            ->map(function ($file) {
                $fullPath = Storage::disk('public')->path($file);
                $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));

                return [
                    'path' => $file,
                    'name' => basename($file),
                    'extension' => $extension,
                    'full_path' => $fullPath,
                    'timestamp' => $this->fileTimestamp($fullPath, $file),
                ];
            })
            ->filter(function ($item) use ($search, $typeFilters, $fromTimestamp, $toTimestamp) {
                if ($search !== '' && stripos($item['name'], $search) === false) {
                    return false;
                }

                if ($typeFilters !== [] && !in_array($item['extension'], $typeFilters, true)) {
                    return false;
                }

                if ($fromTimestamp && $item['timestamp'] < $fromTimestamp) {
                    return false;
                }

                if ($toTimestamp && $item['timestamp'] > $toTimestamp) {
                    return false;
                }

                return true;
            })
            ->values();
    }

    protected function sortAttachmentIndex(Collection $items, string $sort): Collection
    {
        return match ($sort) {
            'oldest' => $items->sortBy('timestamp')->values(),
            'smallest', 'largest' => $items
                ->map(function ($item) {
                    $item['size'] = $this->fileSize($item['full_path'], $item['path']);
                    return $item;
                })
                ->sortBy('size', SORT_REGULAR, $sort === 'largest')
                ->values(),
            default => $items->sortByDesc('timestamp')->values(),
        };
    }

    public function index(Request $request)
    {
        try {
            // Ensure the attachments directory exists
            if (!Storage::disk('public')->exists('attachments')) {
                Storage::disk('public')->makeDirectory('attachments');
            }

            $attachments = $this->buildAttachmentIndex($request);
            $attachments = $this->sortAttachmentIndex($attachments, strtolower((string) $request->get('sort', '')));

            $page = max((int) $request->get('page', 1), 1);
            $perPage = max((int) $request->get('paginate', 20), 1);
            $total = $attachments->count();

            $items = $attachments->slice(($page - 1) * $perPage, $perPage)->values()->map(function ($file) use ($request) {
                try {
                    $publicUrl = $this->publicFileUrl($request, $file['path']);
                    return [
                        'id' => md5($file['path']),
                        'name' => $file['name'],
                        'path' => $file['path'],
                        'url' => $publicUrl,
                        'original_url' => $publicUrl,
                        'thumbnail_url' => $this->thumbnailFileUrl($request, $file['path']),
                        'size' => $file['size'] ?? $this->fileSize($file['full_path'], $file['path']),
                        'mime_type' => $this->fileMimeType($file['full_path'], $file['path']),
                        'created_at' => date('Y-m-d H:i:s', $file['timestamp']),
                    ];
                } catch (\Exception $e) {
                    \Log::warning("Failed to process attachment file: {$file['path']} - " . $e->getMessage());
                    return null;
                }
            })->filter();

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $total,
                'current_page' => (int) $page,
                'per_page' => $perPage,
                'last_page' => ceil($total / $perPage) ?: 1,
            ]);
        } catch (\Exception $e) {
            \Log::error('Attachment index error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load attachments: ' . $e->getMessage(),
                'data' => [],
                'total' => 0,
                'current_page' => 1,
                'last_page' => 1,
            ], 500);
        }
    }

    protected function formatFileSize(int $bytes): string
    {
        if ($bytes <= 0) {
            return '-';
        }

        $units = ['B', 'KB', 'MB', 'GB'];
        $value = $bytes;
        $unitIndex = 0;

        while ($value >= 1024 && $unitIndex < count($units) - 1) {
            $value /= 1024;
            $unitIndex++;
        }

        return round($value, $unitIndex === 0 ? 0 : 1) . ' ' . $units[$unitIndex];
    }

    /**
     * Export the media library to an .xlsx file with embedded image thumbnails
     * (not just links), respecting the same search/type/date filters as the index.
     */
    public function exportXlsx(Request $request)
    {
        $attachments = $this->buildAttachmentIndex($request);
        $attachments = $this->sortAttachmentIndex($attachments, strtolower((string) $request->get('sort', '')));

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Media Library');

        $headers = ['A' => '#', 'B' => 'Image', 'C' => 'Name', 'D' => 'Link', 'E' => 'Type', 'F' => 'Size', 'G' => 'Uploaded At'];
        foreach ($headers as $col => $header) {
            $sheet->setCellValue("{$col}1", $header);
        }
        $sheet->getStyle('A1:G1')->getFont()->setBold(true);
        $sheet->getColumnDimension('A')->setWidth(6);
        $sheet->getColumnDimension('B')->setWidth(18);
        $sheet->getColumnDimension('C')->setWidth(35);
        $sheet->getColumnDimension('D')->setWidth(50);
        $sheet->getColumnDimension('E')->setWidth(20);
        $sheet->getColumnDimension('F')->setWidth(12);
        $sheet->getColumnDimension('G')->setWidth(20);

        $rowIndex = 2;
        foreach ($attachments as $file) {
            $mimeType = $this->fileMimeType($file['full_path'], $file['path']);
            $isImage = str_starts_with($mimeType, 'image/');
            $publicUrl = $this->publicFileUrl($request, $file['path']);
            $size = $this->fileSize($file['full_path'], $file['path']);

            $sheet->setCellValue("A{$rowIndex}", $rowIndex - 1);
            $sheet->setCellValue("C{$rowIndex}", $file['name']);
            $sheet->setCellValue("D{$rowIndex}", $publicUrl);
            $sheet->getCell("D{$rowIndex}")->getHyperlink()->setUrl($publicUrl);
            $sheet->setCellValue("E{$rowIndex}", $mimeType);
            $sheet->setCellValue("F{$rowIndex}", $this->formatFileSize($size));
            $sheet->setCellValue("G{$rowIndex}", date('Y-m-d H:i:s', $file['timestamp']));
            $sheet->getRowDimension($rowIndex)->setRowHeight(60);

            if ($isImage && is_readable($file['full_path'])) {
                try {
                    $drawing = new \PhpOffice\PhpSpreadsheet\Worksheet\Drawing();
                    $drawing->setName($file['name']);
                    $drawing->setPath($file['full_path']);
                    $drawing->setHeight(70);
                    $drawing->setCoordinates("B{$rowIndex}");
                    $drawing->setOffsetX(6);
                    $drawing->setOffsetY(5);
                    $drawing->setWorksheet($sheet);
                } catch (\Exception $e) {
                    \Log::warning("Failed to embed thumbnail for {$file['path']}: " . $e->getMessage());
                }
            }

            $rowIndex++;
        }

        $sheet->freezePane('A2');

        $filename = 'media_library_' . date('Y-m-d') . '.xlsx';
        $tempPath = storage_path('app/temp/' . $filename);

        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save($tempPath);

        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|file|max:10240',
            ]);

            // Ensure the attachments directory exists
            if (!Storage::disk('public')->exists('attachments')) {
                Storage::disk('public')->makeDirectory('attachments');
            }

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = strtolower($file->getClientOriginalExtension());
            $baseName = Str::slug(pathinfo($originalName, PATHINFO_FILENAME)) ?: 'file';
            $filename = $baseName . '-' . Str::random(8) . '.' . $extension;
            $mimeType = $file->getMimeType();

            $path = $file->storeAs('attachments', $filename, 'public');

            // Optimize images if the file is an image
            if (str_starts_with($mimeType, 'image/') && in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
                $this->optimizeImage(Storage::disk('public')->path($path));
            }

            return $this->success([
                'id' => md5($path),
                'name' => $originalName,
                'path' => $path,
                'url' => $this->publicFileUrl($request, $path),
                'original_url' => $this->publicFileUrl($request, $path),
                'thumbnail_url' => $this->thumbnailFileUrl($request, $path),
                'mime_type' => $mimeType,
                'size' => Storage::disk('public')->size($path),
            ], 'File uploaded successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Attachment upload error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload file: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Optimize uploaded image by reducing quality and size if needed
     */
    protected function optimizeImage($path)
    {
        try {
            // Only optimize if file exists and is larger than 500KB
            if (!file_exists($path) || filesize($path) < 512000) {
                return;
            }

            $imageInfo = getimagesize($path);
            if (!$imageInfo) return;

            $mime = $imageInfo['mime'];
            $maxWidth = 1920;
            $maxHeight = 1920;
            $quality = 85;

            switch ($mime) {
                case 'image/jpeg':
                    $image = imagecreatefromjpeg($path);
                    break;
                case 'image/png':
                    $image = imagecreatefrompng($path);
                    break;
                case 'image/webp':
                    $image = imagecreatefromwebp($path);
                    break;
                default:
                    return;
            }

            if (!$image) return;

            $width = imagesx($image);
            $height = imagesy($image);

            // Only resize if larger than max dimensions
            if ($width > $maxWidth || $height > $maxHeight) {
                $ratio = min($maxWidth / $width, $maxHeight / $height);
                $newWidth = (int)($width * $ratio);
                $newHeight = (int)($height * $ratio);

                $resized = imagecreatetruecolor($newWidth, $newHeight);

                // Preserve transparency for PNG
                if ($mime === 'image/png') {
                    imagealphablending($resized, false);
                    imagesavealpha($resized, true);
                }

                imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                imagedestroy($image);
                $image = $resized;
            }

            // Save optimized image
            switch ($mime) {
                case 'image/jpeg':
                    imagejpeg($image, $path, $quality);
                    break;
                case 'image/png':
                    imagepng($image, $path, 8);
                    break;
                case 'image/webp':
                    imagewebp($image, $path, $quality);
                    break;
            }

            imagedestroy($image);
        } catch (\Exception $e) {
            \Log::warning('Image optimization failed: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        $files = Storage::disk('public')->files('attachments');

        foreach ($files as $file) {
            if (md5($file) === $id) {
                Storage::disk('public')->delete($file);
                return $this->success(null, 'File deleted successfully.');
            }
        }

        return $this->error('File not found.', 404);
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->input('ids', []);
        $files = Storage::disk('public')->files('attachments');

        foreach ($files as $file) {
            if (in_array(md5($file), $ids)) {
                Storage::disk('public')->delete($file);
            }
        }

        return $this->success(null, 'Files deleted successfully.');
    }
}
