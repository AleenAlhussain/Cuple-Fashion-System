<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_rates', function (Blueprint $table) {
            if (!Schema::hasColumn('shipping_rates', 'fee_method')) {
                $table->string('fee_method')->nullable()->after('shipping_type');
            }

            if (!Schema::hasColumn('shipping_rates', 'min_item_qty')) {
                $table->unsignedInteger('min_item_qty')->nullable()->after('max_order_amount');
            }

            if (!Schema::hasColumn('shipping_rates', 'max_item_qty')) {
                $table->unsignedInteger('max_item_qty')->nullable()->after('min_item_qty');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shipping_rates', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('shipping_rates', 'fee_method')) {
                $columns[] = 'fee_method';
            }
            if (Schema::hasColumn('shipping_rates', 'min_item_qty')) {
                $columns[] = 'min_item_qty';
            }
            if (Schema::hasColumn('shipping_rates', 'max_item_qty')) {
                $columns[] = 'max_item_qty';
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
