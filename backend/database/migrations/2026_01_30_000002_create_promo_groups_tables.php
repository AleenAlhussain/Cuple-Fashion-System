<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Promo Groups - separate from regular tags for discount targeting
        Schema::create('promo_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('slug');
            $table->index('is_active');
        });

        // Pivot table: promo_group_sku (links promo groups to product variants/SKUs)
        Schema::create('promo_group_sku', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promo_group_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_variant_id')->constrained('product_variants')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['promo_group_id', 'product_variant_id']);
            $table->index('promo_group_id');
            $table->index('product_variant_id');
        });

        // Link discount rules to promo groups
        Schema::create('discount_rule_promo_group', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discount_rule_id')->constrained()->onDelete('cascade');
            $table->foreignId('promo_group_id')->constrained()->onDelete('cascade');
            $table->enum('target', ['buy', 'get', 'both'])->default('buy');
            $table->timestamps();

            $table->unique(['discount_rule_id', 'promo_group_id', 'target'], 'drpg_rule_group_target_unique');
            $table->index('discount_rule_id');
            $table->index('promo_group_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discount_rule_promo_group');
        Schema::dropIfExists('promo_group_sku');
        Schema::dropIfExists('promo_groups');
    }
};
