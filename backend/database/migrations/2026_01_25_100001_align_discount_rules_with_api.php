<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Aligns discount_rules table with API expectations.
     */
    public function up(): void
    {
        // For SQLite compatibility, handle the index before renaming
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            // SQLite: rebuild table with new column names
            $this->migrateForSqlite();
        } else {
            // MySQL/PostgreSQL: use standard rename
            $this->migrateForStandardDb();
        }
    }

    private function migrateForSqlite(): void
    {
        // Add new columns first (SQLite can add columns)
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->string('internal_code', 100)->nullable()->after('name');
            $table->boolean('is_stackable')->default(true)->after('stacking_group');
            $table->datetime('starts_at')->nullable()->after('is_stackable');
            $table->datetime('ends_at')->nullable()->after('starts_at');
            $table->integer('buy_qty')->nullable()->after('max_applications');
            $table->integer('get_qty')->nullable()->after('buy_qty');
            $table->integer('bundle_qty')->nullable()->after('get_qty');
            $table->decimal('bundle_price', 10, 2)->nullable()->after('bundle_qty');
        });

        // Rename columns (SQLite with doctrine/dbal can handle this)
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->renameColumn('type', 'rule_type');
            $table->renameColumn('message', 'offer_message');
            $table->renameColumn('recursive', 'is_recursive');
        });

        // Add index after rename
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->index('rule_type', 'discount_rules_rule_type_index');
        });
    }

    private function migrateForStandardDb(): void
    {
        // Drop old index first (if it exists) - use raw SQL to avoid transaction abort
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS discount_rules_type_index');
        } else {
            // MySQL
            $indexExists = DB::select("SHOW INDEX FROM discount_rules WHERE Key_name = 'discount_rules_type_index'");
            if (!empty($indexExists)) {
                Schema::table('discount_rules', function (Blueprint $table) {
                    $table->dropIndex(['type']);
                });
            }
        }

        // Rename columns
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->renameColumn('type', 'rule_type');
            $table->renameColumn('message', 'offer_message');
            $table->renameColumn('recursive', 'is_recursive');
        });

        // Add new columns and index
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->string('internal_code', 100)->nullable()->unique()->after('name');
            $table->boolean('is_stackable')->default(true)->after('stacking_group');
            $table->datetime('starts_at')->nullable()->after('is_stackable');
            $table->datetime('ends_at')->nullable()->after('starts_at');
            $table->integer('buy_qty')->nullable()->after('max_applications');
            $table->integer('get_qty')->nullable()->after('buy_qty');
            $table->integer('bundle_qty')->nullable()->after('get_qty');
            $table->decimal('bundle_price', 10, 2)->nullable()->after('bundle_qty');
            $table->index('rule_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            // Drop new columns
            $table->dropColumn([
                'internal_code',
                'is_stackable',
                'starts_at',
                'ends_at',
                'buy_qty',
                'get_qty',
                'bundle_qty',
                'bundle_price',
            ]);
        });

        // Drop new index if exists
        try {
            Schema::table('discount_rules', function (Blueprint $table) {
                $table->dropIndex(['rule_type']);
            });
        } catch (\Exception $e) {
            // Index might not exist
        }

        Schema::table('discount_rules', function (Blueprint $table) {
            // Rename columns back
            $table->renameColumn('rule_type', 'type');
            $table->renameColumn('offer_message', 'message');
            $table->renameColumn('is_recursive', 'recursive');
        });

        // Re-add old index
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->index('type');
        });
    }
};
