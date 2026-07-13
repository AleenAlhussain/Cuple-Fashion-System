<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Http\Request;
use App\Http\Controllers\Api\ProductController;

Request::enableHttpMethodParameterOverride();
$req = Request::create('/website/products','GET',[
    'category' => 'flat',
    'min_price' => 100,
    'max_price' => 149,
]);
$controller = new ProductController();
$response = $controller->index($req);
echo $response->getContent();
