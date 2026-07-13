<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class WhatsAppTemplateService
{
    private const GROUP = 'whatsapp';
    private const KEY_ENABLED = 'whatsapp.enabled';
    private const KEY_LOGIN_WEBHOOK_URL = 'whatsapp.zapier.login_webhook_url';
    private const KEY_WEBHOOK_URL_LEGACY = 'whatsapp.zapier.webhook_url';
    private const KEY_TEMPLATE_NAME = 'whatsapp.zapier.template_name';
    private const KEY_TEMPLATE_LANGUAGE = 'whatsapp.zapier.template_language';

    public function validateConfiguration(): array
    {
        $config = $this->resolveConfig();

        return [
            'ready' => $config['ready'],
            'enabled' => $config['enabled'],
            'missing' => $config['missing'],
        ];
    }

    public function sendOtpTemplate(string $toPhone, string $code): array
    {
        $config = $this->resolveConfig();
        if (!$config['ready']) {
            throw new RuntimeException('WhatsApp service is not configured.');
        }

        $payload = [
            'event' => 'login_otp',
            'channel' => 'whatsapp',
            'to' => $toPhone,
            'phone' => $toPhone,
            'otp' => $code,
            'code' => $code,
            'template_name' => $config['template_name'],
            'template_language' => $config['template_language'],
            'message' => "Your login code is {$code}",
        ];

        $response = Http::timeout($config['timeout'])
            ->acceptJson()
            ->asJson()
            ->post($config['webhook_url'], $payload);

        if (!$response->successful()) {
            Log::warning('WhatsApp OTP send failed', [
                'status' => $response->status(),
                'response' => $response->json(),
            ]);

            throw new RuntimeException('Unable to send WhatsApp OTP at the moment.');
        }

        $body = $response->json();

        return [
            'message_id' => data_get($body, 'message_id')
                ?: data_get($body, 'id')
                ?: data_get($body, 'messages.0.id'),
        ];
    }

    private function resolveConfig(): array
    {
        $settings = Setting::getGroup(self::GROUP);

        $enabled = filter_var(
            $settings[self::KEY_ENABLED] ?? config('services.whatsapp.enabled', false),
            FILTER_VALIDATE_BOOLEAN
        );

        $webhookUrl = $this->firstNonEmpty(
            $settings[self::KEY_LOGIN_WEBHOOK_URL] ?? null,
            $settings[self::KEY_WEBHOOK_URL_LEGACY] ?? null,
            config('services.whatsapp.zapier_login_webhook_url'),
            config('services.whatsapp.zapier_webhook_url')
        );

        $templateName = $this->firstNonEmpty(
            $settings[self::KEY_TEMPLATE_NAME] ?? null,
            config('services.whatsapp.template_name'),
            'code_login_v1'
        );

        $templateLanguage = $this->firstNonEmpty(
            $settings[self::KEY_TEMPLATE_LANGUAGE] ?? null,
            config('services.whatsapp.template_language'),
            'en'
        );

        $timeout = (int) ($this->firstNonEmpty(
            config('services.whatsapp.timeout'),
            15
        ));

        $missing = [];
        if (!$enabled) {
            $missing[] = 'whatsapp.enabled';
        }
        if (!$webhookUrl) {
            $missing[] = 'whatsapp.zapier.login_webhook_url';
        }

        return [
            'ready' => count($missing) === 0,
            'enabled' => $enabled,
            'missing' => $missing,
            'webhook_url' => $webhookUrl,
            'template_name' => $templateName,
            'template_language' => $templateLanguage,
            'timeout' => max(5, $timeout),
        ];
    }

    private function firstNonEmpty(...$values): ?string
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
}
