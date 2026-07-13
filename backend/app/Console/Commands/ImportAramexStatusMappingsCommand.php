<?php

namespace App\Console\Commands;

use App\Services\AramexStatusMappingImporter;
use Illuminate\Console\Command;

class ImportAramexStatusMappingsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'aramex:import-statuses {--overwrite : Replace manual edits as well}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import the Aramex tracking status codes from the official Excel sheet';

    /**
     * Execute the console command.
     */
    public function handle(AramexStatusMappingImporter $importer)
    {
        $overwrite = (bool) $this->option('overwrite');
        $result = $importer->import($overwrite);

        if (!$result['success']) {
            $this->error($result['message']);
            return Command::FAILURE;
        }

        $this->info(sprintf('Imported %d new mappings and updated %d existing ones.', $result['created'], $result['updated']));

        if ($result['skipped'] > 0) {
            $this->warn("Skipped {$result['skipped']} row(s) because of missing code/name");
        }

        if ($result['manual_skipped'] > 0 && !$overwrite) {
            $this->warn("{$result['manual_skipped']} mapping(s) were left untouched because they were manually edited. Rerun with --overwrite to replace them.");
        }

        return Command::SUCCESS;
    }
}
