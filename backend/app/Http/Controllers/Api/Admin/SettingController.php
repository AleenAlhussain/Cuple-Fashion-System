<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Country;
use App\Models\PaymentGateway;
use App\Models\Setting;
use App\Support\HomeBannerMediaResolver;
use App\Support\ThemeOptionMediaResolver;
use Illuminate\Support\Arr;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class SettingController extends BaseController
{
    private const PAYMENT_METHOD_DEFAULTS = [
        ['name' => 'cod', 'title' => 'Cash On Delivery', 'status' => true],
        [
            'name' => 'stripe_card',
            'title' => 'Credit/Debit Cards',
            'status' => true,
            'mode' => 'live',
            'test_publishable_key' => '',
            'test_secret_key' => '',
            'live_publishable_key' => '',
            'live_secret_key' => '',
        ],
        ['name' => 'apple_pay', 'title' => 'Apple Pay', 'status' => true],
        ['name' => 'google_pay', 'title' => 'Google Pay', 'status' => true],
        ['name' => 'tabby', 'title' => 'Pay with Tabby', 'status' => true],
        ['name' => 'tamara', 'title' => 'Pay with Tamara', 'status' => true],
    ];

    private const LEGACY_PAYMENT_METHOD_KEYS = [
        'cod' => ['cod'],
        'stripe_card' => ['stripe_card', 'stripe'],
        'apple_pay' => ['apple_pay', 'stripe'],
        'google_pay' => ['google_pay', 'stripe'],
        'tabby' => ['tabby'],
        'tamara' => ['tamara'],
    ];

    /**
     * Map settings ID fields to the hydrated media object fields.
     *
     * @var array<string, string>
     */
    private const MEDIA_FIELD_MAP = [
        'general.light_logo_image_id' => 'general.light_logo_image',
        'general.dark_logo_image_id' => 'general.dark_logo_image',
        'general.tiny_logo_image_id' => 'general.tiny_logo_image',
        'general.favicon_image_id' => 'general.favicon_image',
        'maintenance.maintenance_image_id' => 'maintenance.maintenance_image',
    ];

    public function index(Request $request)
    {
        $group = $request->query('group');
        if ($group === 'points') {
            return $this->success([
                'signup_points' => (int) Setting::get('points.signup_points', 0),
                'reward_per_order_amount' => (float) Setting::get('points.reward_per_order_amount', 0),
                'currency_ratio' => (float) Setting::get('points.currency_ratio', 0.05),
                'max_redeem_percent' => (float) Setting::get('points.max_redeem_percent', 100),
            ]);
        }

        $settings = $this->loadSettingsPayload();
        return $this->success($settings);
    }

    public function update(Request $request)
    {
        $data = Arr::except($request->all(), ['_method', 'submitButtonClicked']);
        \Log::info('Admin settings update payload', $data);

        $paymentMethods = [];
        if (isset($data['values']) && is_array($data['values'])) {
            $paymentMethods = $this->normalizePaymentMethods($data['values']['payment_methods'] ?? null);
            $data['values']['payment_methods'] = $paymentMethods;
        }

        foreach ($data as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => is_array($value) ? json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : $value]
            );
        }

        if ($paymentMethods) {
            $this->syncBnplGatewayStatus($paymentMethods);
        }

        // Clear frontend settings cache
        Cache::forget('website_settings');
        Cache::forget('settings_all');

        return $this->success($this->loadSettingsPayload(), 'Settings updated successfully.');
    }

    public function updatePoints(Request $request)
    {
        $validated = $request->validate([
            'signup_points' => 'required|numeric|min:0',
            'reward_per_order_amount' => 'required|numeric|min:0',
            'currency_ratio' => 'required|numeric|gt:0',
            'max_redeem_percent' => 'required|numeric|min:0|max:100',
        ]);

        Setting::set('points.signup_points', $validated['signup_points'], 'points');
        Setting::set('points.reward_per_order_amount', $validated['reward_per_order_amount'], 'points');
        Setting::set('points.currency_ratio', $validated['currency_ratio'], 'points');
        Setting::set('points.max_redeem_percent', $validated['max_redeem_percent'], 'points');

        Cache::forget('settings_all');
        Cache::forget('settings_group_points');
        Cache::forget('website_settings');

        return $this->success($validated, 'Points settings updated successfully.');
    }

    public function sendTestEmail(Request $request)
    {
        $validated = $request->validate([
            'to_mail' => ['required', 'email'],
            'mail_mailer' => ['nullable', 'string'],
            'mail_host' => ['nullable', 'string'],
            'mail_port' => ['nullable'],
            'mail_username' => ['nullable', 'string'],
            'mail_password' => ['nullable', 'string'],
            'mail_encryption' => ['nullable', 'string'],
            'mail_from_address' => ['nullable', 'email'],
            'mail_from_name' => ['nullable', 'string'],
            'mailgun_domain' => ['nullable', 'string'],
            'mailgun_secret' => ['nullable', 'string'],
        ]);

        $mailConfig = $this->resolveRuntimeMailConfig($validated);
        if (!$mailConfig['ready']) {
            return $this->error(
                'Email configuration is incomplete. Please check mail settings and try again.',
                422,
                ['missing' => $mailConfig['missing']]
            );
        }

        if (app()->bound('mail.manager')) {
            $mailManager = app('mail.manager');
            if (is_object($mailManager) && method_exists($mailManager, 'forgetMailers')) {
                $mailManager->forgetMailers();
            }
        }

        try {
            $toMail = $validated['to_mail'];
            Mail::raw(
                'This is a test email from Cuple admin email configuration.',
                function ($message) use ($toMail) {
                    $message->to($toMail)->subject('Cuple - Test Email');
                }
            );
        } catch (\Throwable $e) {
            \Log::error('Admin settings test email failed', [
                'to_mail' => $validated['to_mail'] ?? null,
                'mailer' => $mailConfig['mailer'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return $this->error('Unable to send test email. Please verify SMTP credentials and server settings.', 500);
        }

        return $this->success([
            'to_mail' => $validated['to_mail'],
            'mailer' => $mailConfig['mailer'] ?? null,
        ], 'Test email sent successfully.');
    }

    /**
     * Get theme options
     */
    public function themeOptions()
    {
        $setting = Setting::where('key', 'options')->first();

        if ($setting) {
            $options = json_decode($setting->value, true);
            if (is_array($options)) {
                $banners = data_get($options, 'home_banner.banners', []);
                if (is_array($banners)) {
                    // Admin editor should not silently replace broken mobile images with desktop image.
                    data_set($options, 'home_banner.banners', HomeBannerMediaResolver::normalizeBanners($banners, false));
                }

                $options = ThemeOptionMediaResolver::hydrate($options);
            }

            // Debug logging
            \Log::info('Theme options load:', [
                'has_home_categories' => isset($options['home_categories']),
                'home_categories' => $options['home_categories'] ?? null,
            ]);

            return $this->success(['options' => $options]);
        }

        return $this->success(['options' => []]);
    }

    /**
     * Update theme options
     */
    public function updateThemeOptions(Request $request)
    {
        $options = $request->input('options', []);
        if (is_array($options)) {
            $banners = data_get($options, 'home_banner.banners', []);
            if (is_array($banners)) {
                // Keep editor payload deterministic and tied to selected IDs.
                data_set($options, 'home_banner.banners', HomeBannerMediaResolver::normalizeBanners($banners, false));
            }
        }

        // Debug logging
        \Log::info('Theme options save request:', [
            'has_home_categories' => isset($options['home_categories']),
            'home_categories' => $options['home_categories'] ?? null,
        ]);

        // Clear all related caches
        Cache::forget('settings_all');
        Cache::forget('setting_options');
        Cache::forget('settings_group_theme');
        Cache::forget('website_settings');
        Cache::forget('homepage_data_v2');
        Cache::forget('theme_options_v2_default');
        foreach (Country::query()->pluck('id') as $countryId) {
            Cache::forget('theme_options_v2_' . $countryId);
        }

        Setting::updateOrCreate(
            ['key' => 'options'],
            ['value' => json_encode($options), 'group' => 'theme']
        );

        return $this->success(null, 'Theme options saved successfully!');
    }

    /**
     * Load admin settings payload and hydrate media objects for known IDs.
     *
     * @return array<string, mixed>
     */
    private function loadSettingsPayload(): array
    {
        $settings = Setting::all()->pluck('value', 'key')->toArray();

        if (array_key_exists('values', $settings)) {
            $decodedValues = $this->decodeJsonValue($settings['values']);
            if (is_array($decodedValues)) {
                $settings['values'] = $this->hydrateSettingsMedia($decodedValues);
            }
        }

        return $settings;
    }

    /**
     * @param mixed $value
     * @return mixed
     */
    private function decodeJsonValue(mixed $value): mixed
    {
        if (!is_string($value)) {
            return $value;
        }

        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        return $value;
    }

    /**
     * Hydrate known media fields in settings values.
     *
     * @param array<string, mixed> $values
     * @return array<string, mixed>
     */
    private function hydrateSettingsMedia(array $values): array
    {
        foreach (self::MEDIA_FIELD_MAP as $idPath => $objectPath) {
            $id = data_get($values, $idPath);

            $fallback = data_get($values, $objectPath . '.original_url')
                ?? data_get($values, $objectPath . '.url')
                ?? data_get($values, $objectPath);

            $resolved = ThemeOptionMediaResolver::resolveAttachment(
                is_scalar($id) ? (string) $id : null,
                is_string($fallback) ? $fallback : null
            );

            data_set($values, $objectPath, $resolved);
        }

        return $values;
    }

    /**
     * Resolve mail config from request overrides, saved settings, and app defaults.
     *
     * @param array<string, mixed> $overrides
     * @return array{ready: bool, mailer: string, missing: array<int, string>}
     */
    private function resolveRuntimeMailConfig(array $overrides = []): array
    {
        $defaults = config('mail', []);
        $mailers = $defaults['mailers'] ?? [];
        $stored = $this->loadStoredEmailSettings();

        $mailer = strtolower((string) ($this->firstNonEmpty(
            $overrides['mail_mailer'] ?? null,
            $stored['mail_mailer'] ?? null,
            data_get($defaults, 'default'),
            'smtp'
        ) ?? 'smtp'));

        $host = $this->firstNonEmpty(
            $overrides['mail_host'] ?? null,
            $stored['mail_host'] ?? null,
            data_get($mailers, 'smtp.host')
        );

        $portRaw = $this->firstNonEmpty(
            $overrides['mail_port'] ?? null,
            $stored['mail_port'] ?? null,
            data_get($mailers, 'smtp.port')
        );
        $port = is_numeric($portRaw) ? (int) $portRaw : null;

        $username = $this->firstNonEmpty(
            $overrides['mail_username'] ?? null,
            $stored['mail_username'] ?? null,
            data_get($mailers, 'smtp.username')
        );

        $password = $this->firstNonEmpty(
            $overrides['mail_password'] ?? null,
            $stored['mail_password'] ?? null,
            data_get($mailers, 'smtp.password')
        );

        $encryption = $this->firstNonEmpty(
            $overrides['mail_encryption'] ?? null,
            $stored['mail_encryption'] ?? null,
            data_get($mailers, 'smtp.encryption')
        );
        if ($encryption !== null && in_array(strtolower($encryption), ['none', 'null'], true)) {
            $encryption = null;
        }

        $fromAddress = $this->firstNonEmpty(
            $overrides['mail_from_address'] ?? null,
            $stored['mail_from_address'] ?? null,
            data_get($defaults, 'from.address')
        );
        $fromName = $this->firstNonEmpty(
            $overrides['mail_from_name'] ?? null,
            $stored['mail_from_name'] ?? null,
            data_get($defaults, 'from.name')
        );

        $mailgunDomain = $this->firstNonEmpty(
            $overrides['mailgun_domain'] ?? null,
            $stored['mailgun_domain'] ?? null,
            config('services.mailgun.domain')
        );
        $mailgunSecret = $this->firstNonEmpty(
            $overrides['mailgun_secret'] ?? null,
            $stored['mailgun_secret'] ?? null,
            config('services.mailgun.secret')
        );

        Config::set('mail.default', $mailer);
        Config::set('mail.from.address', $fromAddress ?: data_get($defaults, 'from.address'));
        Config::set('mail.from.name', $fromName ?: data_get($defaults, 'from.name'));

        $missing = [];
        if ($mailer === 'smtp') {
            Config::set('mail.mailers.smtp.host', $host);
            Config::set('mail.mailers.smtp.port', $port ?: data_get($mailers, 'smtp.port'));
            Config::set('mail.mailers.smtp.username', $username);
            Config::set('mail.mailers.smtp.password', $password);
            Config::set('mail.mailers.smtp.encryption', $encryption);
            Config::set('mail.mailers.smtp.timeout', 5);

            if (!$host) {
                $missing[] = 'mail_host';
            }
            if (!$port) {
                $missing[] = 'mail_port';
            }
            if (!$username) {
                $missing[] = 'mail_username';
            }
            if (!$password) {
                $missing[] = 'mail_password';
            }
        } elseif ($mailer === 'mailgun') {
            Config::set('services.mailgun.domain', $mailgunDomain);
            Config::set('services.mailgun.secret', $mailgunSecret);

            if (!$mailgunDomain) {
                $missing[] = 'mailgun_domain';
            }
            if (!$mailgunSecret) {
                $missing[] = 'mailgun_secret';
            }
        } elseif ($mailer === 'sendmail') {
            $sendmailPath = data_get($mailers, 'sendmail.path');
            if ($sendmailPath) {
                Config::set('mail.mailers.sendmail.path', $sendmailPath);
            }
        } else {
            $missing[] = 'mail_mailer';
        }

        if (!$fromAddress) {
            $missing[] = 'mail_from_address';
        }

        return [
            'ready' => count($missing) === 0,
            'mailer' => $mailer,
            'missing' => $missing,
        ];
    }

    /**
     * @return array<string, string>
     */
    private function loadStoredEmailSettings(): array
    {
        $keys = [
            'mail_mailer',
            'mail_host',
            'mail_port',
            'mail_username',
            'mail_password',
            'mail_encryption',
            'mail_from_address',
            'mail_from_name',
            'mailgun_domain',
            'mailgun_secret',
        ];

        $direct = Setting::query()
            ->whereIn('key', $keys)
            ->pluck('value', 'key')
            ->toArray();

        $valuesBlob = Setting::query()->where('key', 'values')->value('value');
        $decoded = $this->decodeSettingArray($valuesBlob);
        $rootEmail = is_array(data_get($decoded, 'email')) ? data_get($decoded, 'email') : [];
        $nestedEmail = is_array(data_get($decoded, 'values.email')) ? data_get($decoded, 'values.email') : [];

        $resolved = [];
        foreach ($keys as $key) {
            $resolved[$key] = $this->firstNonEmpty(
                $direct[$key] ?? null,
                $rootEmail[$key] ?? null,
                $nestedEmail[$key] ?? null
            ) ?? '';
        }

        return $resolved;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeSettingArray(mixed $value): array
    {
        $decoded = $value;
        for ($i = 0; $i < 3; $i++) {
            if (!is_string($decoded)) {
                break;
            }

            $decoded = json_decode($decoded, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return [];
            }
        }

        return is_array($decoded) ? $decoded : [];
    }

    private function firstNonEmpty(mixed ...$values): ?string
    {
        foreach ($values as $value) {
            if ($value === null) {
                continue;
            }

            $candidate = trim((string) $value);
            if ($candidate === '' || strtolower($candidate) === 'null') {
                continue;
            }

            return $candidate;
        }

        return null;
    }

    /**
     * @param mixed $raw
     * @return array<int, array<string, mixed>>
     */
    private function normalizePaymentMethods(mixed $raw): array
    {
        $normalized = [];
        foreach (self::PAYMENT_METHOD_DEFAULTS as $method) {
            $normalized[$method['name']] = $method;
        }

        if (is_array($raw)) {
            if (array_is_list($raw)) {
                foreach ($raw as $item) {
                    if (!is_array($item)) {
                        continue;
                    }

                    $name = (string) ($item['name'] ?? '');
                    if ($name === '' || !isset($normalized[$name])) {
                        continue;
                    }

                    $normalized[$name]['title'] = trim((string) ($item['title'] ?? $normalized[$name]['title']));
                    $normalized[$name]['status'] = $this->normalizeBoolean($item['status'] ?? $normalized[$name]['status'], $normalized[$name]['status']);
                    if ($name === 'stripe_card') {
                        $normalized[$name] = array_merge(
                            $normalized[$name],
                            $this->normalizeStripeSettings($item, $normalized[$name])
                        );
                    }
                }
            } else {
                foreach (self::PAYMENT_METHOD_DEFAULTS as $method) {
                    $name = $method['name'];
                    $legacyKeys = self::LEGACY_PAYMENT_METHOD_KEYS[$name] ?? [$name];
                    $legacy = null;
                    foreach ($legacyKeys as $legacyKey) {
                        $candidate = $raw[$legacyKey] ?? null;
                        if (is_array($candidate)) {
                            $legacy = $candidate;
                            break;
                        }
                    }

                    if (!$legacy) {
                        continue;
                    }

                    $normalized[$name]['title'] = trim((string) ($legacy['title'] ?? $normalized[$name]['title']));
                    $normalized[$name]['status'] = $this->normalizeBoolean($legacy['status'] ?? $normalized[$name]['status'], $normalized[$name]['status']);
                    if ($name === 'stripe_card') {
                        $normalized[$name] = array_merge(
                            $normalized[$name],
                            $this->normalizeStripeSettings($legacy, $normalized[$name])
                        );
                    }
                }
            }
        }

        return array_values(array_map(function (array $method) {
            if ($method['title'] === '') {
                $method['title'] = ucfirst(str_replace('_', ' ', $method['name']));
            }

            return [
                'name' => $method['name'],
                'title' => $method['title'],
                'status' => (bool) $method['status'],
                ...($method['name'] === 'stripe_card'
                    ? [
                        'mode' => $this->normalizeStripeMode($method['mode'] ?? null, 'live'),
                        'test_publishable_key' => $this->sanitizeString($method['test_publishable_key'] ?? ''),
                        'test_secret_key' => $this->sanitizeString($method['test_secret_key'] ?? ''),
                        'live_publishable_key' => $this->sanitizeString($method['live_publishable_key'] ?? ''),
                        'live_secret_key' => $this->sanitizeString($method['live_secret_key'] ?? ''),
                    ]
                    : []),
            ];
        }, $normalized));
    }

    /**
     * @param array<string, mixed> $source
     * @param array<string, mixed> $fallback
     * @return array<string, string>
     */
    private function normalizeStripeSettings(array $source, array $fallback): array
    {
        $fallbackMode = $this->normalizeStripeMode($fallback['mode'] ?? null, 'live');

        $modeFromSandbox = $fallbackMode;
        if (array_key_exists('is_sandbox', $source)) {
            $modeFromSandbox = $this->normalizeBoolean($source['is_sandbox'], true) ? 'test' : 'live';
        }

        $mode = $this->normalizeStripeMode(
            $source['mode'] ?? $source['stripe_mode'] ?? null,
            $modeFromSandbox
        );

        $legacyPublishable = $this->sanitizeString($source['publishable_key'] ?? $source['public_key'] ?? '');
        $legacySecret = $this->sanitizeString($source['secret_key'] ?? '');

        return [
            'mode' => $mode,
            'test_publishable_key' => $this->sanitizeString(
                $source['test_publishable_key'] ?? $source['test_public_key'] ?? null,
                $mode === 'test'
                    ? $legacyPublishable
                    : $this->sanitizeString($fallback['test_publishable_key'] ?? '')
            ),
            'test_secret_key' => $this->sanitizeString(
                $source['test_secret_key'] ?? $source['test_private_key'] ?? null,
                $mode === 'test'
                    ? $legacySecret
                    : $this->sanitizeString($fallback['test_secret_key'] ?? '')
            ),
            'live_publishable_key' => $this->sanitizeString(
                $source['live_publishable_key'] ?? $source['live_public_key'] ?? null,
                $mode === 'live'
                    ? $legacyPublishable
                    : $this->sanitizeString($fallback['live_publishable_key'] ?? '')
            ),
            'live_secret_key' => $this->sanitizeString(
                $source['live_secret_key'] ?? $source['live_private_key'] ?? null,
                $mode === 'live'
                    ? $legacySecret
                    : $this->sanitizeString($fallback['live_secret_key'] ?? '')
            ),
        ];
    }

    private function normalizeStripeMode(mixed $value, string $default = 'live'): string
    {
        $candidate = strtolower(trim((string) $value));
        if (in_array($candidate, ['test', 'live'], true)) {
            return $candidate;
        }

        return $default;
    }

    private function sanitizeString(mixed $value, string $default = ''): string
    {
        if ($value === null) {
            return $default;
        }

        $candidate = trim((string) $value);
        if ($candidate === '' || strtolower($candidate) === 'null') {
            return $default;
        }

        return $candidate;
    }

    /**
     * @param array<int, array{name: string, title: string, status: bool}> $paymentMethods
     */
    private function syncBnplGatewayStatus(array $paymentMethods): void
    {
        $map = [];
        foreach ($paymentMethods as $method) {
            $name = (string) ($method['name'] ?? '');
            if ($name === '') {
                continue;
            }

            $map[$name] = [
                'status' => $this->normalizeBoolean($method['status'] ?? false, false),
                'title' => trim((string) ($method['title'] ?? '')),
            ];
        }

        foreach (['tabby', 'tamara'] as $gatewayName) {
            if (!isset($map[$gatewayName])) {
                continue;
            }

            $updates = [
                'is_active' => $map[$gatewayName]['status'],
            ];

            if ($map[$gatewayName]['title'] !== '') {
                $updates['display_name'] = $map[$gatewayName]['title'];
            }

            PaymentGateway::query()
                ->where('name', $gatewayName)
                ->update($updates);
        }
    }

    private function normalizeBoolean(mixed $value, bool $default): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value === 1;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if ($normalized === 'true') {
                return true;
            }
            if ($normalized === 'false') {
                return false;
            }
        }

        return $default;
    }
}
