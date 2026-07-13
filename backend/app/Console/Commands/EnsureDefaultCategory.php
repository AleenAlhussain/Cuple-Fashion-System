<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class EnsureDefaultCategory extends Command
{
    protected $signature = 'category:ensure-default';
    protected $description = 'Ensure default Uncategorized category exists and assign it to orphan products';

    public function handle(): int
    {
        $defaultCategory = Category::ensureDefaultExists();
        $this->info("Default category ready: #{$defaultCategory->id} ({$defaultCategory->name})");

        $orphanProductIds = Product::query()
            ->whereDoesntHave('categories')
            ->pluck('id')
            ->all();

        if (empty($orphanProductIds)) {
            $this->info('No orphan products found.');
            return self::SUCCESS;
        }

        $rows = array_map(
            fn ($productId) => ['product_id' => (int) $productId, 'category_id' => (int) $defaultCategory->id],
            $orphanProductIds
        );

        foreach (array_chunk($rows, 1000) as $chunk) {
            DB::table('category_product')->insertOrIgnore($chunk);
        }

        $this->info('Assigned default category to ' . count($orphanProductIds) . ' orphan products.');
        return self::SUCCESS;
    }
}
