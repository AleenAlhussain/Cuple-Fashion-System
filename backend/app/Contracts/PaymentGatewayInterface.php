<?php

namespace App\Contracts;

use App\Models\Order;
use App\Models\PaymentTransaction;

interface PaymentGatewayInterface
{
    /**
     * Get the gateway name identifier
     */
    public function getName(): string;

    /**
     * Create a checkout session and return the redirect URL
     *
     * @param Order $order The order to create payment for
     * @param array $options Additional options (success_url, failure_url, etc.)
     * @return array Contains 'checkout_url' and 'payment_id'
     */
    public function createCheckoutSession(Order $order, array $options = []): array;

    /**
     * Capture an authorized payment
     *
     * @param string $paymentId The payment/checkout ID from the gateway
     * @param float|null $amount Optional amount to capture (for partial capture)
     * @return array The capture response
     */
    public function capturePayment(string $paymentId, ?float $amount = null): array;

    /**
     * Refund a payment
     *
     * @param string $paymentId The payment/checkout ID
     * @param float $amount The amount to refund
     * @param string|null $reason Optional refund reason
     * @return array The refund response
     */
    public function refundPayment(string $paymentId, float $amount, ?string $reason = null): array;

    /**
     * Get the current status of a payment
     *
     * @param string $paymentId The payment/checkout ID
     * @return array Contains 'status' and other payment details
     */
    public function getPaymentStatus(string $paymentId): array;

    /**
     * Process a webhook notification from the gateway
     *
     * @param array $payload The webhook payload
     * @param array $headers The webhook headers (for signature verification)
     * @return PaymentTransaction|null The updated transaction
     */
    public function handleWebhook(array $payload, array $headers = []): ?PaymentTransaction;

    /**
     * Verify webhook signature
     *
     * @param string $payload Raw payload string
     * @param string $signature Signature from headers
     * @return bool
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool;

    /**
     * Check if the gateway is properly configured
     */
    public function isConfigured(): bool;

    /**
     * Check if an amount is eligible for this gateway
     */
    public function isAmountEligible(float $amount): bool;

    /**
     * Get installment information for display
     *
     * @param float $total The total amount
     * @return array Contains 'count', 'amount_per_installment', 'currency'
     */
    public function getInstallmentInfo(float $total): array;
}
