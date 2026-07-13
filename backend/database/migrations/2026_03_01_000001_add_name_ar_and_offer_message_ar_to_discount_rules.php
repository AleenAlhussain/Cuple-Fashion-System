<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            if (!Schema::hasColumn('discount_rules', 'name_ar')) {
                $table->string('name_ar')->nullable()->after('name');
            }

            if (!Schema::hasColumn('discount_rules', 'offer_message_ar')) {
                $table->string('offer_message_ar', 500)->nullable()->after('offer_message');
            }
        });

        // Backfill Arabic values for existing rules to avoid empty frontend content.
        DB::table('discount_rules')
            ->where(function ($query) {
                $query->whereNull('name_ar')->orWhere('name_ar', '');
            })
            ->update([
                'name_ar' => DB::raw("COALESCE(NULLIF(description_ar, ''), name)"),
            ]);

        DB::table('discount_rules')
            ->where(function ($query) {
                $query->whereNull('offer_message_ar')->orWhere('offer_message_ar', '');
            })
            ->update([
                'offer_message_ar' => DB::raw("offer_message"),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            if (Schema::hasColumn('discount_rules', 'offer_message_ar')) {
                $table->dropColumn('offer_message_ar');
            }

            if (Schema::hasColumn('discount_rules', 'name_ar')) {
                $table->dropColumn('name_ar');
            }
        });
    }
};
