<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_histories', function (Blueprint $table) {
            $table->id();
            $table->string('module')->default('product')->index();
            $table->string('action')->nullable()->index();
            $table->string('original_file_name');
            $table->string('stored_file_path')->nullable();
            $table->string('status')->default('pending')->index();
            $table->unsignedTinyInteger('progress_percentage')->default(0);
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('processed_rows')->default(0);
            $table->json('summary')->nullable();
            $table->json('result_payload')->nullable();
            $table->string('report_file_path')->nullable();
            $table->string('error_file_path')->nullable();
            $table->string('rollback_status')->default('none')->index();
            $table->json('rollback_summary')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('rolled_back_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('import_history_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_history_id')->constrained('import_histories')->cascadeOnDelete();
            $table->string('target_type')->index();
            $table->string('operation')->index();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('sku')->nullable()->index();
            $table->json('before_state')->nullable();
            $table->json('after_state')->nullable();
            $table->string('rollback_status')->default('none')->index();
            $table->text('rollback_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_history_items');
        Schema::dropIfExists('import_histories');
    }
};
