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
        Schema::table('discount_rules', function (Blueprint $table) {
            // Add soft deletes
            $table->softDeletes();

            // Add index for stacking group queries
            $table->index('stacking_group');
        });

        // Add additional index for user usage queries
        Schema::table('discount_rule_usages', function (Blueprint $table) {
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropIndex(['stacking_group']);
        });

        Schema::table('discount_rule_usages', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'created_at']);
        });
    }
};
