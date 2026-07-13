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
        Schema::create('discount_rule_conditions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discount_rule_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['cart_qty', 'cart_subtotal', 'user_role', 'country', 'user_id', 'first_order']);
            $table->enum('operator', ['>=', '<=', '==', '!=', '>', '<', 'in', 'not_in']);
            $table->string('value');
            $table->timestamps();

            $table->index('discount_rule_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discount_rule_conditions');
    }
};
