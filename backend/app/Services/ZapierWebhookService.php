<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Throwable;

class ZapierWebhookService
{
    private const GROUP = 'whatsapp';
    private const KEY_ENABLED = 'whatsapp.enabled';
    private const KEY_ORDER_WEBHOOK_URL = 'whatsapp.zapier.order_webhook_url';
    private const KEY_WEBHOOK_URL_LEGACY = 'whatsapp.zapier.webhook_url';

    public function sendOrderCreated(Order $order): void
    {
        try {
            $settings = Setting::getGroup(self::GROUP);
            $enabled = filter_var($settings[self::KEY_ENABLED] ?? false, FILTER_VALIDATE_BOOLEAN);
            $webhookUrl = $this->firstNonEmpty(
                $settings[self::KEY_ORDER_WEBHOOK_URL] ?? null,
                $settings[self::KEY_WEBHOOK_URL_LEGACY] ?? null,
                config('services.whatsapp.zapier_order_webhook_url'),
                config('services.whatsapp.zapier_webhook_url')
            );

            if (!$enabled || $webhookUrl === '') {
                Log::info('Zapier webhook skipped (settings incomplete)', [
                    'order_id' => $order->id ?? null,
                    'enabled' => $enabled,
                    'has_webhook_url' => $webhookUrl !== '',
                ]);
                return;
            }

            $payload = $this->buildPayload($order);

            $response = Http::timeout(20)->post($webhookUrl, $payload);

            if (!$response->successful()) {
                Log::warning('Zapier webhook failed', [
                    'order_id' => $order->id ?? null,
                    'status' => $response->status(),
                    'response' => $response->json(),
                ]);
            }
        } catch (Throwable $e) {
            Log::warning('Zapier webhook exception', [
                'order_id' => $order->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function buildPayload(Order $order): array
    {
        $fullName = trim(($order->shipping_first_name ?? '') . ' ' . ($order->shipping_last_name ?? ''));
        if ($fullName === '') {
            $fullName = 'Customer';
        }

        $orderNumber = $order->order_number ?: (string) $order->id;
        $orderDate = $order->created_at ? $order->created_at->format('Y-m-d') : '';
        $total = number_format((float) ($order->total ?? 0), 2, '.', '');
        $currency = $order->currency ?: 'AED';
        $tracking = trim($order->tracking_number ?? '', '/ ');

        return [
            'customer_name' => $fullName,
            'phone' => $this->normalizePhone(
                $order->shipping_phone ?? $order->billing_phone ?? null,
                $order->country?->phone_code ?? null
            ),
            'order_number' => (string) $orderNumber,
            'order_date' => $orderDate,
            'total' => "{$currency} {$total}",
            'tracking' => (string) $tracking,
            'invoice_pdf_url' => $this->buildInvoiceUrl((string) $orderNumber),
            'tracking_url' => $tracking !== '' ? "https://cuple.shop/tracking-order?awb={$tracking}" : '',
        ];
    }

    private function buildInvoiceUrl(string $orderNumber): string
    {
        try {
            return URL::signedRoute('website.order.invoice.download', [
                'orderNumber' => $orderNumber,
            ]);
        } catch (Throwable $e) {
            Log::warning('Failed to build signed invoice URL for webhook payload', [
                'order_number' => $orderNumber,
                'error' => $e->getMessage(),
            ]);

            return url('/api/website/order/invoice/' . $orderNumber);
        }
    }

    private function normalizePhone(?string $phone, ?string $countryCode): string
    {
        if (!$phone) {
            return '';
        }

        $clean = preg_replace('/\D/', '', $phone);
        if ($clean === null || $clean === '') {
            return '';
        }

        if (str_starts_with($clean, '00')) {
            $clean = substr($clean, 2);
        }

        $code = $countryCode ? preg_replace('/\D/', '', $countryCode) : '';
        if ($code !== '' && !str_starts_with($clean, $code)) {
            return $code . $clean;
        }

        return $clean;
    }

    private function firstNonEmpty(...$values): string
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

        return '';
    }
}
