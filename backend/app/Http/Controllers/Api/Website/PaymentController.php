<?php

namespace App\Http\Controllers\Api\Website;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentGateway;
use App\Models\PaymentTransaction;
use App\Services\PaymentGateways\TabbyService;
use App\Services\PaymentGateways\TamaraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * Get available BNPL payment gateways with eligibility info
     */
    public function getAvailableGateways(Request $request): JsonResponse
    {
        $amount = $request->input('amount', 0);

        $gateways = PaymentGateway::active()
            ->configured()
            ->get()
            ->map(function ($gateway) use ($amount) {
                $isEligible = $amount > 0 ? $gateway->isAmountEligible($amount) : true;

                return [
                    'name' => $gateway->name,
                    'display_name' => $gateway->display_name,
                    'description' => $gateway->description,
                    'logo' => $gateway->logo,
                    'is_eligible' => $isEligible,
                    'min_amount' => $gateway->min_amount,
                    'max_amount' => $gateway->max_amount,
                    'installments_count' => $gateway->installments_count,
                    'installment_amount' => $amount > 0 ? $gateway->getInstallmentAmount($amount) : null,
                    'message' => $this->getEligibilityMessage($gateway, $amount, $isEligible),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $gateways,
        ]);
    }

    /**
     * Initiate BNPL payment for an order
     */
    public function initiatePayment(Request $request): JsonResponse
    {
        $request->validate([
            'order_id' => 'required|integer|exists:orders,id',
            'gateway' => 'required|string|in:tabby,tamara',
            'success_url' => 'nullable|url',
            'failure_url' => 'nullable|url',
            'cancel_url' => 'nullable|url',
        ]);

        $order = Order::with(['items.product', 'items.product.categories', 'user', 'country'])
            ->findOrFail($request->order_id);

        // Check if order belongs to user (if authenticated)
        if ($request->user() && $order->user_id && $order->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to order',
            ], 403);
        }

        // Verify order is in correct state
        if (!in_array($order->payment_status, ['pending', 'unpaid', null, ''])) {
            return response()->json([
                'success' => false,
                'message' => 'Order has already been paid or is in invalid state',
            ], 400);
        }

        $gateway = PaymentGateway::where('name', $request->gateway)
            ->active()
            ->first();

        if (!$gateway || !$gateway->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => ucfirst($request->gateway) . ' payment is not available',
            ], 400);
        }

        if (!$gateway->isAmountEligible($order->total)) {
            return response()->json([
                'success' => false,
                'message' => "Order amount must be between {$gateway->min_amount} and {$gateway->max_amount} AED for " . $gateway->display_name,
            ], 400);
        }

        try {
            $service = $this->getPaymentService($request->gateway);

            $options = array_filter([
                'success_url' => $request->success_url,
                'failure_url' => $request->failure_url,
                'cancel_url' => $request->cancel_url,
                'lang' => $request->input('lang', 'en'),
            ]);

            $result = $service->createCheckoutSession($order, $options);

            // Update order payment method
            $order->update([
                'payment_method' => $request->gateway,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment session created',
                'data' => [
                    'checkout_url' => $result['checkout_url'],
                    'payment_id' => $result['payment_id'],
                    'order_id' => $order->id,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Payment initiation failed', [
                'order_id' => $order->id,
                'gateway' => $request->gateway,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle callback from payment gateway (customer return)
     */
    public function handleCallback(Request $request, string $gateway): JsonResponse
    {
        $orderId = $request->input('order_id');
        $paymentId = $request->input('payment_id') ?? $request->input('checkout_id');
        $status = $request->input('status');

        if (!$orderId) {
            return response()->json([
                'success' => false,
                'message' => 'Missing order ID',
            ], 400);
        }

        $order = Order::find($orderId);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }

        $transaction = $order->latestPaymentTransaction;

        // If cancelled, update status
        if ($status === 'cancelled') {
            if ($transaction) {
                $transaction->update(['status' => PaymentTransaction::STATUS_CANCELLED]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Payment was cancelled',
                'data' => [
                    'order_id' => $order->id,
                    'status' => 'cancelled',
                ],
            ]);
        }

        try {
            // Get payment status from gateway
            $service = $this->getPaymentService($gateway);
            $paymentIdToCheck = $paymentId ?? $transaction->payment_id ?? $order->transaction_id;

            if ($paymentIdToCheck) {
                $statusResult = $service->getPaymentStatus($paymentIdToCheck);

                // For Tamara, we need to authorize the payment after customer approval
                if ($gateway === 'tamara' && in_array($statusResult['status'], ['approved', 'new'])) {
                    $service->authorizePayment($paymentIdToCheck);
                    $statusResult['status'] = 'authorized';
                }

                // Map gateway status to our status
                $paymentStatus = $this->mapGatewayStatus($gateway, $statusResult['status']);

                // Update transaction
                if ($transaction) {
                    $transaction->update([
                        'status' => $paymentStatus,
                        'gateway_response' => array_merge(
                            $transaction->gateway_response ?? [],
                            ['callback_response' => $statusResult]
                        ),
                    ]);
                }

                // Update order payment status
                if (in_array($paymentStatus, [PaymentTransaction::STATUS_AUTHORIZED, PaymentTransaction::STATUS_CAPTURED, PaymentTransaction::STATUS_PAID])) {
                    $order->update([
                        'payment_status' => 'paid',
                        'paid_at' => now(),
                    ]);

                    return response()->json([
                        'success' => true,
                        'message' => 'Payment successful',
                        'data' => [
                            'order_id' => $order->id,
                            'order_number' => $order->order_number,
                            'status' => 'paid',
                        ],
                    ]);
                }
            }

            return response()->json([
                'success' => false,
                'message' => 'Payment not completed',
                'data' => [
                    'order_id' => $order->id,
                    'status' => $transaction->status ?? 'pending',
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Payment callback error', [
                'order_id' => $orderId,
                'gateway' => $gateway,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error processing payment callback',
            ], 500);
        }
    }

    /**
     * Handle webhook notification from payment gateway
     */
    public function handleWebhook(Request $request, string $gateway): JsonResponse
    {
        Log::info("Payment webhook received: {$gateway}", [
            'payload' => $request->all(),
            'headers' => $request->headers->all(),
        ]);

        try {
            $service = $this->getPaymentService($gateway);

            // Verify signature if provided
            $signature = $request->header('X-Signature') ?? $request->header('x-signature');
            if ($signature) {
                $isValid = $service->verifyWebhookSignature(
                    $request->getContent(),
                    $signature
                );

                if (!$isValid) {
                    Log::warning("Invalid webhook signature for {$gateway}");
                    return response()->json(['error' => 'Invalid signature'], 401);
                }
            }

            // Process webhook
            $transaction = $service->handleWebhook(
                $request->all(),
                $request->headers->all()
            );

            if ($transaction) {
                Log::info("Webhook processed successfully", [
                    'gateway' => $gateway,
                    'transaction_id' => $transaction->id,
                    'status' => $transaction->status,
                ]);
            }

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            Log::error("Webhook processing error for {$gateway}", [
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    /**
     * Get payment status for an order
     */
    public function getPaymentStatus(Request $request, int $orderId): JsonResponse
    {
        $order = Order::with('latestPaymentTransaction')->find($orderId);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }

        $transaction = $order->latestPaymentTransaction;

        return response()->json([
            'success' => true,
            'data' => [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method,
                'transaction' => $transaction ? [
                    'id' => $transaction->id,
                    'status' => $transaction->status,
                    'gateway' => $transaction->gateway,
                    'amount' => $transaction->amount,
                    'created_at' => $transaction->created_at,
                ] : null,
            ],
        ]);
    }

    /**
     * Get payment service instance
     */
    protected function getPaymentService(string $gateway)
    {
        return match ($gateway) {
            'tabby' => new TabbyService(),
            'tamara' => new TamaraService(),
            default => throw new \InvalidArgumentException("Unknown payment gateway: {$gateway}"),
        };
    }

    /**
     * Map gateway status to our transaction status
     */
    protected function mapGatewayStatus(string $gateway, string $status): string
    {
        $statusMaps = [
            'tabby' => [
                'created' => PaymentTransaction::STATUS_CREATED,
                'approved' => PaymentTransaction::STATUS_AUTHORIZED,
                'authorized' => PaymentTransaction::STATUS_AUTHORIZED,
                'captured' => PaymentTransaction::STATUS_CAPTURED,
                'closed' => PaymentTransaction::STATUS_PAID,
                'rejected' => PaymentTransaction::STATUS_FAILED,
                'expired' => PaymentTransaction::STATUS_EXPIRED,
            ],
            'tamara' => [
                'new' => PaymentTransaction::STATUS_PENDING,
                'approved' => PaymentTransaction::STATUS_AUTHORIZED,
                'authorised' => PaymentTransaction::STATUS_AUTHORIZED,
                'captured' => PaymentTransaction::STATUS_CAPTURED,
                'fully_captured' => PaymentTransaction::STATUS_CAPTURED,
                'declined' => PaymentTransaction::STATUS_FAILED,
                'cancelled' => PaymentTransaction::STATUS_CANCELLED,
                'expired' => PaymentTransaction::STATUS_EXPIRED,
            ],
        ];

        return $statusMaps[$gateway][strtolower($status)] ?? PaymentTransaction::STATUS_PENDING;
    }

    /**
     * Get eligibility message for gateway
     */
    protected function getEligibilityMessage(PaymentGateway $gateway, float $amount, bool $isEligible): ?string
    {
        if ($amount <= 0) {
            return null;
        }

        if ($isEligible) {
            $installmentAmount = $gateway->getInstallmentAmount($amount);
            return "{$gateway->installments_count} payments of {$installmentAmount} AED";
        }

        if ($amount < $gateway->min_amount) {
            return "Add " . number_format($gateway->min_amount - $amount, 2) . " AED more to use " . $gateway->display_name;
        }

        if ($amount > $gateway->max_amount) {
            return "Maximum amount for " . $gateway->display_name . " is " . number_format($gateway->max_amount, 2) . " AED";
        }

        return null;
    }
}
