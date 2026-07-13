<?php

namespace App\Console\Commands;

use App\Services\CacheService;
use Illuminate\Console\Command;

class CacheManage extends Command
{
    protected $signature = 'cache:manage {action : clear-all|clear-products|clear-homepage|stats|warmup}';
    protected $description = 'Manage application caches';

    public function handle()
    {
        $action = $this->argument('action');

        switch ($action) {
            case 'clear-all':
                CacheService::clearAll();
                $this->info('All caches cleared!');
                break;

            case 'clear-products':
                CacheService::clearProductCaches();
                $this->info('Product caches cleared!');
                break;

            case 'clear-homepage':
                \Illuminate\Support\Facades\Cache::forget('homepage_data_v2');
                $this->info('Homepage cache cleared!');
                break;

            case 'stats':
                $stats = CacheService::getStats();
                $this->info('Cache Configuration:');
                $this->table(['Setting', 'Value'], [
                    ['Driver', $stats['driver']],
                    ['Prefix', $stats['prefix']],
                    ['TTL Short', $stats['ttl_settings']['short'] . 's'],
                    ['TTL Medium', $stats['ttl_settings']['medium'] . 's'],
                    ['TTL Long', $stats['ttl_settings']['long'] . 's'],
                    ['TTL Very Long', $stats['ttl_settings']['very_long'] . 's'],
                ]);
                break;

            case 'warmup':
                $this->info('Warming up caches...');
                $this->warmupCaches();
                $this->info('Cache warmup complete!');
                break;

            default:
                $this->error("Unknown action: {$action}");
                $this->info('Available actions: clear-all, clear-products, clear-homepage, stats, warmup');
                return 1;
        }

        return 0;
    }

    private function warmupCaches(): void
    {
        // Warmup homepage cache
        $this->line('  - Warming homepage cache...');
        app(\App\Http\Controllers\Api\SettingsController::class)->homepage(new \Illuminate\Http\Request());

        // Warmup theme options
        $this->line('  - Warming theme options cache...');
        app(\App\Http\Controllers\Api\SettingsController::class)->themeOptions(new \Illuminate\Http\Request());

        // Warmup first page of products
        $this->line('  - Warming products cache...');
        $request = new \Illuminate\Http\Request();
        $request->merge(['paginate' => 12]);
        app(\App\Http\Controllers\Api\ProductController::class)->index($request);
    }
}
