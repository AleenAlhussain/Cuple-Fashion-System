<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\PriceResolver;
use Illuminate\Console\Command;

class BackfillProductPrices extends Command
{
    protected $signature = 'products:backfill-prices {--chunk=200 : Chunk size}';

    protected $description = 'Backfill cached min/max price fields for products';

    public function handle(): int
    {
        $chunkSize = (int) $this->option('chunk');
        $resolver = app(PriceResolver::class);

        Product::query()
            ->select(['id', 'price', 'sale_price'])
            ->with(['variants' => function ($q) {
                $q->select(['id', 'product_id', 'price', 'sale_price'])
                    ->where('is_active', true);
            }])
            ->chunkById($chunkSize, function ($products) use ($resolver) {
                foreach ($products as $product) {
                    $resolver->refreshCachedPrices($product, $product->variants);
                }
            });

        $this->info('Backfill completed.');
        return self::SUCCESS;
    }
}
