<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $upRoles = ['admin', 'customer', 'shop_manager', 'stock_keeper', 'accounting_team'];
    private array $downRoles = ['admin', 'customer', 'shop_manager'];

    public function up(): void
    {
        $this->updateRoleConstraint($this->upRoles);
    }

    public function down(): void
    {
        DB::table('users')
            ->whereIn('role', ['stock_keeper', 'accounting_team'])
            ->update(['role' => 'shop_manager']);

        $this->updateRoleConstraint($this->downRoles);
    }

    private function updateRoleConstraint(array $roles): void
    {
        $driver = DB::getDriverName();
        $quotedRoles = implode(',', array_map(fn ($role) => "'{$role}'", $roles));

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE users MODIFY role ENUM({$quotedRoles}) DEFAULT 'customer'");
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ({$quotedRoles}))");
            return;
        }
    }
};
