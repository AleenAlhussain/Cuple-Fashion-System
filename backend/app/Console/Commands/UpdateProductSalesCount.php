<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class UpdateProductSalesCount extends Command
{
    protected $signature = 'products:update-sales';
    protected $description = 'Update total_sold column for all products based on order data';

    public function handle()
    {
        $this->info('Updating product sales counts...');

        $updated = DB::statement("
            UPDATE products p
            SET total_sold = (
                SELECT COALESCE(SUM(oi.quantity), 0)
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE oi.product_id = p.id
                AND o.status IN ('delivered', 'shipped', 'processing', 'confirmed')
                AND o.deleted_at IS NULL
            )
        ");

        // Clear homepage cache after update
        \Illuminate\Support\Facades\Cache::forget('homepage_data_v2');

        $this->info('Product sales counts updated successfully!');
        return Command::SUCCESS;
    }
}
