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
        Schema::table('discount_rule_usages', function (Blueprint $table) {
            $table->json('items_affected')->nullable()->after('discount_amount');
        });

        // Add unique constraint to prevent double-recording
        Schema::table('discount_rule_usages', function (Blueprint $table) {
            $table->unique(['discount_rule_id', 'order_id'], 'usage_rule_order_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discount_rule_usages', function (Blueprint $table) {
            $table->dropUnique('usage_rule_order_unique');
            $table->dropColumn('items_affected');
        });
    }
};
