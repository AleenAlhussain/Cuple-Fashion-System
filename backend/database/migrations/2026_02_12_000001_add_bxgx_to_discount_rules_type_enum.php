<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add 'bxgx' to the allowed values for the rule_type column.
     * The original enum was created with only: product, cart, bulk, bundle, bogo.
     * The column was later renamed from 'type' to 'rule_type'.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL: drop the existing CHECK constraint and add a new one.
            // The constraint name may be either the original (type) or renamed (rule_type).
            DB::statement("ALTER TABLE discount_rules DROP CONSTRAINT IF EXISTS discount_rules_type_check");
            DB::statement("ALTER TABLE discount_rules DROP CONSTRAINT IF EXISTS discount_rules_rule_type_check");
            DB::statement("ALTER TABLE discount_rules ADD CONSTRAINT discount_rules_rule_type_check CHECK (rule_type::text = ANY (ARRAY['product'::text, 'cart'::text, 'bulk'::text, 'bundle'::text, 'bogo'::text, 'bxgx'::text]))");
        } elseif ($driver === 'mysql') {
            // MySQL: modify the ENUM column to include 'bxgx'
            DB::statement("ALTER TABLE discount_rules MODIFY rule_type ENUM('product', 'cart', 'bulk', 'bundle', 'bogo', 'bxgx') NOT NULL");
        }
        // SQLite: no enum constraints to update
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE discount_rules DROP CONSTRAINT IF EXISTS discount_rules_rule_type_check");
            DB::statement("ALTER TABLE discount_rules ADD CONSTRAINT discount_rules_rule_type_check CHECK (rule_type::text = ANY (ARRAY['product'::text, 'cart'::text, 'bulk'::text, 'bundle'::text, 'bogo'::text]))");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE discount_rules MODIFY rule_type ENUM('product', 'cart', 'bulk', 'bundle', 'bogo') NOT NULL");
        }
    }
};
