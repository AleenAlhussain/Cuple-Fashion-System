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
        Schema::create('discount_rule_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discount_rule_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['date_range', 'weekly_window', 'blackout']);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->tinyInteger('day_of_week')->nullable(); // 0=Sunday, 6=Saturday
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->timestamps();

            $table->index('discount_rule_id');
            $table->index(['discount_rule_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discount_rule_schedules');
    }
};
