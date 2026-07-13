<?php

namespace Database\Factories;

use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Models\DiscountRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DiscountRule>
 */
class DiscountRuleFactory extends Factory
{
    protected $model = DiscountRule::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true) . ' Discount',
            'internal_code' => strtoupper(fake()->unique()->bothify('DISC-####')),
            'description' => fake()->optional()->sentence(),
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => fake()->randomFloat(2, 5, 50),
            'is_active' => true,
            'priority' => fake()->numberBetween(1, 100),
            'stop_other_rules' => false,
            'is_stackable' => true,
            'max_discount_amount' => null,
            'max_affected_items' => null,
            'max_applications' => null,
            'min_qty' => 1,
            'is_recursive' => false,
            'recursive_step' => null,
            'usage_limit_per_user' => null,
            'usage_limit_total' => null,
            'offer_message' => null,
            'starts_at' => null,
            'ends_at' => null,
        ];
    }

    /**
     * Product discount rule state.
     */
    public function product(): static
    {
        return $this->state(fn(array $attributes) => [
            'rule_type' => DiscountRuleType::PRODUCT,
        ]);
    }

    /**
     * Cart discount rule state.
     */
    public function cart(): static
    {
        return $this->state(fn(array $attributes) => [
            'rule_type' => DiscountRuleType::CART,
        ]);
    }

    /**
     * Bulk discount rule state.
     */
    public function bulk(): static
    {
        return $this->state(fn(array $attributes) => [
            'rule_type' => DiscountRuleType::BULK,
            'min_qty' => 2,
        ]);
    }

    /**
     * BOGO (Buy X Get Y) discount rule state.
     */
    public function bogo(): static
    {
        return $this->state(fn(array $attributes) => [
            'rule_type' => DiscountRuleType::BOGO,
            'buy_qty' => 2,
            'get_qty' => 1,
            'discount_value' => 100, // 100% off the free item
            'max_free_qty_per_order' => null,
        ]);
    }

    /**
     * BOGO with max free quantity per order.
     */
    public function bogoWithMaxFree(int $maxFree): static
    {
        return $this->bogo()->state(fn(array $attributes) => [
            'max_free_qty_per_order' => $maxFree,
        ]);
    }

    /**
     * Bundle discount rule state.
     */
    public function bundle(): static
    {
        return $this->state(fn(array $attributes) => [
            'rule_type' => DiscountRuleType::BUNDLE,
            'bundle_qty' => 3,
            'bundle_price' => fake()->randomFloat(2, 50, 200),
        ]);
    }

    /**
     * Percentage discount type state.
     */
    public function percentage(?float $value = null): static
    {
        return $this->state(fn(array $attributes) => [
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => $value ?? fake()->randomFloat(2, 5, 50),
        ]);
    }

    /**
     * Fixed amount discount type state.
     */
    public function fixedAmount(?float $value = null): static
    {
        return $this->state(fn(array $attributes) => [
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => $value ?? fake()->randomFloat(2, 10, 100),
        ]);
    }

    /**
     * Fixed price discount type state.
     */
    public function fixedPrice(?float $value = null): static
    {
        return $this->state(fn(array $attributes) => [
            'discount_type' => DiscountType::FIXED_PRICE,
            'discount_value' => $value ?? fake()->randomFloat(2, 20, 150),
        ]);
    }

    /**
     * Inactive rule state.
     */
    public function inactive(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Rule with max discount cap.
     */
    public function withMaxDiscount(float $maxAmount): static
    {
        return $this->state(fn(array $attributes) => [
            'max_discount_amount' => $maxAmount,
        ]);
    }

    /**
     * Rule with usage limits.
     */
    public function withUsageLimits(?int $total = null, ?int $perUser = null): static
    {
        return $this->state(fn(array $attributes) => [
            'usage_limit_total' => $total,
            'usage_limit_per_user' => $perUser,
        ]);
    }

    /**
     * Rule with date range.
     */
    public function withDateRange(?\DateTime $start = null, ?\DateTime $end = null): static
    {
        $start = $start ?? now();
        $end = $end ?? now()->addMonth();

        return $this->state(fn(array $attributes) => [
            'starts_at' => $start,
            'ends_at' => $end,
        ]);
    }

    /**
     * Expired rule state.
     */
    public function expired(): static
    {
        return $this->state(fn(array $attributes) => [
            'starts_at' => now()->subMonths(2),
            'ends_at' => now()->subMonth(),
        ]);
    }

    /**
     * Future rule state (not yet started).
     */
    public function future(): static
    {
        return $this->state(fn(array $attributes) => [
            'starts_at' => now()->addWeek(),
            'ends_at' => now()->addMonth(),
        ]);
    }

    /**
     * Rule that stops other rules from being applied.
     */
    public function exclusive(): static
    {
        return $this->state(fn(array $attributes) => [
            'stop_other_rules' => true,
            'is_stackable' => false,
        ]);
    }

    /**
     * Recursive rule state.
     */
    public function recursive(int $step = 1): static
    {
        return $this->state(fn(array $attributes) => [
            'is_recursive' => true,
            'recursive_step' => $step,
        ]);
    }

    /**
     * High priority rule state.
     */
    public function highPriority(): static
    {
        return $this->state(fn(array $attributes) => [
            'priority' => 100,
        ]);
    }

    /**
     * Low priority rule state.
     */
    public function lowPriority(): static
    {
        return $this->state(fn(array $attributes) => [
            'priority' => 1,
        ]);
    }

    /**
     * Rule with offer message.
     */
    public function withMessage(?string $message = null): static
    {
        return $this->state(fn(array $attributes) => [
            'offer_message' => $message ?? 'Special offer! ' . fake()->sentence(),
        ]);
    }

    /**
     * Rule that counts by subtotal instead of quantity.
     */
    public function countBySubtotal(): static
    {
        return $this->state(fn(array $attributes) => [
            'count_quantities_by' => 'eligible_subtotal',
        ]);
    }

    /**
     * Rule that counts by quantity (default).
     */
    public function countByQuantity(): static
    {
        return $this->state(fn(array $attributes) => [
            'count_quantities_by' => 'eligible_qty',
        ]);
    }

    /**
     * Rule with max free quantity per order (for BOGO).
     */
    public function withMaxFreeQty(int $maxFree): static
    {
        return $this->state(fn(array $attributes) => [
            'max_free_qty_per_order' => $maxFree,
        ]);
    }
}
