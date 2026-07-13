<?php

return [
    'username' => env('ARAMEX_USERNAME'),
    'password' => env('ARAMEX_PASSWORD'),

    // الأفضل نعتمد على WSDL مباشرة (لـ SoapClient)
    'wsdl' => env('ARAMEX_SHIP_WSDL', 'https://ws.aramex.net/shippingapi.v2/shipping/service_1_0.svc?wsdl'),

    // (اختياري) endpoints لو احتجتها بغير مكان
    'shipping_url' => env('ARAMEX_SHIPPING_URL', 'https://ws.aramex.net/shippingapi.v2/shipping/service_1_0.svc'),
    'tracking_url' => env('ARAMEX_TRACKING_URL', 'https://ws.aramex.net/shippingapi/tracking/service_1_0.svc'),

    'account' => [
        'number' => env('ARAMEX_ACCOUNT_NUMBER'),
        'pin' => env('ARAMEX_ACCOUNT_PIN'),
        'entity' => env('ARAMEX_ACCOUNT_ENTITY'),
        'country_code' => env('ARAMEX_ACCOUNT_COUNTRY_CODE'),
    ],

    'return_account_number' => env('ARAMEX_RETURN_ACCOUNT_NUMBER'),
    'base_url' => env('ARAMEX_BASE_URL', 'https://ws.aramex.net'),
    'create_pickup_url' => env('ARAMEX_CREATE_PICKUP_URL'),
    'pickup_retry_attempts' => env('ARAMEX_PICKUP_RETRY_ATTEMPTS', 5),

    'status_mapping_path' => storage_path('app/aramex/Status Codes - Last Mile.xls'),

    'status_mapping_defaults' => [
        'stage' => env('ARAMEX_STATUS_DEFAULT_STAGE', 'PROCESSING'),
        'severity' => env('ARAMEX_STATUS_DEFAULT_SEVERITY', 'info'),
        'customer_title_en' => env('ARAMEX_STATUS_DEFAULT_TITLE_EN', 'Your shipment is on its way'),
        'customer_message_en' => env('ARAMEX_STATUS_DEFAULT_MESSAGE_EN', 'We received an update from Aramex and we are sharing it with you.'),
        'customer_title_ar' => env('ARAMEX_STATUS_DEFAULT_TITLE_AR', 'الشحنة في الطريق'),
        'customer_message_ar' => env('ARAMEX_STATUS_DEFAULT_MESSAGE_AR', 'تم استلام تحديث من أرامكس وسنوافيك بالتفاصيل قريبًا.'),
    ],

    'status_mapping_fallback' => [
        'en' => [
            'title' => env('ARAMEX_STATUS_FALLBACK_TITLE_EN', 'Shipment is being processed'),
            'message' => env('ARAMEX_STATUS_FALLBACK_MESSAGE_EN', 'We are waiting for the latest confirmation from Aramex.'),
            'stage' => env('ARAMEX_STATUS_FALLBACK_STAGE_EN', 'PROCESSING'),
            'severity' => env('ARAMEX_STATUS_FALLBACK_SEVERITY_EN', 'warn'),
        ],
        'ar' => [
            'title' => env('ARAMEX_STATUS_FALLBACK_TITLE_AR', 'جارٍ معالجة الشحنة'),
            'message' => env('ARAMEX_STATUS_FALLBACK_MESSAGE_AR', 'ننتظر البيانات الأخيرة من أرامكس وسنوافيك بالتحديثات فور توفرها.'),
            'stage' => env('ARAMEX_STATUS_FALLBACK_STAGE_AR', 'PROCESSING'),
            'severity' => env('ARAMEX_STATUS_FALLBACK_SEVERITY_AR', 'warn'),
        ],
    ],
];



