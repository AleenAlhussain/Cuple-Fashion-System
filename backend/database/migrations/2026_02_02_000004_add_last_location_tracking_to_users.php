<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('last_ip', 45)->nullable()->after('last_login_at');
            $table->decimal('last_latitude', 10, 7)->nullable()->after('last_ip');
            $table->decimal('last_longitude', 10, 7)->nullable()->after('last_latitude');
            $table->text('last_location_address')->nullable()->after('last_longitude');
            $table->timestamp('last_location_at')->nullable()->after('last_location_address');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'last_location_at',
                'last_location_address',
                'last_longitude',
                'last_latitude',
                'last_ip',
            ]);
        });
    }
};
