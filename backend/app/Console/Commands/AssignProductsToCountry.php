<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\Country;
use Illuminate\Console\Command;

class AssignProductsToCountry extends Command
{
    protected $signature = 'products:assign-country {country_code=UAE} {--all : Assign to all products, not just those without countries}';
    protected $description = 'Assign products to a country/market (UAE or KSA)';

    public function handle(): int
    {
        $countryCode = strtoupper($this->argument('country_code'));
        $assignAll = $this->option('all');

        $country = Country::where('code', $countryCode)->first();

        if (!$country) {
            $this->error("Country with code '{$countryCode}' not found.");
            $this->info("Available codes: UAE, KSA");
            return 1;
        }

        $query = Product::query();

        if (!$assignAll) {
            // Only products without any country assigned
            $query->whereDoesntHave('countries');
        }

        $products = $query->get();
        $count = $products->count();

        if ($count === 0) {
            $this->info("No products to update.");
            return 0;
        }

        $this->info("Assigning {$count} products to {$country->name} ({$countryCode})...");

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($products as $product) {
            // Use syncWithoutDetaching to add the country without removing existing ones
            $product->countries()->syncWithoutDetaching([$country->id]);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Successfully assigned {$count} products to {$country->name}.");

        return 0;
    }
}
