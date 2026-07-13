<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->string('name')->nullable()->after('user_id');
            $table->foreignId('state_id')->nullable()->after('state')->constrained('states')->nullOnDelete();
            $table->text('address_line')->nullable()->after('street');
            $table->text('formatted_address')->nullable()->after('address_line');
            $table->decimal('latitude', 10, 7)->nullable()->after('formatted_address');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->foreignId('city_id')->nullable()->after('city')->constrained('cities')->nullOnDelete();
            $table->index('city_id');
        });
    }

    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropForeign(['city_id']);
            $table->dropForeign(['state_id']);
            $table->dropIndex(['city_id']);
            $table->dropColumn(['city_id', 'state_id', 'name', 'address_line', 'formatted_address', 'latitude', 'longitude']);
        });
    }
};
