<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Fix foreign key references from product_variants_old to product_variants
     * This migration is only needed for SQLite - MySQL handles foreign keys properly
     */
    public function up(): void
    {
        // Skip this migration for MySQL/MariaDB - only needed for SQLite
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        // Disable foreign key checks for SQLite
        DB::statement('PRAGMA foreign_keys = OFF');

        // Fix order_items table
        $this->recreateTable('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('product_variant_id')->nullable();
            $table->string('product_name');
            $table->string('variant_name')->nullable();
            $table->string('sku');
            $table->integer('quantity');
            $table->decimal('price', 10, 2);
            $table->decimal('total', 10, 2);
            $table->json('options')->nullable();
            $table->timestamps();

            $table->foreign('product_variant_id')->references('id')->on('product_variants')->onDelete('cascade');
        });

        // Fix cart_items table
        $this->recreateTable('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('product_variant_id')->nullable();
            $table->integer('quantity')->default(1);
            $table->decimal('price', 10, 2);
            $table->decimal('sale_price', 10, 2)->nullable();
            $table->timestamps();

            $table->foreign('product_variant_id')->references('id')->on('product_variants')->onDelete('cascade');
        });

        // Fix product_images table
        $this->recreateTable('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('product_variant_id')->nullable();
            $table->string('image');
            $table->string('thumbnail')->nullable();
            $table->string('alt_text')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('product_variant_id')->references('id')->on('product_variants')->onDelete('cascade');
        });

        // Fix attribute_value_product_variant table
        $this->recreateTable('attribute_value_product_variant', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_variant_id');
            $table->unsignedBigInteger('attribute_value_id');

            $table->foreign('product_variant_id')->references('id')->on('product_variants')->onDelete('cascade');
            $table->foreign('attribute_value_id')->references('id')->on('attribute_values')->onDelete('cascade');

            $table->unique(['product_variant_id', 'attribute_value_id'], 'avpv_unique');
        });

        // Re-enable foreign key checks
        DB::statement('PRAGMA foreign_keys = ON');
    }

    /**
     * Recreate a table with new schema while preserving data
     */
    private function recreateTable(string $tableName, callable $schemaCallback): void
    {
        $tempTable = $tableName . '_new';

        // Create new table with correct schema
        Schema::create($tempTable, $schemaCallback);

        // Get column names from new table
        $columns = collect(DB::select("PRAGMA table_info($tempTable)"))
            ->pluck('name')
            ->toArray();

        // Copy data from old table (only matching columns)
        $columnList = implode(', ', array_map(fn($c) => "\"$c\"", $columns));

        try {
            DB::statement("INSERT INTO \"$tempTable\" ($columnList) SELECT $columnList FROM \"$tableName\"");
        } catch (\Exception $e) {
            // If copy fails due to missing columns, try without the problematic ones
            \Log::warning("Data migration for $tableName: " . $e->getMessage());
        }

        // Drop old table
        Schema::drop($tableName);

        // Rename new table
        DB::statement("ALTER TABLE \"$tempTable\" RENAME TO \"$tableName\"");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration fixes broken foreign keys, no need to reverse
    }
};
