<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gift_box_selections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('gift_box_offer_id')->constrained('gift_box_offers')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['confirmed', 'applied', 'expired'])->default('confirmed');
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'gift_box_offer_id'], 'gift_box_selection_user_offer_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gift_box_selections');
    }
};
