<?php

namespace Database\Factories;

use App\Models\DiscountRule;
use App\Models\DiscountRuleCondition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DiscountRuleCondition>
 */
class DiscountRuleConditionFactory extends Factory
{
    protected $model = DiscountRuleCondition::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'discount_rule_id' => DiscountRule::factory(),
            'type' => 'cart_subtotal',
            'operator' => '>=',
            'value' => '100',
        ];
    }

    /**
     * Cart subtotal condition.
     */
    public function cartSubtotal(float $amount, string $operator = '>='): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'cart_subtotal',
            'operator' => $operator,
            'value' => (string) $amount,
        ]);
    }

    /**
     * Cart quantity condition.
     */
    public function cartQty(int $qty, string $operator = '>='): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'cart_qty',
            'operator' => $operator,
            'value' => (string) $qty,
        ]);
    }

    /**
     * First order condition.
     */
    public function firstOrder(bool $required = true): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'first_order',
            'operator' => '==',
            'value' => $required ? 'true' : 'false',
        ]);
    }

    /**
     * User role condition.
     */
    public function userRole(string $role, string $operator = '=='): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'user_role',
            'operator' => $operator,
            'value' => $role,
        ]);
    }

    /**
     * User role in list condition.
     */
    public function userRoleIn(array $roles): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'user_role',
            'operator' => 'in',
            'value' => implode(',', $roles),
        ]);
    }

    /**
     * Country condition.
     */
    public function country(string $country, string $operator = '=='): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'country',
            'operator' => $operator,
            'value' => $country,
        ]);
    }

    /**
     * Country in list condition.
     */
    public function countryIn(array $countries): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'country',
            'operator' => 'in',
            'value' => implode(',', $countries),
        ]);
    }

    /**
     * Specific user condition.
     */
    public function userId(int $userId): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'user_id',
            'operator' => '==',
            'value' => (string) $userId,
        ]);
    }
}
