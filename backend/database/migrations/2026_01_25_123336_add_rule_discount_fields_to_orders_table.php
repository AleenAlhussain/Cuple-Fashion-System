<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Amount discounted from offer engine rules (separate from coupon discount)
            $table->decimal('rule_discount_amount', 10, 2)->default(0)->after('discount_amount');
            // JSON array of applied discount rule IDs for tracking
            $table->json('applied_discount_rules')->nullable()->after('rule_discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['rule_discount_amount', 'applied_discount_rules']);
        });
    }
};
