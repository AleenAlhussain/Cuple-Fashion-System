<?php

namespace App\Services\OfferEngine\DTOs;

class DiscountResultDTO
{
    /**
     * @param array $adjusted_items Per-line item discounts
     * @param float $cart_discount_total Total cart-level discount
     * @param array $free_items Free quantities (represented as discounts)
     * @param array $applied_rules Rules that were applied
     * @param array $messages Offer messages to show
     */
    public function __construct(
        public array $adjusted_items = [],
        public float $cart_discount_total = 0,
        public array $free_items = [],
        public array $applied_rules = [],
        public array $messages = [],
    ) {}

    /**
     * Add an adjusted item discount.
     */
    public function addAdjustedItem(
        int $variant_id,
        float $original_price,
        float $adjusted_price,
        float $discount_amount,
        int $qty,
        int $rule_id,
        string $rule_name
    ): self {
        $this->adjusted_items[] = [
            'variant_id' => $variant_id,
            'original_price' => $original_price,
            'adjusted_price' => $adjusted_price,
            'discount_amount' => $discount_amount,
            'discount_per_unit' => $qty > 0 ? $discount_amount / $qty : 0,
            'qty' => $qty,
            'rule_id' => $rule_id,
            'rule_name' => $rule_name,
        ];

        return $this;
    }

    /**
     * Add a cart-level discount.
     */
    public function addCartDiscount(float $amount): self
    {
        $this->cart_discount_total += $amount;
        return $this;
    }

    /**
     * Add a free item entry.
     */
    public function addFreeItem(
        int $variant_id,
        float $unit_price,
        int $free_qty,
        float $discount_amount,
        int $rule_id,
        string $rule_name
    ): self {
        $this->free_items[] = [
            'variant_id' => $variant_id,
            'unit_price' => $unit_price,
            'free_qty' => $free_qty,
            'discount_amount' => $discount_amount,
            'rule_id' => $rule_id,
            'rule_name' => $rule_name,
        ];

        return $this;
    }

    /**
     * Add an applied rule.
     */
    public function addAppliedRule(
        int $rule_id,
        string $rule_name,
        string $rule_type,
        float $discount_amount,
        array $affected_variants = []
    ): self {
        $this->applied_rules[] = [
            'id' => $rule_id,
            'name' => $rule_name,
            'type' => $rule_type,
            'discount_amount' => $discount_amount,
            'affected_variants' => $affected_variants,
        ];

        return $this;
    }

    /**
     * Add a message.
     */
    public function addMessage(string $message): self
    {
        if (!empty($message) && !in_array($message, $this->messages)) {
            $this->messages[] = $message;
        }
        return $this;
    }

    /**
     * Get total discount from all sources.
     */
    public function getTotalDiscount(): float
    {
        $itemDiscounts = array_sum(array_column($this->adjusted_items, 'discount_amount'));
        $freeItemDiscounts = array_sum(array_column($this->free_items, 'discount_amount'));

        return $itemDiscounts + $freeItemDiscounts + $this->cart_discount_total;
    }

    /**
     * Get discount for a specific variant.
     */
    public function getVariantDiscount(int $variant_id): float
    {
        $discount = 0;

        foreach ($this->adjusted_items as $item) {
            if ($item['variant_id'] === $variant_id) {
                $discount += $item['discount_amount'];
            }
        }

        foreach ($this->free_items as $item) {
            if ($item['variant_id'] === $variant_id) {
                $discount += $item['discount_amount'];
            }
        }

        return $discount;
    }

    /**
     * Check if any discounts were applied.
     */
    public function hasDiscounts(): bool
    {
        return !empty($this->adjusted_items)
            || !empty($this->free_items)
            || $this->cart_discount_total > 0;
    }

    /**
     * Get list of applied rule IDs.
     */
    public function getAppliedRuleIds(): array
    {
        return array_unique(array_column($this->applied_rules, 'id'));
    }

    /**
     * Get applied rules summary for frontend.
     */
    public function getAppliedRulesSummary(): array
    {
        return array_map(function ($rule) {
            return [
                'id' => $rule['id'],
                'name' => $rule['name'],
                'amount' => $rule['discount_amount'],
                'type' => $rule['type'],
            ];
        }, $this->applied_rules);
    }

    /**
     * Get applied rules data for usage recording.
     */
    public function getAppliedRulesForRecording(): array
    {
        return array_map(function ($rule) {
            return [
                'rule_id' => $rule['id'],
                'rule_name' => $rule['name'],
                'discount_amount' => $rule['discount_amount'],
                'affected_variants' => $rule['affected_variants'] ?? [],
            ];
        }, $this->applied_rules);
    }

    /**
     * Merge another result into this one.
     */
    public function merge(DiscountResultDTO $other): self
    {
        $this->adjusted_items = array_merge($this->adjusted_items, $other->adjusted_items);
        $this->cart_discount_total += $other->cart_discount_total;
        $this->free_items = array_merge($this->free_items, $other->free_items);
        $this->applied_rules = array_merge($this->applied_rules, $other->applied_rules);

        foreach ($other->messages as $message) {
            $this->addMessage($message);
        }

        return $this;
    }

    /**
     * Convert to array.
     */
    public function toArray(): array
    {
        return [
            'adjusted_items' => $this->adjusted_items,
            'cart_discount_total' => round($this->cart_discount_total, 2),
            'free_items' => $this->free_items,
            'applied_rules' => $this->applied_rules,
            'messages' => $this->messages,
            'total_discount' => round($this->getTotalDiscount(), 2),
        ];
    }
}
