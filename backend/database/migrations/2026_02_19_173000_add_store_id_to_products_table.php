<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('products', 'store_id')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->unsignedBigInteger('store_id')->nullable();
            $table->index('store_id', 'products_store_id_index');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('products', 'store_id')) {
            return;
        }

        try {
            DB::statement('DROP INDEX products_store_id_index ON products');
        } catch (\Throwable $e) {
            // Ignore if index does not exist in this environment.
        }

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('store_id');
        });
    }
};
