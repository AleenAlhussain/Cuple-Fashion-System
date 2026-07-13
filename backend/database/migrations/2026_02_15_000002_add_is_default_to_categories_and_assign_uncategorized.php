<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('categories', 'is_default')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->boolean('is_default')->default(false)->index();
            });
        }

        $now = now();

        $defaultId = DB::table('categories')
            ->where('slug', 'uncategorized')
            ->value('id');

        if ($defaultId) {
            DB::table('categories')
                ->where('id', $defaultId)
                ->update([
                    'name' => 'Uncategorized',
                    'is_default' => true,
                    'is_active' => true,
                    'updated_at' => $now,
                ]);
        } else {
            $defaultId = DB::table('categories')->insertGetId([
                'name' => 'Uncategorized',
                'slug' => 'uncategorized',
                'description' => 'System default category',
                'parent_id' => null,
                'sort_order' => 0,
                'is_active' => true,
                'is_default' => true,
                'meta_title' => 'Uncategorized',
                'meta_description' => 'System default category',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        DB::table('categories')
            ->where('id', '!=', $defaultId)
            ->where('is_default', true)
            ->update([
                'is_default' => false,
                'updated_at' => $now,
            ]);

        $orphanProductIds = DB::table('products')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('category_product')
                    ->whereColumn('category_product.product_id', 'products.id');
            })
            ->pluck('id')
            ->all();

        if (!empty($orphanProductIds)) {
            $rows = array_map(
                fn ($productId) => ['product_id' => (int) $productId, 'category_id' => (int) $defaultId],
                $orphanProductIds
            );

            foreach (array_chunk($rows, 1000) as $chunk) {
                DB::table('category_product')->insertOrIgnore($chunk);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('categories', 'is_default')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->dropIndex(['is_default']);
                $table->dropColumn('is_default');
            });
        }
    }
};
