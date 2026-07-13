<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Indexes on discount_rules for faster rule lookup
        Schema::table('discount_rules', function (Blueprint $table) {
            // Check if indexes exist before creating
            $indexes = $this->getTableIndexes('discount_rules');

            if (!in_array('active_date_range_idx', $indexes)) {
                $table->index(['is_active', 'starts_at', 'ends_at'], 'active_date_range_idx');
            }

            if (!in_array('type_priority_idx', $indexes)) {
                $table->index(['rule_type', 'priority'], 'type_priority_idx');
            }

            if (!in_array('discount_rules_stacking_type_index', $indexes) && Schema::hasColumn('discount_rules', 'stacking_type')) {
                $table->index('stacking_type');
            }

            if (!in_array('discount_rules_conflict_group_index', $indexes) && Schema::hasColumn('discount_rules', 'conflict_group')) {
                $table->index('conflict_group');
            }
        });

        // Indexes on product_variants for faster SKU lookup
        Schema::table('product_variants', function (Blueprint $table) {
            $indexes = $this->getTableIndexes('product_variants');

            if (!in_array('sku_index', $indexes) && !in_array('product_variants_sku_index', $indexes)) {
                $table->index('sku', 'sku_index');
            }

            if (!in_array('product_active_idx', $indexes)) {
                $table->index(['product_id', 'is_active'], 'product_active_idx');
            }
        });

        // Indexes on discount_rule_usages for faster usage tracking
        if (Schema::hasTable('discount_rule_usages')) {
            Schema::table('discount_rule_usages', function (Blueprint $table) {
                $indexes = $this->getTableIndexes('discount_rule_usages');

                if (!in_array('rule_date_idx', $indexes)) {
                    $table->index(['discount_rule_id', 'created_at'], 'rule_date_idx');
                }

                if (!in_array('user_rule_idx', $indexes)) {
                    $table->index(['user_id', 'discount_rule_id'], 'user_rule_idx');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            $indexes = $this->getTableIndexes('discount_rules');

            if (in_array('active_date_range_idx', $indexes)) {
                $table->dropIndex('active_date_range_idx');
            }
            if (in_array('type_priority_idx', $indexes)) {
                $table->dropIndex('type_priority_idx');
            }
            if (in_array('discount_rules_stacking_type_index', $indexes)) {
                $table->dropIndex('discount_rules_stacking_type_index');
            }
            if (in_array('discount_rules_conflict_group_index', $indexes)) {
                $table->dropIndex('discount_rules_conflict_group_index');
            }
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $indexes = $this->getTableIndexes('product_variants');

            if (in_array('sku_index', $indexes)) {
                $table->dropIndex('sku_index');
            }
            if (in_array('product_active_idx', $indexes)) {
                $table->dropIndex('product_active_idx');
            }
        });

        if (Schema::hasTable('discount_rule_usages')) {
            Schema::table('discount_rule_usages', function (Blueprint $table) {
                $indexes = $this->getTableIndexes('discount_rule_usages');

                if (in_array('rule_date_idx', $indexes)) {
                    $table->dropIndex('rule_date_idx');
                }
                if (in_array('user_rule_idx', $indexes)) {
                    $table->dropIndex('user_rule_idx');
                }
            });
        }
    }

    /**
     * Get list of index names for a table
     */
    private function getTableIndexes(string $table): array
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $indexes = DB::select("PRAGMA index_list('{$table}')");
            return array_map(fn($idx) => $idx->name, $indexes);
        }

        if ($driver === 'mysql') {
            $indexes = DB::select("SHOW INDEX FROM {$table}");
            return array_unique(array_map(fn($idx) => $idx->Key_name, $indexes));
        }

        return [];
    }
};
