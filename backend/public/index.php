<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

// PHP 8.5 deprecates several PDO::MYSQL_* constants that Laravel/vendor packages
// still reference in config files. Left unfiltered, those E_DEPRECATED notices are
// echoed straight into the response body before any headers are sent, which causes
// PHP to emit the response with default headers and silently drop everything the
// framework tries to set afterward (Content-Type, CORS, etc).
error_reporting(E_ALL & ~E_DEPRECATED);

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
