<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Attribute types (Size, Color, etc.)
        Schema::create('attributes', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Size, Color
            $table->string('name_ar')->nullable();
            $table->string('slug')->unique();
            $table->timestamps();
        });

        // Attribute values (S, M, L, XL / Red, Blue, etc.)
        Schema::create('attribute_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attribute_id')->constrained()->onDelete('cascade');
            $table->string('value'); // S, M, L, Red, Blue
            $table->string('value_ar')->nullable();
            $table->string('color_code')->nullable(); // For color swatches #FF0000
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Product variants (combinations of attributes)
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->string('sku')->unique();
            $table->decimal('price', 10, 2)->nullable();
            $table->decimal('sale_price', 10, 2)->nullable();
            $table->integer('stock_quantity')->default(0);
            $table->string('image')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Variant-AttributeValue pivot
        Schema::create('attribute_value_product_variant', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained()->onDelete('cascade');
            $table->foreignId('attribute_value_id')->constrained()->onDelete('cascade');
            $table->unique(['product_variant_id', 'attribute_value_id'], 'variant_attribute_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attribute_value_product_variant');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('attribute_values');
        Schema::dropIfExists('attributes');
    }
};
