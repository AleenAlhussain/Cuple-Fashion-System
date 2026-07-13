<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'customer', 'shop_manager') DEFAULT 'customer'");
        } elseif ($driver === 'pgsql') {
            // For PostgreSQL, we need to alter the enum type
            // First check if shop_manager already exists in the enum
            $exists = DB::select("
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'shop_manager'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_check')
            ");

            if (empty($exists)) {
                // PostgreSQL: Add new value to enum type
                // Since role might be a check constraint, let's just update to allow the new value
                DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
                DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'customer', 'shop_manager'))");
            }
        }
        // SQLite: no action needed as it doesn't enforce enum values strictly
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'customer') DEFAULT 'customer'");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'customer'))");
        }
    }
};
