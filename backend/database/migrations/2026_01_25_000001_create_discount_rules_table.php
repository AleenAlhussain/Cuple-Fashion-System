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
        Schema::create('discount_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['product', 'cart', 'bulk', 'bundle', 'bogo']);
            $table->enum('discount_type', ['percentage', 'fixed_amount', 'fixed_price']);
            $table->decimal('discount_value', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0);
            $table->boolean('stop_other_rules')->default(false);
            $table->string('stacking_group')->nullable();
            $table->decimal('max_discount_amount', 10, 2)->nullable();
            $table->integer('max_affected_items')->nullable();
            $table->integer('max_applications')->nullable();
            $table->integer('min_qty')->nullable();
            $table->boolean('recursive')->default(false);
            $table->integer('recursive_step')->nullable();
            $table->enum('selection_strategy', ['cheapest_first', 'most_expensive_first'])->default('cheapest_first');
            $table->enum('condition_match_type', ['match_all', 'match_any'])->default('match_all');
            $table->enum('count_quantities_by', ['eligible_qty', 'eligible_subtotal'])->default('eligible_qty');
            $table->string('timezone')->default('Asia/Dubai');
            $table->integer('usage_limit_per_user')->nullable();
            $table->integer('usage_limit_total')->nullable();
            $table->text('message')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['is_active', 'priority']);
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discount_rules');
    }
};
