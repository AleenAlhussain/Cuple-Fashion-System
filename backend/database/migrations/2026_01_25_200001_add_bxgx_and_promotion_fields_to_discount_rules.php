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
            // BXGX (Buy X Get X) fields - place after bundle_price
            // Note: recursive_step already exists from original migration, so only add if not exists
            if (!Schema::hasColumn('discount_rules', 'max_free_qty_per_order')) {
                $table->integer('max_free_qty_per_order')->nullable()->after('bundle_price')
                    ->comment('Maximum free items per order');
            }
            if (!Schema::hasColumn('discount_rules', 'max_applications_per_order')) {
                $table->integer('max_applications_per_order')->nullable()->after('bundle_price')
                    ->comment('Maximum times this rule can be applied per order');
            }

            // Promotion Message fields - place after offer_message
            if (!Schema::hasColumn('discount_rules', 'promotion_subtotal_from')) {
                $table->decimal('promotion_subtotal_from', 10, 2)->nullable()->after('offer_message')
                    ->comment('Subtotal threshold to start showing promotion message');
            }
            if (!Schema::hasColumn('discount_rules', 'promotion_subtotal_source')) {
                $table->string('promotion_subtotal_source', 50)->default('entire_cart_subtotal')->after('offer_message')
                    ->comment('eligible_items_subtotal or entire_cart_subtotal');
            }
            if (!Schema::hasColumn('discount_rules', 'promotion_message_template')) {
                $table->string('promotion_message_template', 500)->nullable()->after('offer_message')
                    ->comment('Message template with {difference_amount} placeholder');
            }
            if (!Schema::hasColumn('discount_rules', 'promotion_message_template_ar')) {
                $table->string('promotion_message_template_ar', 500)->nullable()->after('offer_message')
                    ->comment('Arabic message template with {difference_amount} placeholder');
            }
        });

        // Add 'both' option to filter targets
        Schema::table('discount_rule_filters', function (Blueprint $table) {
            // The target column should already exist, we just need to ensure 'both' is a valid value
            // If using enum, we might need to modify it. For now, we'll assume it's a string column.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->dropColumn([
                'recursive_step',
                'max_free_qty_per_order',
                'max_applications_per_order',
                'promotion_subtotal_from',
                'promotion_subtotal_source',
                'promotion_message_template',
                'promotion_message_template_ar',
            ]);
        });
    }
};
