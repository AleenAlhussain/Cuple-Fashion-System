<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->enum('sales_channel', ['online', 'store'])->default('online')->after('user_id');
            $table->foreignId('created_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->after('sales_channel');

            $table->index('sales_channel');
            $table->index('created_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['sales_channel']);
            $table->dropIndex(['created_by_user_id']);

            $table->dropConstrainedForeignId('created_by_user_id');
            $table->dropColumn('sales_channel');
        });
    }
};
