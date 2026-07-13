<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://cuple.shop',
        'https://www.cuple.shop',
        'https://admin.cuple.shop',
        'https://dev.admin.cuple.shop',
        'https://www.dev.admin.cuple.shop',
        'http://dev.admin.cuple.shop',
        'http://www.dev.admin.cuple.shop',
        'https://dev.cuple.shop',
        'https://www.dev.cuple.shop',
        'http://dev.cuple.shop',
        'http://www.dev.cuple.shop',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
    ],

    // Allow any localhost port and local network IPs for development
    'allowed_origins_patterns' => [
        '/^http:\/\/localhost:\d+$/',
        '/^http:\/\/127\.0\.0\.1:\d+$/',
        '/^http:\/\/172\.\d+\.\d+\.\d+:\d+$/',
        '/^http:\/\/192\.168\.\d+\.\d+:\d+$/',
        '/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
