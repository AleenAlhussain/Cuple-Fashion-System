<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'secret' => env('STRIPE_SECRET'),
        'publishable' => env('STRIPE_PUBLISHABLE_KEY'),
        'currency' => env('STRIPE_CURRENCY', 'aed'),
    ],

    'geo' => [
        'reverse_url' => env('GEO_REVERSE_URL', 'https://nominatim.openstreetmap.org/reverse'),
        'timeout' => env('GEO_REVERSE_TIMEOUT', 10),
        'user_agent' => env('GEO_USER_AGENT', 'CupleShop/1.0 (support@cuple.shop)'),
        'referer' => env('GEO_REFERER', env('APP_URL')),
        'email' => env('GEO_EMAIL', 'support@cuple.shop'),
    ],

    'whatsapp' => [
        'enabled' => env('WHATSAPP_ENABLED', false),
        'zapier_webhook_url' => env('WHATSAPP_ZAPIER_WEBHOOK_URL'), // legacy fallback
        'zapier_login_webhook_url' => env('WHATSAPP_ZAPIER_LOGIN_WEBHOOK_URL'),
        'zapier_order_webhook_url' => env('WHATSAPP_ZAPIER_ORDER_WEBHOOK_URL'),
        'template_name' => env('WHATSAPP_ZAPIER_TEMPLATE_NAME', 'code_login_v1'),
        'template_language' => env('WHATSAPP_ZAPIER_TEMPLATE_LANGUAGE', 'en'),
        'timeout' => env('WHATSAPP_TIMEOUT', 15),
    ],

];
