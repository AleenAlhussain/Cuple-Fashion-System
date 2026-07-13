<?php

namespace App\Services\PaymentGateways;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Order;
use App\Models\PaymentGateway;
use App\Models\PaymentTransaction;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TabbyService implements PaymentGatewayInterface
{
    protected PaymentGateway $gateway;
    protected string $apiUrl;
    protected string $secretKey;

    public function __construct()
    {
        $this->gateway = PaymentGateway::findByName('tabby');

        if (!$this->gateway) {
            throw new \RuntimeException('Tabby gateway not configured');
        }

        $this->apiUrl = $this->gateway->api_base_url;
        $this->secretKey = $this->gateway->decrypted_secret_key ?? '';
    }

    public function getName(): string
    {
        return 'tabby';
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
            'description' => "Pay in {$this->gateway->installments_count} interest-free payments",
        ];
    }

    public function createCheckoutSession(Order $order, array $options = []): array
    {
        $successUrl = $options['success_url'] ?? config('app.frontend_url') . '/checkout/payment/success';
        $failureUrl = $options['failure_url'] ?? config('app.frontend_url') . '/checkout/payment/failure';
        $cancelUrl = $options['cancel_url'] ?? config('app.frontend_url') . '/checkout';

        // Build order items
        $items = [];
        foreach ($order->items as $item) {
            $items[] = [
                'title' => $item->product->name ?? 'Product',
                'quantity' => $item->quantity,
                'unit_price' => number_format($item->single_price, 2, '.', ''),
                'category' => $item->product->categories->first()->name ?? 'General',
                'reference_id' => (string) $item->id,
                'image_url' => $item->product->main_image_url ?? null,
            ];
        }

        // Build buyer info
        $buyer = [
            'phone' => $this->formatPhone($order->shipping_phone),
            'email' => $order->shipping_email,
            'name' => trim($order->shipping_first_name . ' ' . $order->shipping_last_name),
        ];

        // Build shipping address
        $shippingAddress = [
            'city' => $order->shipping_city ?? '',
            'address' => $order->shipping_street ?? '',
            'zip' => $order->shipping_postal_code ?? '',
        ];

        // Build order payload
        $payload = [
            'payment' => [
                'amount' => number_format($order->total, 2, '.', ''),
                'currency' => $order->currency ?? 'AED',
                'buyer' => $buyer,
                'buyer_history' => [
                    'registered_since' => $order->user ? $order->user->created_at->toIso8601String() : now()->toIso8601String(),
                    'loyalty_level' => 0,
                ],
                'order' => [
                    'reference_id' => $order->order_number,
                    'items' => $items,
                    'shipping_amount' => number_format($order->shipping_amount ?? 0, 2, '.', ''),
                    'tax_amount' => number_format($order->tax_amount ?? 0, 2, '.', ''),
                    'discount_amount' => number_format(($order->discount_amount ?? 0) + ($order->rule_discount_amount ?? 0) + ($order->gift_box_discount_amount ?? 0), 2, '.', ''),
                ],
                'shipping_address' => $shippingAddress,
            ],
            'lang' => $options['lang'] ?? 'en',
            'merchant_code' => $this->gateway->merchant_code,
            'merchant_urls' => [
                'success' => $successUrl . '?order_id=' . $order->id . '&gateway=tabby',
                'cancel' => $cancelUrl . '?order_id=' . $order->id . '&gateway=tabby&status=cancelled',
                'failure' => $failureUrl . '?order_id=' . $order->id . '&gateway=tabby',
            ],
        ];

        try {
            $response = $this->request('POST', '/checkout', $payload);

            if (!isset($response['id']) || !isset($response['configuration']['available_products']['installments'])) {
                Log::error('Tabby checkout creation failed', ['response' => $response]);
                throw new \RuntimeException($response['error'] ?? 'Failed to create Tabby checkout session');
            }

            // Find the web URL from available products
            $checkoutUrl = null;
            foreach ($response['configuration']['available_products']['installments'] ?? [] as $product) {
                if (isset($product['web_url'])) {
                    $checkoutUrl = $product['web_url'];
                    break;
                }
            }

            if (!$checkoutUrl) {
                throw new \RuntimeException('No checkout URL returned from Tabby');
            }

            // Create transaction record
            $transaction = PaymentTransaction::create([
                'order_id' => $order->id,
                'gateway' => 'tabby',
                'payment_id' => $response['id'],
                'status' => PaymentTransaction::STATUS_CREATED,
                'amount' => $order->total,
                'currency' => $order->currency ?? 'AED',
                'gateway_response' => $response,
            ]);

            // Update order with transaction ID
            $order->update([
                'transaction_id' => $response['id'],
            ]);

            return [
                'success' => true,
                'checkout_url' => $checkoutUrl,
                'payment_id' => $response['id'],
                'transaction_id' => $transaction->id,
            ];
        } catch (\Exception $e) {
            Log::error('Tabby checkout error', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
            throw $e;
        }
    }

    public function capturePayment(string $paymentId, ?float $amount = null): array
    {
        $payload = [];

        if ($amount !== null) {
            $payload['amount'] = number_format($amount, 2, '.', '');
        }

        try {
            $response = $this->request('POST', "/payments/{$paymentId}/captures", $payload);

            // Update transaction
            $transaction = PaymentTransaction::findByPaymentId($paymentId, 'tabby');
            if ($transaction) {
                $transaction->markAsCaptured($response['id'] ?? null);
            }

            return [
                'success' => true,
                'capture_id' => $response['id'] ?? null,
                'response' => $response,
            ];
        } catch (\Exception $e) {
            Log::error('Tabby capture error', [
                'error' => $e->getMessage(),
                'payment_id' => $paymentId,
            ]);
            throw $e;
        }
    }

    public function refundPayment(string $paymentId, float $amount, ?string $reason = null): array
    {
        $payload = [
            'amount' => number_format($amount, 2, '.', ''),
        ];

        if ($reason) {
            $payload['reason'] = $reason;
        }

        try {
            $response = $this->request('POST', "/payments/{$paymentId}/refunds", $payload);

            // Update transaction
            $transaction = PaymentTransaction::findByPaymentId($paymentId, 'tabby');
            if ($transaction) {
                $transaction->markAsRefunded();
            }

            return [
                'success' => true,
                'refund_id' => $response['id'] ?? null,
                'response' => $response,
            ];
        } catch (\Exception $e) {
            Log::error('Tabby refund error', [
                'error' => $e->getMessage(),
                'payment_id' => $paymentId,
            ]);
            throw $e;
        }
    }

    public function getPaymentStatus(string $paymentId): array
    {
        try {
            $response = $this->request('GET', "/payments/{$paymentId}");

            return [
                'success' => true,
                'status' => $response['status'] ?? 'unknown',
                'payment' => $response,
            ];
        } catch (\Exception $e) {
            Log::error('Tabby status check error', [
                'error' => $e->getMessage(),
                'payment_id' => $paymentId,
            ]);
            throw $e;
        }
    }

    public function handleWebhook(array $payload, array $headers = []): ?PaymentTransaction
    {
        $paymentId = $payload['id'] ?? $payload['payment']['id'] ?? null;
        $status = $payload['status'] ?? null;

        if (!$paymentId) {
            Log::warning('Tabby webhook: No payment ID in payload', $payload);
            return null;
        }

        $transaction = PaymentTransaction::findByPaymentId($paymentId, 'tabby');

        if (!$transaction) {
            Log::warning('Tabby webhook: Transaction not found', ['payment_id' => $paymentId]);
            return null;
        }

        // Map Tabby status to our status
        $statusMap = [
            'created' => PaymentTransaction::STATUS_CREATED,
            'approved' => PaymentTransaction::STATUS_AUTHORIZED,
            'authorized' => PaymentTransaction::STATUS_AUTHORIZED,
            'captured' => PaymentTransaction::STATUS_CAPTURED,
            'closed' => PaymentTransaction::STATUS_PAID,
            'rejected' => PaymentTransaction::STATUS_FAILED,
            'expired' => PaymentTransaction::STATUS_EXPIRED,
        ];

        $newStatus = $statusMap[$status] ?? $transaction->status;

        $transaction->updateFromWebhook($payload, $newStatus);

        // Update order payment status
        if (in_array($newStatus, [PaymentTransaction::STATUS_AUTHORIZED, PaymentTransaction::STATUS_CAPTURED, PaymentTransaction::STATUS_PAID])) {
            $transaction->order->update(['payment_status' => 'paid']);
        } elseif ($newStatus === PaymentTransaction::STATUS_FAILED) {
            $transaction->order->update(['payment_status' => 'failed']);
        }

        return $transaction;
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        // Tabby uses a simple header verification
        // The webhook secret should match
        $expectedSignature = hash_hmac('sha256', $payload, $this->secretKey);
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Make API request to Tabby
     */
    protected function request(string $method, string $endpoint, array $data = []): array
    {
        $url = rtrim($this->apiUrl, '/') . '/' . ltrim($endpoint, '/');

        $client = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->secretKey,
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
                Log::error('Tabby API error', [
                    'url' => $url,
                    'status' => $response->status(),
                    'response' => $result,
                ]);
                throw new \RuntimeException($result['error'] ?? $result['message'] ?? 'Tabby API request failed');
            }

            return $result ?? [];
        } catch (\Exception $e) {
            Log::error('Tabby API exception', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Format phone number for Tabby
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
}
