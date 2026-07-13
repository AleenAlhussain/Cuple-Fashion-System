<?php

namespace Database\Factories;

use App\Models\DiscountRule;
use App\Models\DiscountRuleRange;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DiscountRuleRange>
 */
class DiscountRuleRangeFactory extends Factory
{
    protected $model = DiscountRuleRange::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'discount_rule_id' => DiscountRule::factory(),
            'min_qty' => 2,
            'max_qty' => null,
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'free_qty' => null,
        ];
    }

    /**
     * Percentage discount range.
     */
    public function percentage(int $minQty, float $value, ?int $maxQty = null): static
    {
        return $this->state(fn(array $attributes) => [
            'min_qty' => $minQty,
            'max_qty' => $maxQty,
            'discount_type' => 'percentage',
            'discount_value' => $value,
        ]);
    }

    /**
     * Fixed amount discount range.
     */
    public function fixedAmount(int $minQty, float $value, ?int $maxQty = null): static
    {
        return $this->state(fn(array $attributes) => [
            'min_qty' => $minQty,
            'max_qty' => $maxQty,
            'discount_type' => 'fixed_amount',
            'discount_value' => $value,
        ]);
    }

    /**
     * Fixed price range.
     */
    public function fixedPrice(int $minQty, float $price, ?int $maxQty = null): static
    {
        return $this->state(fn(array $attributes) => [
            'min_qty' => $minQty,
            'max_qty' => $maxQty,
            'discount_type' => 'fixed_price',
            'discount_value' => $price,
        ]);
    }

    /**
     * Free quantity range (for BOGO).
     */
    public function freeItems(int $buyQty, int $freeQty, ?int $maxBuyQty = null): static
    {
        return $this->state(fn(array $attributes) => [
            'min_qty' => $buyQty,
            'max_qty' => $maxBuyQty,
            'discount_type' => 'percentage',
            'discount_value' => 100,
            'free_qty' => $freeQty,
        ]);
    }

    /**
     * Bulk tier: Buy 2-4, get 10% off.
     */
    public function tier1(): static
    {
        return $this->percentage(2, 10, 4);
    }

    /**
     * Bulk tier: Buy 5-9, get 15% off.
     */
    public function tier2(): static
    {
        return $this->percentage(5, 15, 9);
    }

    /**
     * Bulk tier: Buy 10+, get 20% off.
     */
    public function tier3(): static
    {
        return $this->percentage(10, 20, null);
    }
}
