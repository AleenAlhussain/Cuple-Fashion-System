<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add indexes to improve search performance
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            // For SQLite, check if indexes exist before creating

            // Products table indexes for search
            $indexes = [
                'products_name_index' => 'CREATE INDEX products_name_index ON products (name)',
                'products_sku_index' => 'CREATE INDEX products_sku_index ON products (sku)',
                'products_is_active_index' => 'CREATE INDEX products_is_active_index ON products (is_active)',
                'products_active_name_index' => 'CREATE INDEX products_active_name_index ON products (is_active, name)',
                'products_active_created_index' => 'CREATE INDEX products_active_created_index ON products (is_active, created_at)',
                'products_stock_status_index' => 'CREATE INDEX products_stock_status_index ON products (stock_status)',
                'products_slug_index' => 'CREATE INDEX products_slug_index ON products (slug)',

                // Order items for product sales queries
                'order_items_product_id_index' => 'CREATE INDEX order_items_product_id_index ON order_items (product_id)',

                // Category product pivot
                'category_product_category_id_index' => 'CREATE INDEX category_product_category_id_index ON category_product (category_id)',
                'category_product_product_id_index' => 'CREATE INDEX category_product_product_id_index ON category_product (product_id)',

                // Product variants
                'product_variants_product_id_index' => 'CREATE INDEX product_variants_product_id_index ON product_variants (product_id)',
                'product_variants_sku_index' => 'CREATE INDEX product_variants_sku_index ON product_variants (sku)',

                // Product images
                'product_images_product_primary_index' => 'CREATE INDEX product_images_product_primary_index ON product_images (product_id, is_primary)',

                // Attribute value product variant pivot
                'avpv_variant_id_index' => 'CREATE INDEX avpv_variant_id_index ON attribute_value_product_variant (product_variant_id)',
                'avpv_attribute_value_id_index' => 'CREATE INDEX avpv_attribute_value_id_index ON attribute_value_product_variant (attribute_value_id)',
            ];

            foreach ($indexes as $indexName => $createSql) {
                $existingIndex = DB::select("SELECT name FROM sqlite_master WHERE type='index' AND name=?", [$indexName]);
                if (empty($existingIndex)) {
                    try {
                        DB::statement($createSql);
                    } catch (\Exception $e) {
                        // Index might already exist or table doesn't exist yet
                    }
                }
            }
        } else {
            // For MySQL/PostgreSQL
            Schema::table('products', function (Blueprint $table) {
                $table->index('name', 'products_name_index');
                $table->index('sku', 'products_sku_index');
                $table->index('is_active', 'products_is_active_index');
                $table->index(['is_active', 'name'], 'products_active_name_index');
                $table->index(['is_active', 'created_at'], 'products_active_created_index');
                $table->index('stock_status', 'products_stock_status_index');
                $table->index('slug', 'products_slug_index');
            });

            Schema::table('order_items', function (Blueprint $table) {
                $table->index('product_id', 'order_items_product_id_index');
            });

            Schema::table('category_product', function (Blueprint $table) {
                $table->index('category_id', 'category_product_category_id_index');
                $table->index('product_id', 'category_product_product_id_index');
            });

            Schema::table('product_variants', function (Blueprint $table) {
                $table->index('product_id', 'product_variants_product_id_index');
                $table->index('sku', 'product_variants_sku_index');
            });

            Schema::table('product_images', function (Blueprint $table) {
                $table->index(['product_id', 'is_primary'], 'product_images_product_primary_index');
            });

            Schema::table('attribute_value_product_variant', function (Blueprint $table) {
                $table->index('product_variant_id', 'avpv_variant_id_index');
                $table->index('attribute_value_id', 'avpv_attribute_value_id_index');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $indexes = [
                'products_name_index',
                'products_sku_index',
                'products_is_active_index',
                'products_active_name_index',
                'products_active_created_index',
                'products_stock_status_index',
                'products_slug_index',
                'order_items_product_id_index',
                'category_product_category_id_index',
                'category_product_product_id_index',
                'product_variants_product_id_index',
                'product_variants_sku_index',
                'product_images_product_primary_index',
                'avpv_variant_id_index',
                'avpv_attribute_value_id_index',
            ];

            foreach ($indexes as $indexName) {
                DB::statement("DROP INDEX IF EXISTS {$indexName}");
            }
        } else {
            Schema::table('products', function (Blueprint $table) {
                $table->dropIndex('products_name_index');
                $table->dropIndex('products_sku_index');
                $table->dropIndex('products_is_active_index');
                $table->dropIndex('products_active_name_index');
                $table->dropIndex('products_active_created_index');
                $table->dropIndex('products_stock_status_index');
                $table->dropIndex('products_slug_index');
            });

            Schema::table('order_items', function (Blueprint $table) {
                $table->dropIndex('order_items_product_id_index');
            });

            Schema::table('category_product', function (Blueprint $table) {
                $table->dropIndex('category_product_category_id_index');
                $table->dropIndex('category_product_product_id_index');
            });

            Schema::table('product_variants', function (Blueprint $table) {
                $table->dropIndex('product_variants_product_id_index');
                $table->dropIndex('product_variants_sku_index');
            });

            Schema::table('product_images', function (Blueprint $table) {
                $table->dropIndex('product_images_product_primary_index');
            });

            Schema::table('attribute_value_product_variant', function (Blueprint $table) {
                $table->dropIndex('avpv_variant_id_index');
                $table->dropIndex('avpv_attribute_value_id_index');
            });
        }
    }
};
