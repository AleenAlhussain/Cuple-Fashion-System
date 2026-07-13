<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, modify the enum to include new filter types
        // For SQLite, we need to recreate the table or use a workaround
        // For now, we'll change the column to a string type for more flexibility
        Schema::table('discount_rule_filters', function (Blueprint $table) {
            // Add secondary columns
            if (!Schema::hasColumn('discount_rule_filters', 'secondary_type')) {
                $table->string('secondary_type')->nullable()->after('filter_values');
            }
            if (!Schema::hasColumn('discount_rule_filters', 'secondary_values')) {
                $table->json('secondary_values')->nullable()->after('secondary_type');
            }
        });

        // Change filter_type from enum to string for flexibility with new types
        // This is needed for SQLite which doesn't support modifying enums easily
        if (DB::getDriverName() === 'sqlite') {
            // SQLite workaround: Create a new table, copy data, drop old, rename new
            DB::statement('PRAGMA foreign_keys=OFF');

            Schema::create('discount_rule_filters_new', function (Blueprint $table) {
                $table->id();
                $table->foreignId('discount_rule_id')->constrained()->onDelete('cascade');
                $table->enum('target', ['buy', 'get', 'both'])->default('both');
                $table->string('filter_type'); // Changed from enum to string
                $table->json('filter_values');
                $table->string('secondary_type')->nullable();
                $table->json('secondary_values')->nullable();
                $table->boolean('is_exclude')->default(false);
                $table->timestamps();

                $table->index('discount_rule_id');
                $table->index(['discount_rule_id', 'target']);
            });

            // Copy existing data
            DB::statement('INSERT INTO discount_rule_filters_new (id, discount_rule_id, target, filter_type, filter_values, is_exclude, created_at, updated_at) SELECT id, discount_rule_id, target, filter_type, filter_values, is_exclude, created_at, updated_at FROM discount_rule_filters');

            Schema::drop('discount_rule_filters');
            Schema::rename('discount_rule_filters_new', 'discount_rule_filters');

            DB::statement('PRAGMA foreign_keys=ON');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discount_rule_filters', function (Blueprint $table) {
            if (Schema::hasColumn('discount_rule_filters', 'secondary_type')) {
                $table->dropColumn('secondary_type');
            }
            if (Schema::hasColumn('discount_rule_filters', 'secondary_values')) {
                $table->dropColumn('secondary_values');
            }
        });
    }
};
