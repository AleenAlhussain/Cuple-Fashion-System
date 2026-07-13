<?php

use App\Console\Commands\SyncAramexShippingStatusesCommand;
use App\Services\AramexStatusMappingImporter;
use Illuminate\Console\Application as ConsoleApplication;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('aramex:import-statuses {--overwrite}', function (AramexStatusMappingImporter $importer) {
    $overwrite = (bool) $this->option('overwrite');
    $result = $importer->import($overwrite);

    if (!$result['success']) {
        $this->error($result['message']);
        return;
    }

    $this->info(sprintf('Imported %d mappings and updated %d existing ones.', $result['created'], $result['updated']));

    if ($result['skipped'] > 0) {
        $this->warn("Skipped {$result['skipped']} row(s) due to missing code or name.");
    }

    if ($result['manual_skipped'] > 0 && !$overwrite) {
        $this->warn("{$result['manual_skipped']} mapping(s) kept because they were manually edited. Use --overwrite to replace them.");
    }
});

ConsoleApplication::starting(function (ConsoleApplication $artisan) {
    $artisan->resolve(SyncAramexShippingStatusesCommand::class);
});

app(Schedule::class)->command('aramex:sync-statuses')->everyThirtyMinutes()->withoutOverlapping();
