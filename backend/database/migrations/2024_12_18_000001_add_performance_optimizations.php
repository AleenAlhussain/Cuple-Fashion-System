<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations - Performance optimizations
     */
    public function up(): void
    {
        // 1. Add index on orders.status for faster best seller queries
        Schema::table('orders', function (Blueprint $table) {
            $table->index('status', 'orders_status_index');
            $table->index(['status', 'created_at'], 'orders_status_created_index');
        });

        // 2. Add total_sold column to products for denormalized best seller sorting
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('total_sold')->default(0)->after('stock_quantity');
            $table->index('total_sold', 'products_total_sold_index');
            $table->index(['is_active', 'total_sold'], 'products_active_sold_index');
        });

        // 3. Add index on order_items for faster aggregation
        Schema::table('order_items', function (Blueprint $table) {
            $table->index(['product_id', 'order_id'], 'order_items_product_order_index');
        });

        // 4. Update total_sold for existing products (SQLite-compatible)
        DB::statement("
            UPDATE products
            SET total_sold = (
                SELECT COALESCE(SUM(oi.quantity), 0)
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE oi.product_id = products.id
                AND o.status IN ('delivered', 'shipped', 'processing', 'confirmed')
                AND o.deleted_at IS NULL
            )
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_status_index');
            $table->dropIndex('orders_status_created_index');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_total_sold_index');
            $table->dropIndex('products_active_sold_index');
            $table->dropColumn('total_sold');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex('order_items_product_order_index');
        });
    }
};
