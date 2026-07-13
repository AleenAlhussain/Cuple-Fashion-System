<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\ProductPublishValidator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class EnforceProductPublishReadiness extends Command
{
    protected $signature = 'products:enforce-publish-readiness
        {--dry-run : Validate and report only, without unpublishing}
        {--chunk=200 : Number of products per chunk}
        {--product_id=* : Validate only specific product IDs}';

    protected $description = 'Unpublish active products that fail required publish fields validation.';

    public function handle(ProductPublishValidator $validator): int
    {
        $chunkSize = max((int) $this->option('chunk'), 1);
        $dryRun = (bool) $this->option('dry-run');
        $specificIds = collect($this->option('product_id'))
            ->filter(fn($id) => is_numeric($id))
            ->map(fn($id) => (int) $id)
            ->unique()
            ->values();

        $query = Product::query()->where('is_active', true);
        if ($specificIds->isNotEmpty()) {
            $query->whereIn('id', $specificIds->all());
        }

        $totalActive = (clone $query)->count();
        if ($totalActive === 0) {
            $this->info('No active products found for validation.');
            return self::SUCCESS;
        }

        $this->info("Validating {$totalActive} active product(s)...");

        $invalidCount = 0;
        $unpublishedCount = 0;
        $reasonSummary = [];
        $previewRows = [];
        $previewLimit = 50;

        $query->orderBy('id')->chunkById($chunkSize, function ($products) use (
            $validator,
            $dryRun,
            &$invalidCount,
            &$unpublishedCount,
            &$reasonSummary,
            &$previewRows,
            $previewLimit
        ) {
            $products->loadMissing([
                'images:id,product_id,product_variant_id,image,is_primary',
                'categories:id',
                'variants:id,product_id,sku,price,stock_quantity,is_active',
                'variants.attributeValues:id,attribute_id',
            ]);

            foreach ($products as $product) {
                $validation = $validator->validate($product);
                if ($validation['valid']) {
                    continue;
                }

                $invalidCount++;

                foreach ($validation['reasons'] as $reason) {
                    $reasonSummary[$reason] = ($reasonSummary[$reason] ?? 0) + 1;
                }

                if (count($previewRows) < $previewLimit) {
                    $previewRows[] = [
                        'id' => (string) $product->id,
                        'slug' => (string) ($product->slug ?: '-'),
                        'reasons' => implode(', ', $validation['reasons']),
                    ];
                }

                if (!$dryRun) {
                    $product->update(['is_active' => false]);
                    $unpublishedCount++;
                }
            }
        });

        if (!empty($previewRows)) {
            $this->table(['Product ID', 'Slug', 'Reasons'], $previewRows);
            if ($invalidCount > $previewLimit) {
                $this->line('Showing first 50 invalid products only.');
            }
        }

        if (!empty($reasonSummary)) {
            ksort($reasonSummary);
            $this->line('Reason summary:');
            foreach ($reasonSummary as $reason => $count) {
                $this->line("- {$reason}: {$count}");
            }
        }

        if ($dryRun) {
            $this->warn("Dry run complete. Invalid products found: {$invalidCount}. No changes were applied.");
            return self::SUCCESS;
        }

        if ($unpublishedCount > 0) {
            $this->bumpProductCacheVersion();
        }

        $this->info("Completed. Invalid products: {$invalidCount}. Unpublished: {$unpublishedCount}.");

        return self::SUCCESS;
    }

    private function bumpProductCacheVersion(): void
    {
        $current = (int) Cache::get('products_list_version', 1);
        Cache::forever('products_list_version', $current + 1);
    }
}

