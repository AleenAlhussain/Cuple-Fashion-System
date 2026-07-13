<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;

class StripeService
{
    protected string $secret;
    protected string $currency;
    protected string $mode;

    public function __construct()
    {
        $this->currency = strtolower((string) config('services.stripe.currency', 'aed'));
        $credentials = $this->resolveCredentials();
        $this->mode = $credentials['mode'];
        $this->secret = $credentials['secret'];

        if ($this->secret === '') {
            throw new \RuntimeException('Stripe secret key is not configured.');
        }
    }

    public function getMode(): string
    {
        return $this->mode;
    }

    /**
     * Create a Stripe Payment Intent using the REST API.
     */
    public function createPaymentIntent(int $amount, array $metadata = []): array
    {
        $payload = array_merge(
            [
                'amount' => $amount,
                'currency' => $this->currency,
                'automatic_payment_methods[enabled]' => 'true',
            ],
            $this->formatMetadata($metadata)
        );

        return $this->request('post', 'https://api.stripe.com/v1/payment_intents', $payload);
    }

    /**
     * Retrieve an existing Payment Intent.
     */
    public function retrievePaymentIntent(string $paymentIntentId): array
    {
        return $this->request('get', "https://api.stripe.com/v1/payment_intents/{$paymentIntentId}");
    }

    /**
     * Convert a decimal amount to the smallest currency unit (cents).
     */
    public function toStripeAmount(float $amount): int
    {
        return (int) round($amount * 100);
    }

    protected function request(string $method, string $url, array $payload = []): array
    {
        $client = Http::withBasicAuth($this->secret, '')
            ->timeout(30);

        if (app()->environment('local')) {
            $client = $client->withoutVerifying();
        }

        if ($method === 'post') {
            $response = $client->asForm()->post($url, $payload);
        } else {
            $response = $client->get($url, $payload);
        }

        if ($response->failed()) {
            $error = $response->json('error.message') ?: $response->body() ?: 'Stripe API request failed';
            throw new \RuntimeException($error);
        }

        return $response->json();
    }

    protected function formatMetadata(array $metadata): array
    {
        $formatted = [];
        foreach ($metadata as $key => $value) {
            $formatted["metadata[{$key}]"] = $value;
        }

        return $formatted;
    }

    /**
     * @return array{mode: string, secret: string}
     */
    private function resolveCredentials(): array
    {
        $settings = $this->loadStripeSettings();
        $mode = $this->normalizeStripeMode($settings['mode'] ?? null, 'live');

        $activeSecret = $mode === 'test'
            ? $this->sanitizeString($settings['test_secret_key'] ?? '')
            : $this->sanitizeString($settings['live_secret_key'] ?? '');

        if ($activeSecret === '') {
            $activeSecret = $mode === 'test'
                ? $this->sanitizeString($settings['live_secret_key'] ?? '')
                : $this->sanitizeString($settings['test_secret_key'] ?? '');
        }

        $fallbackSecret = $this->sanitizeString(
            config('services.stripe.secret') ?: env('STRIPE_SECRET')
        );

        return [
            'mode' => $mode,
            'secret' => $activeSecret !== '' ? $activeSecret : $fallbackSecret,
        ];
    }

    /**
     * @return array{mode: string, test_publishable_key: string, test_secret_key: string, live_publishable_key: string, live_secret_key: string}
     */
    private function loadStripeSettings(): array
    {
        $defaults = [
            'mode' => 'live',
            'test_publishable_key' => '',
            'test_secret_key' => '',
            'live_publishable_key' => '',
            'live_secret_key' => '',
        ];

        $rawValues = Setting::query()->where('key', 'values')->value('value');
        $values = $this->decodeSettingArray($rawValues);
        $rawPaymentMethods = data_get($values, 'payment_methods');

        if (!is_array($rawPaymentMethods)) {
            return $defaults;
        }

        $stripeSource = null;
        if (array_is_list($rawPaymentMethods)) {
            foreach ($rawPaymentMethods as $method) {
                if (!is_array($method)) {
                    continue;
                }
                if (($method['name'] ?? null) === 'stripe_card') {
                    $stripeSource = $method;
                    break;
                }
            }
        } else {
            foreach (['stripe_card', 'stripe'] as $key) {
                $candidate = $rawPaymentMethods[$key] ?? null;
                if (is_array($candidate)) {
                    $stripeSource = $candidate;
                    break;
                }
            }
        }

        if (!is_array($stripeSource)) {
            return $defaults;
        }

        $modeFromSandbox = array_key_exists('is_sandbox', $stripeSource)
            ? ($this->toBool($stripeSource['is_sandbox'], true) ? 'test' : 'live')
            : 'live';

        $mode = $this->normalizeStripeMode(
            $stripeSource['mode'] ?? $stripeSource['stripe_mode'] ?? null,
            $modeFromSandbox
        );

        $legacyPublishable = $this->sanitizeString(
            $stripeSource['publishable_key'] ?? $stripeSource['public_key'] ?? ''
        );
        $legacySecret = $this->sanitizeString($stripeSource['secret_key'] ?? '');

        return [
            'mode' => $mode,
            'test_publishable_key' => $this->sanitizeString(
                $stripeSource['test_publishable_key'] ?? $stripeSource['test_public_key'] ?? null,
                $mode === 'test' ? $legacyPublishable : ''
            ),
            'test_secret_key' => $this->sanitizeString(
                $stripeSource['test_secret_key'] ?? $stripeSource['test_private_key'] ?? null,
                $mode === 'test' ? $legacySecret : ''
            ),
            'live_publishable_key' => $this->sanitizeString(
                $stripeSource['live_publishable_key'] ?? $stripeSource['live_public_key'] ?? null,
                $mode === 'live' ? $legacyPublishable : ''
            ),
            'live_secret_key' => $this->sanitizeString(
                $stripeSource['live_secret_key'] ?? $stripeSource['live_private_key'] ?? null,
                $mode === 'live' ? $legacySecret : ''
            ),
        ];
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

    private function toBool(mixed $value, bool $default): bool
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
