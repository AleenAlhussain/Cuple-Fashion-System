<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

class PaymentGateway extends Model
{
    protected $fillable = [
        'name',
        'display_name',
        'description',
        'logo',
        'is_active',
        'is_sandbox',
        'public_key',
        'secret_key',
        'merchant_code',
        'min_amount',
        'max_amount',
        'installments_count',
        'supported_countries',
        'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_sandbox' => 'boolean',
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
        'installments_count' => 'integer',
        'supported_countries' => 'array',
        'settings' => 'array',
    ];

    protected $hidden = [
        'secret_key',
    ];

    /**
     * Encrypt secret key when setting
     */
    public function setSecretKeyAttribute($value): void
    {
        if ($value) {
            $this->attributes['secret_key'] = Crypt::encryptString($value);
        } else {
            $this->attributes['secret_key'] = null;
        }
    }

    /**
     * Decrypt secret key when getting
     */
    public function getDecryptedSecretKeyAttribute(): ?string
    {
        if ($this->attributes['secret_key'] ?? null) {
            try {
                return Crypt::decryptString($this->attributes['secret_key']);
            } catch (\Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Get transactions for this gateway
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class, 'gateway', 'name');
    }

    /**
     * Get API base URL based on sandbox mode
     */
    public function getApiBaseUrlAttribute(): string
    {
        $urls = [
            'tabby' => [
                'sandbox' => 'https://api.tabby.ai/api/v2',
                'production' => 'https://api.tabby.ai/api/v2',
            ],
            'tamara' => [
                'sandbox' => 'https://api-sandbox.tamara.co',
                'production' => 'https://api.tamara.co',
            ],
        ];

        $mode = $this->is_sandbox ? 'sandbox' : 'production';
        return $urls[$this->name][$mode] ?? '';
    }

    /**
     * Check if gateway is configured (has required credentials)
     */
    public function isConfigured(): bool
    {
        return !empty($this->public_key) && !empty($this->attributes['secret_key']);
    }

    /**
     * Check if amount is within gateway limits
     */
    public function isAmountEligible(float $amount): bool
    {
        return $amount >= $this->min_amount && $amount <= $this->max_amount;
    }

    /**
     * Calculate installment amount
     */
    public function getInstallmentAmount(float $total): float
    {
        if ($this->installments_count <= 0) {
            return $total;
        }
        return round($total / $this->installments_count, 2);
    }

    /**
     * Scope for active gateways
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for configured gateways
     */
    public function scopeConfigured($query)
    {
        return $query->whereNotNull('public_key')
                    ->whereNotNull('secret_key');
    }

    /**
     * Get gateway by name
     */
    public static function findByName(string $name): ?self
    {
        return static::where('name', $name)->first();
    }
}
