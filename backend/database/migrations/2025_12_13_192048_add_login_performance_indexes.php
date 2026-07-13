<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add index on personal_access_tokens for faster token cleanup
        // Only if tables exist (Sanctum/points may not be installed)
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            // For SQLite, check if index exists
            if (Schema::hasTable('personal_access_tokens')) {
                $tokenIndex = DB::select("SELECT name FROM sqlite_master WHERE type='index' AND name='pat_tokenable_created_index'");
                if (empty($tokenIndex)) {
                    DB::statement('CREATE INDEX pat_tokenable_created_index ON personal_access_tokens (tokenable_type, tokenable_id, created_at)');
                }
            }

            if (Schema::hasTable('points')) {
                $pointsIndex = DB::select("SELECT name FROM sqlite_master WHERE type='index' AND name='points_user_id_index'");
                if (empty($pointsIndex)) {
                    DB::statement('CREATE INDEX points_user_id_index ON points (user_id)');
                }
            }
        } else {
            // For MySQL/PostgreSQL - check if tables exist first
            if (Schema::hasTable('personal_access_tokens')) {
                Schema::table('personal_access_tokens', function (Blueprint $table) {
                    $table->index(['tokenable_type', 'tokenable_id', 'created_at'], 'pat_tokenable_created_index');
                });
            }

            if (Schema::hasTable('points')) {
                Schema::table('points', function (Blueprint $table) {
                    $table->index('user_id', 'points_user_id_index');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS pat_tokenable_created_index');
            DB::statement('DROP INDEX IF EXISTS points_user_id_index');
        } else {
            if (Schema::hasTable('personal_access_tokens')) {
                Schema::table('personal_access_tokens', function (Blueprint $table) {
                    $table->dropIndex('pat_tokenable_created_index');
                });
            }

            if (Schema::hasTable('points')) {
                Schema::table('points', function (Blueprint $table) {
                    $table->dropIndex('points_user_id_index');
                });
            }
        }
    }
};
