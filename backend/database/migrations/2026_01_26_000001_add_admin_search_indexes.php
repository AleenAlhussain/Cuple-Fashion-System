<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $indexes = [
                'orders_shipping_phone_index' => 'CREATE INDEX orders_shipping_phone_index ON orders (shipping_phone)',
                'orders_shipping_email_index' => 'CREATE INDEX orders_shipping_email_index ON orders (shipping_email)',
                'orders_transaction_id_index' => 'CREATE INDEX orders_transaction_id_index ON orders (transaction_id)',
                'orders_billing_phone_index' => 'CREATE INDEX orders_billing_phone_index ON orders (billing_phone)',
                'users_phone_index' => 'CREATE INDEX users_phone_index ON users (phone)',
            ];

            foreach ($indexes as $indexName => $sql) {
                $existingIndex = DB::select("SELECT name FROM sqlite_master WHERE type='index' AND name=?", [$indexName]);
                if (empty($existingIndex)) {
                    try {
                        DB::statement($sql);
                    } catch (\Exception $e) {
                        // Ignore if table or index doesn't exist yet
                    }
                }
            }
        } else {
            Schema::table('orders', function (Blueprint $table) {
                $table->index('shipping_phone', 'orders_shipping_phone_index');
                $table->index('shipping_email', 'orders_shipping_email_index');
                $table->index('transaction_id', 'orders_transaction_id_index');
                $table->index('billing_phone', 'orders_billing_phone_index');
            });

            Schema::table('users', function (Blueprint $table) {
                $table->index('phone', 'users_phone_index');
            });
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $indexes = [
                'orders_shipping_phone_index',
                'orders_shipping_email_index',
                'orders_transaction_id_index',
                'orders_billing_phone_index',
                'users_phone_index',
            ];

            foreach ($indexes as $indexName) {
                DB::statement("DROP INDEX IF EXISTS {$indexName}");
            }
        } else {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropIndex('orders_shipping_phone_index');
                $table->dropIndex('orders_shipping_email_index');
                $table->dropIndex('orders_transaction_id_index');
                $table->dropIndex('orders_billing_phone_index');
            });

            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex('users_phone_index');
            });
        }
    }
};
