<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gift_box_offers', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_active')->default(false);
            $table->timestamp('start_at')->nullable();
            $table->timestamp('end_at')->nullable();
            $table->boolean('only_logged_in')->default(true);
            $table->unsignedTinyInteger('selection_limit')->default(1);
            $table->boolean('show_once_per_session')->default(true);
            $table->string('reuse_policy')->default('once_per_user');
            $table->enum('discount_type', ['percentage', 'fixed', 'price_override'])->default('percentage');
            $table->decimal('discount_value', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gift_box_offers');
    }
};
