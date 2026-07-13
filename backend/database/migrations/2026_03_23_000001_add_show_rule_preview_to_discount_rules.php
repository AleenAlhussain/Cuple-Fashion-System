<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            if (!Schema::hasColumn('discount_rules', 'show_rule_preview')) {
                $table->boolean('show_rule_preview')->default(true)->after('promotion_message_template_ar');
            }
        });
    }

    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            if (Schema::hasColumn('discount_rules', 'show_rule_preview')) {
                $table->dropColumn('show_rule_preview');
            }
        });
    }
};
