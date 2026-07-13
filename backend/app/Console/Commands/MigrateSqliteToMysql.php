<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MigrateSqliteToMysql extends Command
{
    protected $signature = 'db:migrate-sqlite-to-mysql
        {--skip=migrations,failed_jobs,job_batches : Comma-separated tables to skip}';

    protected $description = 'Copy data from SQLite connection (sqlite) to MySQL connection (mysql)';

    public function handle()
    {
        $sqlite = DB::connection('sqlite');
        $mysql  = DB::connection('mysql');

        $skip = collect(explode(',', (string) $this->option('skip')))
            ->map(fn ($t) => trim($t))
            ->filter()
            ->values()
            ->all();

        $tables = $sqlite->select("
            SELECT name FROM sqlite_master
            WHERE type='table'
              AND name NOT LIKE 'sqlite_%'
        ");

        $mysql->statement('SET FOREIGN_KEY_CHECKS=0;');

        foreach ($tables as $t) {
            $table = $t->name;

            if (in_array($table, $skip, true)) {
                $this->warn("Skipping {$table} (in skip list)");
                continue;
            }

            if (!Schema::connection('mysql')->hasTable($table)) {
                $this->warn("Skipping {$table} (not found in MySQL)");
                continue;
            }

            $this->info("Migrating: {$table}");

            $mysqlColumns = Schema::connection('mysql')->getColumnListing($table);
            $mysqlColumnFlip = array_flip($mysqlColumns);

            // تنظيف MySQL table
            try {
                $mysql->statement("TRUNCATE TABLE `{$table}`");
            } catch (\Throwable $e) {
                $mysql->table($table)->delete();
                try { $mysql->statement("ALTER TABLE `{$table}` AUTO_INCREMENT = 1"); } catch (\Throwable $e2) {}
            }

            // تحديد PK في SQLite إن وجد
            $pk = $this->getSqlitePrimaryKey($sqlite, $table);

            $inserted = 0;

            if ($pk) {
                // الأفضل: chunkById على PK
                $sqlite->table($table)
                    ->orderBy($pk)
                    ->chunkById(500, function ($batch) use ($mysql, $table, $mysqlColumnFlip, &$inserted) {
                        $payload = [];

                        foreach ($batch as $row) {
                            $arr = (array) $row;

                            $filtered = [];
                            foreach ($arr as $k => $v) {
    if (!isset($mysqlColumnFlip[$k])) {
        continue;
    }

    // normalize datetime values
    if (is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/', $v)) {
        $v = $this->normalizeMysqlDatetime($v);
    }
    // Fix NOT NULL columns that are NULL in SQLite
if ($table === 'products' && $k === 'min_stock_alert' && ($v === null || $v === '')) {
    $v = 0; // or 1 if you prefer minimum alert default
}


    $filtered[$k] = $v;
}


                            if (!empty($filtered)) $payload[] = $filtered;
                        }

                        if (!empty($payload)) {
                            try {
    $mysql->table($table)->insert($payload);
    $inserted += count($payload);
} catch (\Throwable $e) {
    // fallback: row-by-row to find the exact bad row
    foreach ($payload as $i => $row) {
        try {
            $mysql->table($table)->insert($row);
            $inserted++;
        } catch (\Throwable $e2) {
            $this->error("❌ Failed insert in table {$table} (payload index {$i})");
            $this->line("Error: ".$e2->getMessage());
            $this->line("Row: ".json_encode($row, JSON_UNESCAPED_UNICODE));
            // stop immediately so you can see the bad column/value
            throw $e2;
        }
    }
}

                        }
                    }, $pk);
            } else {
                // لا يوجد PK: استخدم rowid في SQLite
                $sqlite->table($table)
                    ->selectRaw("rowid as __rowid, *")
                    ->orderBy("__rowid")
                    ->chunkById(500, function ($batch) use ($mysql, $table, $mysqlColumnFlip, &$inserted) {
                        $payload = [];

                        foreach ($batch as $row) {
                            $arr = (array) $row;

                            // احذف __rowid لأنه غير موجود في MySQL
                            unset($arr['__rowid']);

                            $filtered = [];
                            foreach ($arr as $k => $v) {
    if (!isset($mysqlColumnFlip[$k])) {
        continue;
    }

    // normalize datetime values
    if (is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/', $v)) {
        $v = $this->normalizeMysqlDatetime($v);
    }
    // Fix NOT NULL columns that are NULL in SQLite
if ($table === 'products' && $k === 'min_stock_alert' && ($v === null || $v === '')) {
    $v = 0; // or 1 if you prefer minimum alert default
}


    $filtered[$k] = $v;
}


                            if (!empty($filtered)) $payload[] = $filtered;
                        }

                        if (!empty($payload)) {
                            try {
    $mysql->table($table)->insert($payload);
    $inserted += count($payload);
} catch (\Throwable $e) {
    // fallback: row-by-row to find the exact bad row
    foreach ($payload as $i => $row) {
        try {
            $mysql->table($table)->insert($row);
            $inserted++;
        } catch (\Throwable $e2) {
            $this->error("❌ Failed insert in table {$table} (payload index {$i})");
            $this->line("Error: ".$e2->getMessage());
            $this->line("Row: ".json_encode($row, JSON_UNESCAPED_UNICODE));
            // stop immediately so you can see the bad column/value
            throw $e2;
        }
    }
}

                        }
                    }, "__rowid");
            }

            $this->line(" - inserted {$inserted} rows");
        }

        $mysql->statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->info("All data migrated successfully ✅");
        return 0;
    }

    private function getSqlitePrimaryKey($sqlite, string $table): ?string
    {
        try {
            $cols = $sqlite->select("PRAGMA table_info(`{$table}`)");
            foreach ($cols as $c) {
                // في SQLite: pk = 1 يعني هذا العمود Primary Key
                if (!empty($c->pk)) return $c->name;
            }
        } catch (\Throwable $e) {
            // ignore
        }
        return null;
    }
    private function normalizeMysqlDatetime($v)
{
    if ($v === null) return null;
    if (!is_string($v)) return $v;

    $s = trim($v);

    // 2025-12-06T20:26:29+04:00 → 2025-12-06 20:26:29
    $s = str_replace('T', ' ', $s);
    $s = preg_replace('/(Z|[+\-]\d{2}:\d{2})$/', '', $s);
    $s = preg_replace('/\.\d+$/', '', $s);

    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
        return $s . ' 00:00:00';
    }

    if (preg_match('/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/', $s)) {
        return $s;
    }

    return null;
}

}
