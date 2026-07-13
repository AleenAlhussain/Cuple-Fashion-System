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
        Schema::create('discount_rule_filters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discount_rule_id')->constrained()->onDelete('cascade');
            $table->enum('target', ['buy', 'get', 'both'])->default('both');
            $table->enum('filter_type', ['variant_sku', 'variant_id', 'product_id', 'category', 'tag', 'attribute']);
            $table->json('filter_values');
            $table->boolean('is_exclude')->default(false);
            $table->timestamps();

            $table->index('discount_rule_id');
            $table->index(['discount_rule_id', 'target']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discount_rule_filters');
    }
};
