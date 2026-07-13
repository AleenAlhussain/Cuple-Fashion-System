<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'product_thumbnail_id')) {
                $table->unsignedBigInteger('product_thumbnail_id')->nullable();
                $table->index('product_thumbnail_id');
            }

            if (!Schema::hasColumn('products', 'product_galleries_id')) {
                $table->json('product_galleries_id')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'product_thumbnail_id')) {
                $table->dropIndex(['product_thumbnail_id']);
                $table->dropColumn('product_thumbnail_id');
            }

            if (Schema::hasColumn('products', 'product_galleries_id')) {
                $table->dropColumn('product_galleries_id');
            }
        });
    }
};
