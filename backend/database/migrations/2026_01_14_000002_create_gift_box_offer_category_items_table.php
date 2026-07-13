<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gift_box_offer_category_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gift_box_offer_id')->constrained('gift_box_offers')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('position');
            $table->string('discount_type')->nullable();
            $table->decimal('discount_value', 10, 2)->nullable();
            $table->timestamps();

            $table->unique(['gift_box_offer_id', 'category_id', 'position'], 'gift_box_offer_category_position_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gift_box_offer_category_items');
    }
};
