<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('min_price', 10, 2)->nullable()->after('sale_price');
            $table->decimal('max_price', 10, 2)->nullable()->after('min_price');
            $table->decimal('min_sale_price', 10, 2)->nullable()->after('max_price');
            $table->decimal('max_sale_price', 10, 2)->nullable()->after('min_sale_price');
            $table->boolean('has_variants')->default(false)->after('max_sale_price');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'min_price',
                'max_price',
                'min_sale_price',
                'max_sale_price',
                'has_variants',
            ]);
        });
    }
};
