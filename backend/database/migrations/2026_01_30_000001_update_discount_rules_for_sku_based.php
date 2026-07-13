<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            // Ensure SKU-based targeting
            if (!Schema::hasColumn('discount_rules', 'target_level')) {
                $table->enum('target_level', ['sku', 'product', 'category', 'promo_group'])
                    ->default('sku')
                    ->after('rule_type');
            }

            // Stacking configuration
            if (!Schema::hasColumn('discount_rules', 'stacking_type')) {
                $table->enum('stacking_type', ['exclusive', 'stackable_with_bogo', 'stackable_with_product', 'stackable_all'])
                    ->default('exclusive')
                    ->after('is_stackable');
            }

            // Weight for priority resolution
            if (!Schema::hasColumn('discount_rules', 'type_weight')) {
                $table->integer('type_weight')->default(0)->after('priority');
            }

            // For shipping rules
            if (!Schema::hasColumn('discount_rules', 'applies_to_shipping')) {
                $table->boolean('applies_to_shipping')->default(false)->after('rule_type');
            }

            // Conflict group - rules in same group cannot stack
            if (!Schema::hasColumn('discount_rules', 'conflict_group')) {
                $table->string('conflict_group')->nullable()->after('stacking_group');
            }
        });
    }

    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            $columns = ['target_level', 'stacking_type', 'type_weight', 'applies_to_shipping', 'conflict_group'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('discount_rules', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
