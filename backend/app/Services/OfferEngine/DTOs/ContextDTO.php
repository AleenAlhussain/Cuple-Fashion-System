<?php

namespace App\Services\OfferEngine\DTOs;

use Carbon\Carbon;

class ContextDTO
{
    public function __construct(
        public readonly ?int $user_id = null,
        public readonly string $country = 'AE',
        public readonly ?Carbon $now = null,
        public readonly string $timezone = 'Asia/Dubai',
        public readonly ?string $user_role = null,
        public readonly bool $is_first_order = false,
        public readonly bool $is_preview = false,
        public readonly float $cart_subtotal = 0,
        public readonly int $cart_qty = 0,
        public readonly ?string $promo_code = null,
    ) {}

    /**
     * Create from array data.
     */
    public static function fromArray(array $data): self
    {
        $now = null;
        if (isset($data['now'])) {
            $now = $data['now'] instanceof Carbon
                ? $data['now']
                : Carbon::parse($data['now']);
        }

        return new self(
            user_id: isset($data['user_id']) ? (int) $data['user_id'] : null,
            country: $data['country'] ?? 'AE',
            now: $now,
            timezone: $data['timezone'] ?? 'Asia/Dubai',
            user_role: $data['user_role'] ?? null,
            is_first_order: (bool) ($data['is_first_order'] ?? false),
            is_preview: (bool) ($data['is_preview'] ?? false),
            cart_subtotal: (float) ($data['cart_subtotal'] ?? 0),
            cart_qty: (int) ($data['cart_qty'] ?? 0),
            promo_code: $data['promo_code'] ?? null,
        );
    }

    /**
     * Get current time, defaulting to now if not set.
     */
    public function getCurrentTime(): Carbon
    {
        return $this->now ?? Carbon::now($this->timezone);
    }

    /**
     * Convert to array for condition evaluation.
     */
    public function toConditionData(): array
    {
        return [
            'user_id' => $this->user_id,
            'country' => $this->country,
            'user_role' => $this->user_role,
            'is_first_order' => $this->is_first_order,
            'cart_subtotal' => $this->cart_subtotal,
            'cart_qty' => $this->cart_qty,
            'promo_code' => $this->promo_code,
        ];
    }

    /**
     * Check if this is a guest user.
     */
    public function isGuest(): bool
    {
        return $this->user_id === null;
    }
}
