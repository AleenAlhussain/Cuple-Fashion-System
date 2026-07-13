<?php
require __DIR__ . "/vendor/autoload.php";
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Models\Product;

$query = Product::query()->active();

$minPrice = 100;
$maxPrice = 149;
if ($minPrice !== null || $maxPrice !== null) {
    $numericMin = is_numeric($minPrice) ? (float) $minPrice : null;
    $numericMax = is_numeric($maxPrice) ? (float) $maxPrice : null;

    $query->where(function ($priceQuery) use ($numericMin, $numericMax) {
        $priceQuery->where(function ($productPriceQuery) use ($numericMin, $numericMax) {
            if ($numericMin !== null) {
                $productPriceQuery->whereRaw("(COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) >= ?", [$numericMin]);
            }

            if ($numericMax !== null) {
                $productPriceQuery->whereRaw("(COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) <= ?", [$numericMax]);
            }
        });

        $priceQuery->orWhereHas('variants', function ($variantQuery) use ($numericMin, $numericMax) {
            if ($numericMin !== null) {
                $variantQuery->whereRaw("(COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) >= ?", [$numericMin]);
            }

            if ($numericMax !== null) {
                $variantQuery->whereRaw("(COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) <= ?", [$numericMax]);
            }
        });
    });
}

echo $query->toSql() . "\n";
print_r($query->getBindings());
$products = $query->with('categories')->limit(5)->get();
foreach ($products as $product) {
    echo $product->id . ' - ' . $product->name . "\n";
}
