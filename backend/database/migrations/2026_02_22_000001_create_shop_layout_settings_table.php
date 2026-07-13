<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_layout_settings', function (Blueprint $table) {
            $table->id();
            $table->enum('scope', ['global', 'shop', 'category', 'brand'])->default('global');
            $table->unsignedBigInteger('scope_id')->nullable();
            $table->json('settings');
            $table->timestamps();

            $table->unique(['scope', 'scope_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_layout_settings');
    }
};
