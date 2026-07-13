<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class WhatsAppSettingController extends BaseController
{
    private const GROUP = 'whatsapp';
    private const KEY_ENABLED = 'whatsapp.enabled';
    private const KEY_ZAPIER_WEBHOOK_URL = 'whatsapp.zapier.webhook_url'; // legacy shared key
    private const KEY_ZAPIER_LOGIN_WEBHOOK_URL = 'whatsapp.zapier.login_webhook_url';
    private const KEY_ZAPIER_ORDER_WEBHOOK_URL = 'whatsapp.zapier.order_webhook_url';

    public function show()
    {
        $enabled = (bool) (Setting::get(self::KEY_ENABLED, false));
        $legacyWebhookUrl = Setting::get(self::KEY_ZAPIER_WEBHOOK_URL, '');
        $loginWebhookUrl = Setting::get(self::KEY_ZAPIER_LOGIN_WEBHOOK_URL, '');
        $orderWebhookUrl = Setting::get(self::KEY_ZAPIER_ORDER_WEBHOOK_URL, '');

        return $this->success([
            'enabled' => $enabled,
            'zapier_webhook_url' => $legacyWebhookUrl ?: null,
            'zapier_login_webhook_url' => ($loginWebhookUrl ?: $legacyWebhookUrl) ?: null,
            'zapier_order_webhook_url' => ($orderWebhookUrl ?: $legacyWebhookUrl) ?: null,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'zapier_webhook_url' => ['nullable', 'url'],
            'zapier_login_webhook_url' => ['nullable', 'url'],
            'zapier_order_webhook_url' => ['nullable', 'url'],
        ]);

        Setting::set(self::KEY_ENABLED, $validated['enabled'] ? 1 : 0, self::GROUP);

        $legacyProvided = array_key_exists('zapier_webhook_url', $validated);
        $loginProvided = array_key_exists('zapier_login_webhook_url', $validated);
        $orderProvided = array_key_exists('zapier_order_webhook_url', $validated);

        $legacyUrl = $this->normalizeUrl($validated['zapier_webhook_url'] ?? null);
        $loginUrl = $this->normalizeUrl($validated['zapier_login_webhook_url'] ?? null);
        $orderUrl = $this->normalizeUrl($validated['zapier_order_webhook_url'] ?? null);

        if ($legacyProvided) {
            Setting::set(self::KEY_ZAPIER_WEBHOOK_URL, $legacyUrl, self::GROUP);
        }

        if ($loginProvided) {
            Setting::set(self::KEY_ZAPIER_LOGIN_WEBHOOK_URL, $loginUrl, self::GROUP);
        } elseif ($legacyProvided) {
            Setting::set(self::KEY_ZAPIER_LOGIN_WEBHOOK_URL, $legacyUrl, self::GROUP);
        }

        if ($orderProvided) {
            Setting::set(self::KEY_ZAPIER_ORDER_WEBHOOK_URL, $orderUrl, self::GROUP);
        } elseif ($legacyProvided) {
            Setting::set(self::KEY_ZAPIER_ORDER_WEBHOOK_URL, $legacyUrl, self::GROUP);
        }

        Cache::forget('settings_all');
        Cache::forget('settings_group_' . self::GROUP);

        return $this->success(null, 'WhatsApp settings updated successfully.');
    }

    private function normalizeUrl($value): string
    {
        if ($value === null) {
            return '';
        }

        return trim((string) $value);
    }
}
