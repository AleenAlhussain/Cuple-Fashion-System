<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'order_id',
        'invoice_number',
        'subtotal',
        'discount_amount',
        'gift_box_discount_amount',
        'shipping_amount',
        'tax_amount',
        'total',
        'currency',
        'status',
        'pdf_path',
        'sent_at',
        'paid_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'gift_box_discount_amount' => 'decimal:2',
        'shipping_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'sent_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Generate invoice number
     * Format: INV-XXXXX (sequential)
     */
    public static function generateInvoiceNumber(Order $order): string
    {
        // Get count of existing invoices + 1 for new number
        $newNumber = self::count() + 1;

        return sprintf('INV-%05d', $newNumber);
    }

    /**
     * Create invoice from order
     */
    public static function createFromOrder(Order $order): self
    {
        return self::create([
            'order_id' => $order->id,
            'invoice_number' => self::generateInvoiceNumber($order),
            'subtotal' => $order->subtotal,
            'discount_amount' => $order->discount_amount ?? 0,
            'gift_box_discount_amount' => $order->gift_box_discount_amount ?? 0,
            'shipping_amount' => $order->shipping_amount ?? 0,
            'tax_amount' => $order->tax_amount ?? 0,
            'total' => $order->total,
            'currency' => $order->currency ?? 'AED',
            'status' => 'generated',
        ]);
    }

    /**
     * Mark invoice as sent
     */
    public function markAsSent(): void
    {
        $this->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);
    }

    /**
     * Mark invoice as paid
     */
    public function markAsPaid(): void
    {
        $this->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    /**
     * Get PDF storage path
     */
    public function getPdfStoragePath(): string
    {
        return 'invoices/' . $this->invoice_number . '.pdf';
    }
}
