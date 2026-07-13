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
            if (!Schema::hasColumn('discount_rules', 'min_cart_total')) {
                $table->decimal('min_cart_total', 10, 2)->nullable()->after('discount_value')
                    ->comment('Minimum cart total required to apply this rule');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->dropColumn('min_cart_total');
        });
    }
};
