<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class BulkUpdateProductImages extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'products:bulk-update-images
                            {file : Path to the Excel file}
                            {--sku-column=A : Column containing SKU}
                            {--image-column=B : Column containing image URL}
                            {--replace : Replace existing images instead of adding}
                            {--dry-run : Show what would be done without making changes}';

    /**
     * The console command description.
     */
    protected $description = 'Bulk update product images from an Excel file based on SKU';

    private array $missingSKUs = [];
    private array $updatedProducts = [];
    private array $updatedVariants = [];
    private array $errors = [];
    private int $processedRows = 0;

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = $this->argument('file');
        $skuColumn = strtoupper($this->option('sku-column'));
        $imageColumn = strtoupper($this->option('image-column'));
        $replace = $this->option('replace');
        $dryRun = $this->option('dry-run');

        if (!file_exists($filePath)) {
            $this->error("File not found: {$filePath}");
            return 1;
        }

        $this->info("Loading Excel file: {$filePath}");

        if ($dryRun) {
            $this->warn("DRY RUN MODE - No changes will be made");
        }

        try {
            $spreadsheet = IOFactory::load($filePath);
            $sheet = $spreadsheet->getActiveSheet();
            $totalRows = $sheet->getHighestRow();

            $this->info("Found {$totalRows} rows (including header)");
            $this->newLine();

            $progressBar = $this->output->createProgressBar($totalRows - 1);
            $progressBar->start();

            // Skip header row
            for ($row = 2; $row <= $totalRows; $row++) {
                $sku = trim((string) $sheet->getCell($skuColumn . $row)->getValue());
                $imageUrl = trim((string) $sheet->getCell($imageColumn . $row)->getValue());

                $this->processedRows++;

                if (empty($sku)) {
                    $this->errors[] = [
                        'row' => $row,
                        'sku' => '(empty)',
                        'error' => 'SKU is empty'
                    ];
                    $progressBar->advance();
                    continue;
                }

                if (empty($imageUrl)) {
                    $this->errors[] = [
                        'row' => $row,
                        'sku' => $sku,
                        'error' => 'Image URL is empty'
                    ];
                    $progressBar->advance();
                    continue;
                }

                // Try to find in product_variants first (more specific)
                $variant = ProductVariant::where('sku', $sku)->first();

                if ($variant) {
                    if (!$dryRun) {
                        $this->updateVariantImage($variant, $imageUrl);
                    }
                    $this->updatedVariants[] = [
                        'row' => $row,
                        'sku' => $sku,
                        'product_id' => $variant->product_id,
                        'variant_id' => $variant->id,
                        'image' => $imageUrl
                    ];
                    $progressBar->advance();
                    continue;
                }

                // Try to find in products
                $product = Product::where('sku', $sku)->first();

                if ($product) {
                    if (!$dryRun) {
                        $this->updateProductImage($product, $imageUrl, $replace);
                    }
                    $this->updatedProducts[] = [
                        'row' => $row,
                        'sku' => $sku,
                        'product_id' => $product->id,
                        'image' => $imageUrl
                    ];
                    $progressBar->advance();
                    continue;
                }

                // SKU not found in either table
                $this->missingSKUs[] = [
                    'row' => $row,
                    'sku' => $sku,
                    'image' => $imageUrl
                ];

                $progressBar->advance();
            }

            $progressBar->finish();
            $this->newLine(2);

            // Display summary
            $this->displaySummary($dryRun);

            // Save report to file
            $this->saveReport($filePath, $dryRun);

            return 0;

        } catch (\Exception $e) {
            $this->error("Error processing file: " . $e->getMessage());
            Log::error("Bulk image update error: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
    }

    /**
     * Update variant image
     */
    private function updateVariantImage(ProductVariant $variant, string $imageUrl): void
    {
        $variant->update(['image' => $imageUrl]);
    }

    /**
     * Update product image
     */
    private function updateProductImage(Product $product, string $imageUrl, bool $replace): void
    {
        if ($replace) {
            // Delete existing images and add new one
            ProductImage::where('product_id', $product->id)->delete();

            ProductImage::create([
                'product_id' => $product->id,
                'image' => $imageUrl,
                'is_primary' => true,
                'sort_order' => 0,
            ]);
        } else {
            // Check if this exact image already exists
            $exists = ProductImage::where('product_id', $product->id)
                ->where('image', $imageUrl)
                ->exists();

            if (!$exists) {
                // Get the next sort order
                $maxSort = ProductImage::where('product_id', $product->id)->max('sort_order') ?? -1;

                // Check if there's already a primary image
                $hasPrimary = ProductImage::where('product_id', $product->id)
                    ->where('is_primary', true)
                    ->exists();

                ProductImage::create([
                    'product_id' => $product->id,
                    'image' => $imageUrl,
                    'is_primary' => !$hasPrimary, // Set as primary if no primary exists
                    'sort_order' => $maxSort + 1,
                ]);
            }
        }
    }

    /**
     * Display summary
     */
    private function displaySummary(bool $dryRun): void
    {
        $prefix = $dryRun ? '[DRY RUN] Would have ' : '';

        $this->info("========================================");
        $this->info("           SUMMARY REPORT              ");
        $this->info("========================================");
        $this->newLine();

        $this->info("Total rows processed: {$this->processedRows}");
        $this->newLine();

        // Updated products
        $productCount = count($this->updatedProducts);
        $this->info("{$prefix}Updated products: {$productCount}");

        // Updated variants
        $variantCount = count($this->updatedVariants);
        $this->info("{$prefix}Updated variants: {$variantCount}");

        // Missing SKUs
        $missingCount = count($this->missingSKUs);
        if ($missingCount > 0) {
            $this->warn("Missing SKUs: {$missingCount}");
        } else {
            $this->info("Missing SKUs: 0");
        }

        // Errors
        $errorCount = count($this->errors);
        if ($errorCount > 0) {
            $this->error("Errors: {$errorCount}");
        } else {
            $this->info("Errors: 0");
        }

        $this->newLine();

        // Show first 10 missing SKUs
        if ($missingCount > 0) {
            $this->warn("First 10 missing SKUs:");
            $showCount = min(10, $missingCount);
            for ($i = 0; $i < $showCount; $i++) {
                $missing = $this->missingSKUs[$i];
                $this->line("  Row {$missing['row']}: {$missing['sku']}");
            }
            if ($missingCount > 10) {
                $this->line("  ... and " . ($missingCount - 10) . " more");
            }
            $this->newLine();
        }

        // Show first 10 errors
        if ($errorCount > 0) {
            $this->error("First 10 errors:");
            $showCount = min(10, $errorCount);
            for ($i = 0; $i < $showCount; $i++) {
                $error = $this->errors[$i];
                $this->line("  Row {$error['row']}: [{$error['sku']}] {$error['error']}");
            }
            if ($errorCount > 10) {
                $this->line("  ... and " . ($errorCount - 10) . " more");
            }
        }
    }

    /**
     * Save detailed report to file
     */
    private function saveReport(string $inputFile, bool $dryRun): void
    {
        $timestamp = date('Y-m-d_H-i-s');
        $reportDir = storage_path('app/reports');

        if (!is_dir($reportDir)) {
            mkdir($reportDir, 0755, true);
        }

        $reportFile = $reportDir . "/bulk_image_update_{$timestamp}.txt";

        $report = [];
        $report[] = "========================================";
        $report[] = "  BULK IMAGE UPDATE REPORT";
        $report[] = "========================================";
        $report[] = "";
        $report[] = "Date: " . date('Y-m-d H:i:s');
        $report[] = "Input file: {$inputFile}";
        $report[] = "Mode: " . ($dryRun ? 'DRY RUN' : 'LIVE');
        $report[] = "";
        $report[] = "----------------------------------------";
        $report[] = "SUMMARY";
        $report[] = "----------------------------------------";
        $report[] = "Total rows processed: {$this->processedRows}";
        $report[] = "Products updated: " . count($this->updatedProducts);
        $report[] = "Variants updated: " . count($this->updatedVariants);
        $report[] = "Missing SKUs: " . count($this->missingSKUs);
        $report[] = "Errors: " . count($this->errors);
        $report[] = "";

        // Updated Products
        if (count($this->updatedProducts) > 0) {
            $report[] = "----------------------------------------";
            $report[] = "UPDATED PRODUCTS";
            $report[] = "----------------------------------------";
            foreach ($this->updatedProducts as $item) {
                $report[] = "Row {$item['row']}: SKU={$item['sku']}, ProductID={$item['product_id']}";
            }
            $report[] = "";
        }

        // Updated Variants
        if (count($this->updatedVariants) > 0) {
            $report[] = "----------------------------------------";
            $report[] = "UPDATED VARIANTS";
            $report[] = "----------------------------------------";
            foreach ($this->updatedVariants as $item) {
                $report[] = "Row {$item['row']}: SKU={$item['sku']}, ProductID={$item['product_id']}, VariantID={$item['variant_id']}";
            }
            $report[] = "";
        }

        // Missing SKUs
        if (count($this->missingSKUs) > 0) {
            $report[] = "----------------------------------------";
            $report[] = "MISSING SKUS";
            $report[] = "----------------------------------------";
            foreach ($this->missingSKUs as $item) {
                $report[] = "Row {$item['row']}: SKU={$item['sku']}";
            }
            $report[] = "";
        }

        // Errors
        if (count($this->errors) > 0) {
            $report[] = "----------------------------------------";
            $report[] = "ERRORS";
            $report[] = "----------------------------------------";
            foreach ($this->errors as $item) {
                $report[] = "Row {$item['row']}: SKU={$item['sku']}, Error={$item['error']}";
            }
            $report[] = "";
        }

        file_put_contents($reportFile, implode("\n", $report));

        $this->newLine();
        $this->info("Detailed report saved to: {$reportFile}");
    }
}
