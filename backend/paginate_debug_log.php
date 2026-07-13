<?php
require __DIR__ . "/vendor/autoload.php";
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Models\Product;
use Illuminate\Support\Facades\DB;

DB::enableQueryLog();

$numericMin = 100;
$numericMax = 149;

$query = Product::with('categories')
    ->active()
    ->whereHas('categories', function ($q) {
        $q->where('categories.slug', 'flat');
    })
    ->where(function ($priceQuery) use ($numericMin, $numericMax) {
        $priceQuery->where(function ($productPriceQuery) use ($numericMin, $numericMax) {
            $productPriceQuery->whereRaw("(COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) >= ?", [$numericMin]);
            $productPriceQuery->whereRaw("(COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) <= ?", [$numericMax]);
        })
        ->orWhereHas('variants', function ($variantQuery) use ($numericMin, $numericMax) {
            $variantQuery->whereRaw("(COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) >= ?", [$numericMin]);
            $variantQuery->whereRaw("(COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) <= ?", [$numericMax]);
        });
    });

$paginator = $query->paginate(12);
print_r(DB::getQueryLog());
