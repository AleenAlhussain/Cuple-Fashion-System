<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_creator_type_check');
            DB::statement('ALTER TABLE stories ALTER COLUMN creator_type TYPE VARCHAR(100)');
            DB::statement("ALTER TABLE stories ALTER COLUMN creator_type SET DEFAULT 'admin'");
            DB::statement('ALTER TABLE stories ALTER COLUMN creator_type SET NOT NULL');
        } else {
            DB::statement("ALTER TABLE stories MODIFY creator_type VARCHAR(100) NOT NULL DEFAULT 'admin'");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE stories ALTER COLUMN creator_type TYPE VARCHAR(255)');
            DB::statement("ALTER TABLE stories ALTER COLUMN creator_type SET DEFAULT 'admin'");
            DB::statement("ALTER TABLE stories ADD CONSTRAINT stories_creator_type_check CHECK (creator_type IN ('admin', 'seller'))");
        } else {
            DB::statement("ALTER TABLE stories MODIFY creator_type ENUM('admin', 'seller') NOT NULL DEFAULT 'admin'");
        }
    }
};
