<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discount_rule_filters', function (Blueprint $table) {
            // Add variant_ids for direct SKU targeting
            if (!Schema::hasColumn('discount_rule_filters', 'variant_ids')) {
                $table->json('variant_ids')->nullable()->after('filter_values');
            }

            // Add promo_group_ids for promo group targeting
            if (!Schema::hasColumn('discount_rule_filters', 'promo_group_ids')) {
                $table->json('promo_group_ids')->nullable()->after('variant_ids');
            }
        });
    }

    public function down(): void
    {
        Schema::table('discount_rule_filters', function (Blueprint $table) {
            if (Schema::hasColumn('discount_rule_filters', 'variant_ids')) {
                $table->dropColumn('variant_ids');
            }
            if (Schema::hasColumn('discount_rule_filters', 'promo_group_ids')) {
                $table->dropColumn('promo_group_ids');
            }
        });
    }
};
