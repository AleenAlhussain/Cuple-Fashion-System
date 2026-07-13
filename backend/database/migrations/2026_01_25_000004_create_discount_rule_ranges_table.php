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
        Schema::create('discount_rule_ranges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discount_rule_id')->constrained()->onDelete('cascade');
            $table->integer('min_qty');
            $table->integer('max_qty')->nullable();
            $table->enum('discount_type', ['percentage', 'fixed_amount', 'fixed_price']);
            $table->decimal('discount_value', 10, 2);
            $table->integer('free_qty')->nullable(); // For BOGO
            $table->timestamps();

            $table->index('discount_rule_id');
            $table->index(['discount_rule_id', 'min_qty']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discount_rule_ranges');
    }
};
