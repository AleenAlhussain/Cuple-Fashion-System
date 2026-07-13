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
        Schema::create('aramex_status_mappings', function (Blueprint $table) {
            $table->id();
            $table->string('aramex_code')->unique();
            $table->string('aramex_name')->nullable();
            $table->string('stage')->default('PROCESSING');
            $table->enum('severity', ['info', 'warn', 'error'])->default('info');
            $table->string('customer_title_en')->nullable();
            $table->text('customer_message_en')->nullable();
            $table->string('customer_title_ar')->nullable();
            $table->text('customer_message_ar')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_manual_override')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aramex_status_mappings');
    }
};
