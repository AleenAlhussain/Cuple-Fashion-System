<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Product type (simple, variable)
            $table->string('type')->default('simple')->after('slug');

            // Sale settings
            $table->boolean('is_sale_enable')->default(false)->after('sale_price');
            $table->timestamp('sale_starts_at')->nullable()->after('is_sale_enable');
            $table->timestamp('sale_expired_at')->nullable()->after('sale_starts_at');

            // Classification
            $table->string('unit')->nullable()->after('weight_unit');
            $table->unsignedBigInteger('brand_id')->nullable()->after('unit');

            // Related products settings
            $table->boolean('is_random_related_products')->default(true)->after('is_featured');

            // Shipping
            $table->boolean('is_free_shipping')->default(false)->after('is_digital');
            $table->string('estimated_delivery_text')->nullable()->after('is_free_shipping');
            $table->boolean('is_return')->default(true)->after('estimated_delivery_text');
            $table->text('return_policy_text')->nullable()->after('is_return');

            // Display options
            $table->boolean('safe_checkout')->default(true)->after('sort_order');
            $table->boolean('secure_checkout')->default(true)->after('safe_checkout');
            $table->boolean('social_share')->default(true)->after('secure_checkout');
            $table->boolean('encourage_order')->default(true)->after('social_share');
            $table->boolean('encourage_view')->default(true)->after('encourage_order');
            $table->boolean('is_trending')->default(false)->after('encourage_view');

            // Size chart image
            $table->unsignedBigInteger('size_chart_image_id')->nullable()->after('meta_image');

            // Add foreign key for brand
            $table->foreign('brand_id')->references('id')->on('brands')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['brand_id']);

            $table->dropColumn([
                'type',
                'is_sale_enable',
                'sale_starts_at',
                'sale_expired_at',
                'unit',
                'brand_id',
                'is_random_related_products',
                'is_free_shipping',
                'estimated_delivery_text',
                'is_return',
                'return_policy_text',
                'safe_checkout',
                'secure_checkout',
                'social_share',
                'encourage_order',
                'encourage_view',
                'is_trending',
                'size_chart_image_id',
            ]);
        });
    }
};
