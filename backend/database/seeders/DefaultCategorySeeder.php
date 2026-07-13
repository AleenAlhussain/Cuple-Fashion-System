<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DefaultCategorySeeder extends Seeder
{
    public function run(): void
    {
        $defaultCategoryId = Category::defaultCategoryId();

        $orphanProductIds = Product::query()
            ->whereDoesntHave('categories')
            ->pluck('id')
            ->all();

        if (empty($orphanProductIds)) {
            return;
        }

        $rows = array_map(
            fn ($productId) => ['product_id' => (int) $productId, 'category_id' => $defaultCategoryId],
            $orphanProductIds
        );

        foreach (array_chunk($rows, 1000) as $chunk) {
            DB::table('category_product')->insertOrIgnore($chunk);
        }
    }
}
