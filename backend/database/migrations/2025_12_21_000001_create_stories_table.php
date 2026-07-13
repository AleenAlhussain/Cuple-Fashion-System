<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stories', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->string('title_ar')->nullable();
            $table->enum('media_type', ['image', 'video'])->default('image');
            $table->string('media_path');
            $table->string('thumbnail')->nullable();
            $table->enum('creator_type', ['admin', 'seller'])->default('admin');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained()->onDelete('set null');
            $table->string('button_text')->nullable();
            $table->string('button_text_ar')->nullable();
            $table->string('custom_link')->nullable();
            $table->integer('duration_seconds')->default(5);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('expires_at');
            $table->timestamps();

            // Performance indexes
            $table->index(['is_active', 'expires_at']);
            $table->index(['creator_type', 'user_id']);
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stories');
    }
};
