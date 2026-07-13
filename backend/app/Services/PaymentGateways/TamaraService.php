<?php

namespace App\Services\PaymentGateways;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Order;
use App\Models\PaymentGateway;
use App\Models\PaymentTransaction;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TamaraService implements PaymentGatewayInterface
{
    protected PaymentGateway $gateway;
    protected string $apiUrl;
    protected string $apiToken;

    public function __construct()
    {
        $this->gateway = PaymentGateway::findByName('tamara');

        if (!$this->gateway) {
            throw new \RuntimeException('Tamara gateway not configured');
        }

        $this->apiUrl = $this->gateway->api_base_url;
        $this->apiToken = $this->gateway->decrypted_secret_key ?? '';
    }

    public function getName(): string
    {
        return 'tamara';
    }

    public function isConfigured(): bool
    {
        return $this->gateway->isConfigured();
    }

    public function isAmountEligible(float $amount): bool
    {
        return $this->gateway->isAmountEligible($amount);
    }

    public function getInstallmentInfo(float $total): array
    {
        return [
            'count' => $this->gateway->installments_count,
            'amount_per_installment' => $this->gateway->getInstallmentAmount($total),
            'currency' => 'AED',
            'description' => "Split in {$this->gateway->installments_count} interest-free payments",
        ];
    }

    public function createCheckoutSession(Order $order, array $options = []): array
    {
        $successUrl = $options['success_url'] ?? config('app.frontend_url') . '/checkout/payment/success';
        $failureUrl = $options['failure_url'] ?? config('app.frontend_url') . '/checkout/payment/failure';
        $cancelUrl = $options['cancel_url'] ?? config('app.frontend_url') . '/checkout';

        // Build order items
        $items = [];
        $totalItemsAmount = 0;

        foreach ($order->items as $item) {
            $itemTotal = $item->single_price * $item->quantity;
            $totalItemsAmount += $itemTotal;

            $items[] = [
                'reference_id' => (string) $item->id,
                'type' => 'Digital', // or 'Physical'
                'name' => $item->product->name ?? 'Product',
                'sku' => $item->product_variant->sku ?? $item->product->sku ?? 'SKU-' . $item->id,
                'quantity' => $item->quantity,
                'unit_price' => [
                    'amount' => number_format($item->single_price, 2, '.', ''),
                    'currency' => $order->currency ?? 'AED',
                ],
                'total_amount' => [
                    'amount' => number_format($itemTotal, 2, '.', ''),
                    'currency' => $order->currency ?? 'AED',
                ],
            ];
        }

        // Calculate discount total
        $discountTotal = ($order->discount_amount ?? 0) + ($order->rule_discount_amount ?? 0) + ($order->gift_box_discount_amount ?? 0);

        // Build payload
        $payload = [
            'order_reference_id' => $order->order_number,
            'total_amount' => [
                'amount' => number_format($order->total, 2, '.', ''),
                'currency' => $order->currency ?? 'AED',
            ],
            'description' => 'Order #' . $order->order_number,
            'country_code' => $this->getCountryCode($order),
            'payment_type' => 'PAY_BY_INSTALMENTS',
            'instalments' => $this->gateway->installments_count,
            'locale' => $options['locale'] ?? 'en_US',
            'items' => $items,
            'consumer' => [
                'first_name' => $order->shipping_first_name ?? '',
                'last_name' => $order->shipping_last_name ?? '',
                'phone_number' => $this->formatPhone($order->shipping_phone),
                'email' => $order->shipping_email,
            ],
            'shipping_address' => [
                'first_name' => $order->shipping_first_name ?? '',
                'last_name' => $order->shipping_last_name ?? '',
                'line1' => $order->shipping_street ?? '',
                'line2' => $order->shipping_apartment ?? '',
                'city' => $order->shipping_city ?? '',
                'region' => $order->shipping_state ?? '',
                'postal_code' => $order->shipping_postal_code ?? '',
                'country_code' => $this->getCountryCode($order),
                'phone_number' => $this->formatPhone($order->shipping_phone),
            ],
            'billing_address' => [
                'first_name' => $order->billing_first_name ?? $order->shipping_first_name ?? '',
                'last_name' => $order->billing_last_name ?? $order->shipping_last_name ?? '',
                'line1' => $order->billing_street ?? $order->shipping_street ?? '',
                'line2' => $order->billing_apartment ?? $order->shipping_apartment ?? '',
                'city' => $order->billing_city ?? $order->shipping_city ?? '',
                'region' => $order->billing_state ?? $order->shipping_state ?? '',
                'postal_code' => $order->billing_postal_code ?? $order->shipping_postal_code ?? '',
                'country_code' => $this->getCountryCode($order),
                'phone_number' => $this->formatPhone($order->billing_phone ?? $order->shipping_phone),
            ],
            'shipping_amount' => [
                'amount' => number_format($order->shipping_amount ?? 0, 2, '.', ''),
                'currency' => $order->currency ?? 'AED',
            ],
            'tax_amount' => [
                'amount' => number_format($order->tax_amount ?? 0, 2, '.', ''),
                'currency' => $order->currency ?? 'AED',
            ],
            'discount' => [
                'amount' => [
                    'amount' => number_format($discountTotal, 2, '.', ''),
                    'currency' => $order->currency ?? 'AED',
                ],
            ],
            'merchant_url' => [
                'success' => $successUrl . '?order_id=' . $order->id . '&gateway=tamara',
                'failure' => $failureUrl . '?order_id=' . $order->id . '&gateway=tamara',
                'cancel' => $cancelUrl . '?order_id=' . $order->id . '&gateway=tamara&status=cancelled',
                'notification' => config('app.url') . '/api/website/payment/webhook/tamara',
            ],
            'platform' => 'Cuple E-commerce',
        ];

        try {
            $response = $this->request('POST', '/checkout', $payload);

            if (!isset($response['checkout_id']) || !isset($response['checkout_url'])) {
                Log::error('Tamara checkout creation failed', ['response' => $response]);
                throw new \RuntimeException($response['message'] ?? 'Failed to create Tamara checkout session');
            }

            // Create transaction record
            $transaction = PaymentTransaction::create([
                'order_id' => $order->id,
                'gateway' => 'tamara',
                'payment_id' => $response['checkout_id'],
                'status' => PaymentTransaction::STATUS_CREATED,
                'amount' => $order->total,
                'currency' => $order->currency ?? 'AED',
                'gateway_response' => $response,
            ]);

            // Update order with transaction ID
            $order->update([
                'transaction_id' => $response['checkout_id'],
            ]);

            return [
                'success' => true,
                'checkout_url' => $response['checkout_url'],
                'payment_id' => $response['checkout_id'],
                'transaction_id' => $transaction->id,
            ];
        } catch (\Exception $e) {
            Log::error('Tamara checkout error', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
            throw $e;
        }
    }

    public function capturePayment(string $paymentId, ?float $amount = null): array
    {
        // Get order ID from transaction
        $transaction = PaymentTransaction::findByPaymentId($paymentId, 'tamara');

        if (!$transaction) {
            throw new \RuntimeException('Transaction not found');
        }

        $order = $transaction->order;

        // Build capture items
        $items = [];
        foreach ($order->items as $item) {
            $itemTotal = $item->single_price * $item->quantity;
            $items[] = [
                'order_item_id' => (string) $item->id,
                'name' => $item->product->name ?? 'Product',
                'sku' => $item->product_variant->sku ?? $item->product->sku ?? 'SKU-' . $item->id,
                'type' => 'Digital',
                'quantity' => $item->quantity,
                'total_amount' => [
                    'amount' => number_format($itemTotal, 2, '.', ''),
                    'currency' => $order->currency ?? 'AED',
                ],
            ];
        }

        $captureAmount = $amount ?? $order->total;
        $discountTotal = ($order->discount_amount ?? 0) + ($order->rule_discount_amount ?? 0) + ($order->gift_box_discount_amount ?? 0);

        $payload = [
            'order_id' => $paymentId,
            'total_amount' => [
                'amount' => number_format($captureAmount, 2, '.', ''),
                'currency' => $order->currency ?? 'AED',
            ],
            'shipping_info' => [
                'shipped_at' => now()->toIso8601String(),
                'shipping_company' => $order->carrier ?? 'Standard Shipping',
            ],
            'items' => $items,
            'shipping_amount' => [
                'amount' => number_format($order->shipping_amount ?? 0, 2, '.', ''),
                'currency' => $order->currency ?? 'AED',
            ],
            'tax_amount' => [
                'amount' => number_format($order->tax_amount ?? 0, 2, '.', ''),
                'currency' => $order->currency ?? 'AED',
            ],
            'discount_amount' => [
                'amount' => number_format($discountTotal, 2, '.', ''),
                'currency' => $order->currency ?? 'AED',
            ],
        ];

        try {
            $response = $this->request('POST', "/orders/{$paymentId}/capture", $payload);

            $transaction->markAsCaptured($response['capture_id'] ?? null);

            return [
                'success' => true,
                'capture_id' => $response['capture_id'] ?? null,
                'response' => $response,
            ];
        } catch (\Exception $e) {
            Log::error('Tamara capture error', [
                'error' => $e->getMessage(),
                'payment_id' => $paymentId,
            ]);
            throw $e;
        }
    }

    public function refundPayment(string $paymentId, float $amount, ?string $reason = null): array
    {
        $transaction = PaymentTransaction::findByPaymentId($paymentId, 'tamara');

        $payload = [
            'total_amount' => [
                'amount' => number_format($amount, 2, '.', ''),
                'currency' => $transaction->currency ?? 'AED',
            ],
        ];

        if ($reason) {
            $payload['comment'] = $reason;
        }

        try {
            $response = $this->request('POST', "/orders/{$paymentId}/refund", $payload);

            if ($transaction) {
                $transaction->markAsRefunded();
            }

            return [
                'success' => true,
                'refund_id' => $response['refund_id'] ?? null,
                'response' => $response,
            ];
        } catch (\Exception $e) {
            Log::error('Tamara refund error', [
                'error' => $e->getMessage(),
                'payment_id' => $paymentId,
            ]);
            throw $e;
        }
    }

    public function getPaymentStatus(string $paymentId): array
    {
        try {
            $response = $this->request('GET', "/orders/{$paymentId}");

            return [
                'success' => true,
                'status' => $response['status'] ?? 'unknown',
                'payment' => $response,
            ];
        } catch (\Exception $e) {
            Log::error('Tamara status check error', [
                'error' => $e->getMessage(),
                'payment_id' => $paymentId,
            ]);
            throw $e;
        }
    }

    public function handleWebhook(array $payload, array $headers = []): ?PaymentTransaction
    {
        $eventType = $payload['event_type'] ?? null;
        $orderId = $payload['order_id'] ?? $payload['data']['order_id'] ?? null;

        if (!$orderId) {
            Log::warning('Tamara webhook: No order ID in payload', $payload);
            return null;
        }

        $transaction = PaymentTransaction::findByPaymentId($orderId, 'tamara');

        if (!$transaction) {
            Log::warning('Tamara webhook: Transaction not found', ['order_id' => $orderId]);
            return null;
        }

        // Map Tamara event types to our status
        $statusMap = [
            'order_approved' => PaymentTransaction::STATUS_AUTHORIZED,
            'order_confirmed' => PaymentTransaction::STATUS_AUTHORIZED,
            'order_captured' => PaymentTransaction::STATUS_CAPTURED,
            'order_declined' => PaymentTransaction::STATUS_FAILED,
            'order_cancelled' => PaymentTransaction::STATUS_CANCELLED,
            'order_expired' => PaymentTransaction::STATUS_EXPIRED,
            'order_refunded' => PaymentTransaction::STATUS_REFUNDED,
        ];

        $newStatus = $statusMap[$eventType] ?? null;

        if ($newStatus) {
            $transaction->updateFromWebhook($payload, $newStatus);

            // Update order payment status
            if (in_array($newStatus, [PaymentTransaction::STATUS_AUTHORIZED, PaymentTransaction::STATUS_CAPTURED])) {
                $transaction->order->update(['payment_status' => 'paid']);
            } elseif ($newStatus === PaymentTransaction::STATUS_FAILED) {
                $transaction->order->update(['payment_status' => 'failed']);
            }
        }

        return $transaction;
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        // Tamara uses token verification
        $expectedSignature = hash_hmac('sha256', $payload, $this->apiToken);
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Authorize a payment (called after customer completes checkout)
     */
    public function authorizePayment(string $orderId): array
    {
        try {
            $response = $this->request('POST', "/orders/{$orderId}/authorise", []);

            $transaction = PaymentTransaction::findByPaymentId($orderId, 'tamara');
            if ($transaction) {
                $transaction->markAsAuthorized($response['order_id'] ?? null);
            }

            return [
                'success' => true,
                'order_id' => $response['order_id'] ?? $orderId,
                'response' => $response,
            ];
        } catch (\Exception $e) {
            Log::error('Tamara authorize error', [
                'error' => $e->getMessage(),
                'order_id' => $orderId,
            ]);
            throw $e;
        }
    }

    /**
     * Make API request to Tamara
     */
    protected function request(string $method, string $endpoint, array $data = []): array
    {
        $url = rtrim($this->apiUrl, '/') . '/' . ltrim($endpoint, '/');

        $client = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiToken,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])->timeout(30);

        // Disable SSL verification in local environment
        if (app()->environment('local')) {
            $client = $client->withoutVerifying();
        }

        try {
            if ($method === 'GET') {
                $response = $client->get($url, $data);
            } else {
                $response = $client->post($url, $data);
            }

            $result = $response->json();

            if ($response->failed()) {
                Log::error('Tamara API error', [
                    'url' => $url,
                    'status' => $response->status(),
                    'response' => $result,
                ]);

                $errorMessage = $result['message'] ?? 'Tamara API request failed';
                if (isset($result['errors']) && is_array($result['errors'])) {
                    $errorMessage = implode(', ', array_map(fn($e) => $e['error_message'] ?? $e, $result['errors']));
                }

                throw new \RuntimeException($errorMessage);
            }

            return $result ?? [];
        } catch (\Exception $e) {
            Log::error('Tamara API exception', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Format phone number for Tamara
     */
    protected function formatPhone(string $phone): string
    {
        // Remove any non-digit characters except +
        $phone = preg_replace('/[^\d+]/', '', $phone);

        // Ensure it starts with country code
        if (!str_starts_with($phone, '+')) {
            // Assume UAE if no country code
            $phone = '+971' . ltrim($phone, '0');
        }

        return $phone;
    }

    /**
     * Get country code from order
     */
    protected function getCountryCode(Order $order): string
    {
        // Try to get from shipping country
        if ($order->shipping_country) {
            $country = strtoupper(substr($order->shipping_country, 0, 2));
            if (in_array($country, ['AE', 'SA', 'KW', 'BH', 'QA'])) {
                return $country;
            }
        }

        // Try from country relationship
        if ($order->country) {
            $code = strtoupper($order->country->code ?? '');
            if (in_array($code, ['AE', 'SA', 'KW', 'BH', 'QA'])) {
                return $code;
            }
        }

        // Default to UAE
        return 'AE';
    }
}
