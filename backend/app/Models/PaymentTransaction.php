<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
    protected $fillable = [
        'order_id',
        'gateway',
        'transaction_id',
        'payment_id',
        'status',
        'amount',
        'currency',
        'gateway_response',
        'webhook_payload',
        'authorized_at',
        'captured_at',
        'refunded_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'gateway_response' => 'array',
        'webhook_payload' => 'array',
        'authorized_at' => 'datetime',
        'captured_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_CREATED = 'created';
    const STATUS_AUTHORIZED = 'authorized';
    const STATUS_CAPTURED = 'captured';
    const STATUS_PAID = 'paid';
    const STATUS_FAILED = 'failed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_REFUNDED = 'refunded';
    const STATUS_EXPIRED = 'expired';

    /**
     * Get the order this transaction belongs to
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the payment gateway configuration
     */
    public function gatewayConfig(): ?PaymentGateway
    {
        return PaymentGateway::findByName($this->gateway);
    }

    /**
     * Check if transaction is successful
     */
    public function isSuccessful(): bool
    {
        return in_array($this->status, [
            self::STATUS_AUTHORIZED,
            self::STATUS_CAPTURED,
            self::STATUS_PAID,
        ]);
    }

    /**
     * Check if transaction is pending
     */
    public function isPending(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING,
            self::STATUS_CREATED,
        ]);
    }

    /**
     * Check if transaction failed
     */
    public function isFailed(): bool
    {
        return in_array($this->status, [
            self::STATUS_FAILED,
            self::STATUS_CANCELLED,
            self::STATUS_EXPIRED,
        ]);
    }

    /**
     * Mark as authorized
     */
    public function markAsAuthorized(string $transactionId = null): void
    {
        $this->update([
            'status' => self::STATUS_AUTHORIZED,
            'transaction_id' => $transactionId ?? $this->transaction_id,
            'authorized_at' => now(),
        ]);
    }

    /**
     * Mark as captured/paid
     */
    public function markAsCaptured(string $transactionId = null): void
    {
        $this->update([
            'status' => self::STATUS_CAPTURED,
            'transaction_id' => $transactionId ?? $this->transaction_id,
            'captured_at' => now(),
        ]);
    }

    /**
     * Mark as paid
     */
    public function markAsPaid(): void
    {
        $this->update([
            'status' => self::STATUS_PAID,
            'captured_at' => now(),
        ]);
    }

    /**
     * Mark as failed
     */
    public function markAsFailed(array $response = null): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'gateway_response' => $response ?? $this->gateway_response,
        ]);
    }

    /**
     * Mark as refunded
     */
    public function markAsRefunded(): void
    {
        $this->update([
            'status' => self::STATUS_REFUNDED,
            'refunded_at' => now(),
        ]);
    }

    /**
     * Update with webhook data
     */
    public function updateFromWebhook(array $payload, string $status = null): void
    {
        $data = ['webhook_payload' => $payload];

        if ($status) {
            $data['status'] = $status;
        }

        $this->update($data);
    }

    /**
     * Scope for successful transactions
     */
    public function scopeSuccessful($query)
    {
        return $query->whereIn('status', [
            self::STATUS_AUTHORIZED,
            self::STATUS_CAPTURED,
            self::STATUS_PAID,
        ]);
    }

    /**
     * Scope for pending transactions
     */
    public function scopePending($query)
    {
        return $query->whereIn('status', [
            self::STATUS_PENDING,
            self::STATUS_CREATED,
        ]);
    }

    /**
     * Scope for failed transactions
     */
    public function scopeFailed($query)
    {
        return $query->whereIn('status', [
            self::STATUS_FAILED,
            self::STATUS_CANCELLED,
            self::STATUS_EXPIRED,
        ]);
    }

    /**
     * Scope by gateway
     */
    public function scopeByGateway($query, string $gateway)
    {
        return $query->where('gateway', $gateway);
    }

    /**
     * Find by payment ID
     */
    public static function findByPaymentId(string $paymentId, string $gateway = null): ?self
    {
        $query = static::where('payment_id', $paymentId);

        if ($gateway) {
            $query->where('gateway', $gateway);
        }

        return $query->first();
    }
}
