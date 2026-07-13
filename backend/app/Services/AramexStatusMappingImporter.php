<?php

namespace App\Services;

use App\Models\AramexStatusMapping;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception as SpreadsheetException;

class AramexStatusMappingImporter
{
    protected array $columnCandidates = [
        'code' => ['code', 'statuscode', 'status_code', 'aramexcode', 'code'],
        'name' => ['statusname', 'status_name', 'name', 'description'],
        'stage' => ['stage', 'internalstage', 'internal_stage', 'milestone'],
        'severity' => ['severity', 'alertlevel', 'level', 'statuslevel'],
        'title_en' => ['customer_title_en', 'title_en', 'titleenglish', 'customer_title_(en)'],
        'message_en' => ['customer_message_en', 'message_en', 'messageenglish', 'customer_message_(en)'],
        'title_ar' => ['customer_title_ar', 'title_ar', 'titlearabic', 'customer_title_(ar)'],
        'message_ar' => ['customer_message_ar', 'message_ar', 'messagearabic', 'customer_message_(ar)'],
    ];

    protected array $defaults;

    public function __construct()
    {
        $this->defaults = config('aramex.status_mapping_defaults', []);
    }

    /**
     * Import or refresh the status mappings.
     *
     * @param  bool  $overwriteManual  whether to override entries that were manually edited
     * @param  string|null  $path
     * @return array
     */
    public function import(bool $overwriteManual = false, ?string $path = null): array
    {
        $path = $path ?? config('aramex.status_mapping_path');
        if (!$path || !File::exists($path)) {
            return [
                'success' => false,
                'created' => 0,
                'updated' => 0,
                'skipped' => 0,
                'manual_skipped' => 0,
                'message' => "File not found at {$path}",
            ];
        }

        try {
            $reader = IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($path);
        } catch (SpreadsheetException $exception) {
            return [
                'success' => false,
                'created' => 0,
                'updated' => 0,
                'skipped' => 0,
                'manual_skipped' => 0,
                'message' => 'Unable to parse Excel file: ' . $exception->getMessage(),
            ];
        }

        $sheet = $spreadsheet->getActiveSheet();
        $rows = [];
        foreach ($sheet->toArray(null, true, true, true) as $row) {
            $rows[] = array_values($row);
        }

        if (empty($rows)) {
            return [
                'success' => false,
                'created' => 0,
                'updated' => 0,
                'skipped' => 0,
                'manual_skipped' => 0,
                'message' => 'Excel file is empty',
            ];
        }

        $header = array_shift($rows);
        $headerMap = $this->mapHeaders($header);
        if (!isset($headerMap['code']) || !isset($headerMap['name'])) {
            return [
                'success' => false,
                'created' => 0,
                'updated' => 0,
                'skipped' => 0,
                'manual_skipped' => 0,
                'message' => 'Excel sheet must contain at least one column for code and one for name',
            ];
        }

        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'manual_skipped' => 0,
            'success' => true,
        ];

        foreach ($rows as $row) {
            if ($this->isRowEmpty($row)) {
                continue;
            }

            $rowData = $this->mapRow($row, $headerMap);
            $code = $rowData['code'] ?? null;
            $name = $rowData['name'] ?? null;
            if (empty($code) || empty($name)) {
                $stats['skipped']++;
                continue;
            }

            $mapping = AramexStatusMapping::where('aramex_code', $code)->first();
            $stage = $rowData['stage'] ?? $this->defaults['stage'] ?? 'PROCESSING';
            $severity = $rowData['severity'] ?? $this->defaults['severity'] ?? 'info';
            $titleEn = $rowData['title_en'] ?? $this->defaults['customer_title_en'] ?? '';
            $messageEn = $rowData['message_en'] ?? $this->defaults['customer_message_en'] ?? '';
            $titleAr = $rowData['title_ar'] ?? $this->defaults['customer_title_ar'] ?? '';
            $messageAr = $rowData['message_ar'] ?? $this->defaults['customer_message_ar'] ?? '';
            $isManual = $mapping?->is_manual_override ?? false;
            $shouldUpdateManual = $overwriteManual || !$isManual;

            $attributes = [
                'aramex_name' => $name,
            ];

            if ($shouldUpdateManual) {
                $attributes['stage'] = Str::upper($stage);
                $attributes['severity'] = $this->normalizeSeverity($severity);
                $attributes['customer_title_en'] = $titleEn ?: $this->defaults['customer_title_en'];
                $attributes['customer_message_en'] = $messageEn ?: $this->defaults['customer_message_en'];
                $attributes['customer_title_ar'] = $titleAr ?: $this->defaults['customer_title_ar'];
                $attributes['customer_message_ar'] = $messageAr ?: $this->defaults['customer_message_ar'];
                $attributes['is_manual_override'] = false;
            }

            if ($mapping) {
                if ($shouldUpdateManual) {
                $mapping->update($attributes + ['is_active' => true]);
                    $stats['updated']++;
                } else {
                    $mapping->update([
                        'aramex_name' => $name,
                        'is_active' => true,
                    ]);
                    $stats['manual_skipped']++;
                }
            } else {
                AramexStatusMapping::create(array_merge($attributes, [
                    'aramex_code' => $code,
                    'stage' => Str::upper($stage),
                    'severity' => $this->normalizeSeverity($severity),
                    'customer_title_en' => $titleEn ?: $this->defaults['customer_title_en'],
                    'customer_message_en' => $messageEn ?: $this->defaults['customer_message_en'],
                    'customer_title_ar' => $titleAr ?: $this->defaults['customer_title_ar'],
                    'customer_message_ar' => $messageAr ?: $this->defaults['customer_message_ar'],
                    'is_active' => true,
                    'is_manual_override' => false,
                ]));
                $stats['created']++;
            }
        }

        return $stats;
    }

    protected function mapHeaders(array $header): array
    {
        $map = [];
        foreach ($header as $index => $value) {
            $normalized = $this->normalizeHeader($value);
            foreach ($this->columnCandidates as $key => $variants) {
                if (isset($map[$key])) {
                    continue;
                }
                foreach ($variants as $variant) {
                    if ($normalized !== '' && str_contains($normalized, $variant)) {
                        $map[$key] = $index;
                        break 2;
                    }
                }
            }
        }
        return $map;
    }

    protected function mapRow(array $row, array $headerMap): array
    {
        $clean = [];
        foreach ($headerMap as $key => $index) {
            $clean[$key] = $this->getCellValue($row, $index);
        }
        return $clean;
    }

    protected function getCellValue(array $row, int $index): ?string
    {
        $value = $row[$index] ?? null;
        if (is_array($value)) {
            $value = implode(' ', $value);
        }
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : $value;
    }

    protected function normalizeHeader(?string $value): string
    {
        return Str::lower(preg_replace('/[^a-z0-9]/', '', (string) ($value ?? '')));
    }

    protected function isRowEmpty(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) ($cell ?? '')) !== '') {
                return false;
            }
        }
        return true;
    }

    protected function normalizeSeverity(?string $value): string
    {
        $value = Str::lower(trim((string) ($value ?? '')));
        return match ($value) {
            'warn', 'warning' => 'warn',
            'error' => 'error',
            default => 'info',
        };
    }
}
