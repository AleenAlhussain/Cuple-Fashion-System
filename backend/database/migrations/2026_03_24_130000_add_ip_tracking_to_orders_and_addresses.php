<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('client_ip', 45)->nullable()->after('coupon_code');
            $table->string('shipping_address_ip', 45)->nullable()->after('shipping_country');
            $table->string('billing_address_ip', 45)->nullable()->after('billing_country');
        });

        Schema::table('addresses', function (Blueprint $table) {
            $table->string('ip_address', 45)->nullable()->after('country_code');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'client_ip',
                'shipping_address_ip',
                'billing_address_ip',
            ]);
        });

        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn('ip_address');
        });
    }
};
