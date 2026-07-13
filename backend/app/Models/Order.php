<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'order_number',
        'user_id',
        'created_by_user_id',
        'sales_channel',
        'country_id',
        'status',
        'payment_status',
        'payment_method',
        'transaction_id',
        'subtotal',
        'discount_amount',
        'rule_discount_amount',
        'applied_discount_rules',
        'gift_box_discount_amount',
        'points_redeemed',
        'points_discount_amount',
        'shipping_amount',
        'tax_amount',
        'total',
        'currency',
        'coupon_code',
        'client_ip',
        'shipping_address_ip',
        'billing_address_ip',
        'shipping_latitude',
        'shipping_longitude',
        'billing_latitude',
        'billing_longitude',
        'shipping_first_name',
        'shipping_last_name',
        'shipping_phone',
        'shipping_email',
        'shipping_street',
        'shipping_apartment',
        'shipping_city',
        'shipping_state',
        'shipping_postal_code',
        'shipping_country',
        'billing_first_name',
        'billing_last_name',
        'billing_phone',
        'billing_email',
        'billing_street',
        'billing_apartment',
        'billing_city',
        'billing_state',
        'billing_postal_code',
        'billing_country',
        'shipping_method',
        'payment_fee',
        'tracking_number',
        'carrier',
        'shipped_at',
        'delivered_at',
        'paid_at',
        'customer_notes',
        'admin_notes',
        'is_guest',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'rule_discount_amount' => 'decimal:2',
        'applied_discount_rules' => 'array',
        'gift_box_discount_amount' => 'decimal:2',
        'points_redeemed' => 'integer',
        'points_discount_amount' => 'decimal:2',
        'shipping_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'payment_fee' => 'decimal:2',
        'shipping_latitude' => 'decimal:7',
        'shipping_longitude' => 'decimal:7',
        'billing_latitude' => 'decimal:7',
        'billing_longitude' => 'decimal:7',
        'is_guest' => 'boolean',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($order) {
            if (empty($order->order_number)) {
                $order->order_number = static::generateOrderNumber();
            }
        });
    }

    public static function generateOrderNumber(): string
    {
        // Get the last order number and increment
        $lastOrder = static::withTrashed()->orderBy('id', 'desc')->first();
        $nextNumber = $lastOrder ? ((int) $lastOrder->order_number + 1) : 1;

        // Return 5-digit padded number (00001, 00002, etc.)
        return str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function paymentTransactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class);
    }

    public function latestPaymentTransaction()
    {
        return $this->hasOne(PaymentTransaction::class)->latestOfMany();
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeProcessing($query)
    {
        return $query->where('status', 'processing');
    }

    public function scopeShipped($query)
    {
        return $query->where('status', 'shipped');
    }

    public function scopeDelivered($query)
    {
        return $query->where('status', 'delivered');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeByCountry($query, $countryId)
    {
        return $query->where('country_id', $countryId);
    }

    // Accessors
    public function getShippingFullNameAttribute()
    {
        return $this->shipping_first_name . ' ' . $this->shipping_last_name;
    }

    public function getShippingFullAddressAttribute()
    {
        $parts = array_filter([
            $this->shipping_street,
            $this->shipping_apartment,
            $this->shipping_city,
            $this->shipping_state,
            $this->shipping_postal_code,
            $this->shipping_country,
        ]);
        return implode(', ', $parts);
    }

    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['pending', 'confirmed']);
    }

    public function isPaid(): bool
    {
        return $this->payment_status === 'paid';
    }
}
