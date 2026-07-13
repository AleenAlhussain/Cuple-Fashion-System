<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('email');
            $table->string('country_code', 10)->default('+971')->after('phone');
            $table->foreignId('country_id')->nullable()->after('country_code')->constrained();
            $table->string('avatar')->nullable()->after('country_id');
            $table->enum('role', ['admin', 'customer'])->default('customer')->after('avatar');
            $table->boolean('is_active')->default(true)->after('role');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['country_id']);
            $table->dropColumn(['phone', 'country_code', 'country_id', 'avatar', 'role', 'is_active', 'last_login_at', 'deleted_at']);
        });
    }
};
