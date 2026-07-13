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
        if (Schema::hasTable('attachments')) {
            return;
        }

        Schema::create('attachments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name')->nullable();
            $table->string('file_name')->nullable();
            $table->string('path')->nullable();
            $table->longText('original_url')->nullable();
            $table->string('url_hash', 64)->nullable()->unique();
            $table->string('disk')->nullable();
            $table->string('source', 32)->default('external');
            $table->string('mime_type')->nullable();
            $table->timestamps();

            $table->index('file_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
