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
        Schema::table('discount_rules', function (Blueprint $table) {
            if (!Schema::hasColumn('discount_rules', 'description_ar')) {
                $table->text('description_ar')->nullable()->after('description');
            }
            if (!Schema::hasColumn('discount_rules', 'max_cart_total')) {
                $table->decimal('max_cart_total', 10, 2)->nullable()->after('min_cart_total');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->dropColumn(['description_ar', 'max_cart_total']);
        });
    }
};
