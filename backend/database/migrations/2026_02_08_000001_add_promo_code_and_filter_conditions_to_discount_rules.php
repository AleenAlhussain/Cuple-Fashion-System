<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            if (!Schema::hasColumn('discount_rules', 'requires_promo_code')) {
                $table->boolean('requires_promo_code')->default(false)->after('is_active');
            }
            if (!Schema::hasColumn('discount_rules', 'promo_code')) {
                $table->string('promo_code', 50)->nullable()->after('requires_promo_code');
            }
            if (!Schema::hasColumn('discount_rules', 'show_as_coupon')) {
                $table->boolean('show_as_coupon')->default(false)->after('promo_code');
            }
            if (!Schema::hasColumn('discount_rules', 'quantity_count_method')) {
                $table->string('quantity_count_method')->default('filter_products')->after('count_quantities_by');
            }
            if (!Schema::hasColumn('discount_rules', 'filter_conditions')) {
                $table->json('filter_conditions')->nullable()->after('condition_match_type');
            }
        });

        // Add index separately to avoid issues with hasColumn checks
        $indexes = Schema::getIndexListing('discount_rules');
        if (!in_array('discount_rules_promo_code_index', $indexes)) {
            Schema::table('discount_rules', function (Blueprint $table) {
                $table->index('promo_code');
            });
        }
    }

    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            $indexes = Schema::getIndexListing('discount_rules');
            if (in_array('discount_rules_promo_code_index', $indexes)) {
                $table->dropIndex(['promo_code']);
            }

            $columns = [];
            foreach (['requires_promo_code', 'promo_code', 'show_as_coupon', 'quantity_count_method', 'filter_conditions'] as $col) {
                if (Schema::hasColumn('discount_rules', $col)) {
                    $columns[] = $col;
                }
            }
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
