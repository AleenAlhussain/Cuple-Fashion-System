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
        Schema::create('popups', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('title_ar')->nullable();
            $table->text('description')->nullable();
            $table->text('description_ar')->nullable();
            $table->enum('type', ['collection', 'offer', 'coupon', 'newsletter'])->default('offer');
            $table->string('image')->nullable();
            $table->string('button_text')->nullable();
            $table->string('button_text_ar')->nullable();
            $table->string('button_link')->nullable();

            // For coupon type
            $table->string('coupon_code')->nullable();
            $table->decimal('discount_value', 10, 2)->nullable();
            $table->enum('discount_type', ['percentage', 'fixed'])->nullable();

            // Display rules
            $table->enum('display_frequency', ['once', 'every_visit', 'once_per_session', 'once_per_day'])->default('once');
            $table->integer('delay_seconds')->default(3);
            $table->boolean('show_on_exit_intent')->default(false);
            $table->json('show_on_pages')->nullable(); // ['home', 'product', 'category', 'all']

            // Scheduling
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();

            // Status
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0);

            $table->timestamps();

            $table->index(['is_active', 'type']);
            $table->index(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('popups');
    }
};
