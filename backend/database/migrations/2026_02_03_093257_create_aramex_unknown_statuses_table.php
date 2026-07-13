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
        Schema::create('aramex_unknown_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('aramex_code')->nullable()->index();
            $table->string('aramex_name')->nullable()->index();
            $table->string('stage')->nullable();
            $table->string('severity')->nullable();
            $table->string('locale', 5)->default('en');
            $table->dateTime('occurred_at')->nullable();
            $table->string('location')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aramex_unknown_statuses');
    }
};
