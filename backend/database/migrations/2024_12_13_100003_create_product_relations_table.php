<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('related_product_id')->constrained('products')->onDelete('cascade');
            $table->enum('type', ['related', 'cross_sell', 'upsell']);
            $table->timestamps();

            // Unique constraint to prevent duplicate relations
            $table->unique(['product_id', 'related_product_id', 'type'], 'product_relation_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_relations');
    }
};
