<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Create uae_store_on_hand_raw table first (base table)
        if (!Schema::hasTable('uae_store_on_hand_raw')) {
            Schema::create('uae_store_on_hand_raw', function (Blueprint $table) {
                $table->id();
                $table->string('sku')->index();
                $table->integer('quantity')->default(0);
                $table->string('store_code')->nullable();
                $table->timestamps();
            });
        }

        // Create uae_store_priority table
        if (!Schema::hasTable('uae_store_priority')) {
            Schema::create('uae_store_priority', function (Blueprint $table) {
                $table->id();
                $table->string('store_code')->unique();
                $table->string('store_name')->nullable();
                $table->integer('priority')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // Create uae_store_update_import table (same structure as uae_store_on_hand_raw)
        if (!Schema::hasTable('uae_store_update_import')) {
            Schema::create('uae_store_update_import', function (Blueprint $table) {
                $table->id();
                $table->string('sku')->index();
                $table->integer('quantity')->default(0);
                $table->string('store_code')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('uae_store_update_import');
        Schema::dropIfExists('uae_store_priority');
        Schema::dropIfExists('uae_store_on_hand_raw');
    }
};
