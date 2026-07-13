<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('discount_rule_filters')) {
            return;
        }

        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE discount_rule_filters DROP CONSTRAINT IF EXISTS discount_rule_filters_filter_type_check');
            DB::statement('ALTER TABLE discount_rule_filters ALTER COLUMN filter_type TYPE VARCHAR(100)');
            return;
        }

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE `discount_rule_filters` MODIFY `filter_type` VARCHAR(100) NOT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('discount_rule_filters')) {
            return;
        }

        $driver = DB::getDriverName();
        $legacyValues = "'variant_sku','variant_id','product_id','category','tag','attribute'";

        if ($driver === 'pgsql') {
            DB::statement("UPDATE discount_rule_filters SET filter_type = 'attribute' WHERE filter_type NOT IN ({$legacyValues})");
            DB::statement('ALTER TABLE discount_rule_filters DROP CONSTRAINT IF EXISTS discount_rule_filters_filter_type_check');
            DB::statement("ALTER TABLE discount_rule_filters ADD CONSTRAINT discount_rule_filters_filter_type_check CHECK (filter_type IN ({$legacyValues}))");
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("UPDATE discount_rule_filters SET filter_type = 'attribute' WHERE filter_type NOT IN ({$legacyValues})");
            DB::statement("ALTER TABLE `discount_rule_filters` MODIFY `filter_type` ENUM({$legacyValues}) NOT NULL");
        }
    }
};
