<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('point_transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('point_transactions', 'balance_before')) {
                $table->decimal('balance_before', 10, 2)->default(0)->after('type');
            }
            if (!Schema::hasColumn('point_transactions', 'balance_after')) {
                $table->decimal('balance_after', 10, 2)->default(0)->after('balance_before');
            }
            if (!Schema::hasColumn('point_transactions', 'admin_id')) {
                $table->foreignId('admin_id')->nullable()->constrained('users')->onDelete('set null')->after('created_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('point_transactions', function (Blueprint $table) {
            if (Schema::hasColumn('point_transactions', 'admin_id')) {
                $table->dropConstrainedForeignId('admin_id');
            }
            if (Schema::hasColumn('point_transactions', 'balance_after')) {
                $table->dropColumn('balance_after');
            }
            if (Schema::hasColumn('point_transactions', 'balance_before')) {
                $table->dropColumn('balance_before');
            }
        });
    }
};
