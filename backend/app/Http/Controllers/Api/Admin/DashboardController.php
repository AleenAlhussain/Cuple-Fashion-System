<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use Illuminate\Support\Facades\DB;

class DashboardController extends BaseController
{
    public function badge()
    {
        $pendingOrders = DB::table('orders')
            ->whereNull('deleted_at')
            ->where('status', 'pending')
            ->count();

        $lowStockProducts = DB::table('products')
            ->whereNull('deleted_at')
            ->where('is_active', 1)
            ->where('stock_quantity', '<=', 5)
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'pending_orders' => (int) $pendingOrders,
                'low_stock_products' => (int) $lowStockProducts,
            ],
        ]);
    }
}
