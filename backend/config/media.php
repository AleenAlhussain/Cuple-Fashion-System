<?php

return [
    /*
    |--------------------------------------------------------------------------
    | External Product Image Localization
    |--------------------------------------------------------------------------
    |
    | When enabled, incoming external product image URLs are downloaded and
    | stored on the local public disk under attachments/.
    |
    */
    'localize_external' => env('MEDIA_LOCALIZE_EXTERNAL', true),

    /*
    |--------------------------------------------------------------------------
    | Allowed External Hosts
    |--------------------------------------------------------------------------
    |
    | Comma-separated list of host patterns allowed for downloading external
    | media, e.g. "cuple.ae,*.cuple.ae".
    | Leave empty to allow any external host.
    |
    */
    'allowed_external_hosts' => array_values(array_filter(array_map(
        static fn ($host) => trim((string) $host),
        explode(',', (string) env('MEDIA_ALLOWED_EXTERNAL_HOSTS', ''))
    ))),

    /*
    |--------------------------------------------------------------------------
    | Download Safeguards
    |--------------------------------------------------------------------------
    */
    'max_file_size_mb' => max(1, (int) env('MEDIA_MAX_FILE_SIZE_MB', 15)),
    'download_timeout_seconds' => max(1, (int) env('MEDIA_DOWNLOAD_TIMEOUT_SECONDS', 30)),
    'download_user_agent' => (string) env('MEDIA_DOWNLOAD_USER_AGENT', 'CupleBot/1.0'),
];
