<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add total_sold column for faster best seller queries
     * This denormalizes the data but makes queries instant instead of using subqueries
     */
    public function up(): void
    {
        // Check if column already exists
        if (Schema::hasColumn('products', 'total_sold')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('total_sold')->default(0)->after('stock_status');
            $table->index('total_sold', 'products_total_sold_index');
            $table->index(['is_active', 'total_sold'], 'products_active_sold_index');
        });

        // Update existing products with their total sold count
        // Use SQLite-compatible syntax (no table alias in UPDATE)
        DB::statement("
            UPDATE products
            SET total_sold = (
                SELECT COALESCE(SUM(oi.quantity), 0)
                FROM order_items oi
                INNER JOIN orders o ON oi.order_id = o.id
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
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_total_sold_index');
            $table->dropIndex('products_active_sold_index');
            $table->dropColumn('total_sold');
        });
    }
};
