<?php

namespace Database\Factories;

use App\Models\DiscountRule;
use App\Models\DiscountRuleFilter;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DiscountRuleFilter>
 */
class DiscountRuleFilterFactory extends Factory
{
    protected $model = DiscountRuleFilter::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'discount_rule_id' => DiscountRule::factory(),
            'target' => 'both',
            'filter_type' => 'category',
            'filter_values' => [1],
            'is_exclude' => false,
        ];
    }

    /**
     * Category include filter.
     */
    public function category(array $categoryIds): static
    {
        return $this->state(fn(array $attributes) => [
            'filter_type' => 'category',
            'filter_values' => $categoryIds,
            'is_exclude' => false,
        ]);
    }

    /**
     * Category exclude filter.
     */
    public function excludeCategory(array $categoryIds): static
    {
        return $this->state(fn(array $attributes) => [
            'filter_type' => 'category',
            'filter_values' => $categoryIds,
            'is_exclude' => true,
        ]);
    }

    /**
     * Product include filter.
     */
    public function product(array $productIds): static
    {
        return $this->state(fn(array $attributes) => [
            'filter_type' => 'product_id',
            'filter_values' => $productIds,
            'is_exclude' => false,
        ]);
    }

    /**
     * Product exclude filter.
     */
    public function excludeProduct(array $productIds): static
    {
        return $this->state(fn(array $attributes) => [
            'filter_type' => 'product_id',
            'filter_values' => $productIds,
            'is_exclude' => true,
        ]);
    }

    /**
     * Variant include filter.
     */
    public function variant(array $variantIds): static
    {
        return $this->state(fn(array $attributes) => [
            'filter_type' => 'variant_id',
            'filter_values' => $variantIds,
            'is_exclude' => false,
        ]);
    }

    /**
     * SKU include filter.
     */
    public function sku(array $skus): static
    {
        return $this->state(fn(array $attributes) => [
            'filter_type' => 'variant_sku',
            'filter_values' => $skus,
            'is_exclude' => false,
        ]);
    }

    /**
     * Tag include filter.
     */
    public function tag(array $tagIds): static
    {
        return $this->state(fn(array $attributes) => [
            'filter_type' => 'tag',
            'filter_values' => $tagIds,
            'is_exclude' => false,
        ]);
    }

    /**
     * Attribute filter.
     */
    public function attribute(array $attributeValues): static
    {
        return $this->state(fn(array $attributes) => [
            'filter_type' => 'attribute',
            'filter_values' => $attributeValues,
            'is_exclude' => false,
        ]);
    }

    /**
     * Set as exclude filter.
     */
    public function exclude(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_exclude' => true,
        ]);
    }

    /**
     * Set target to 'buy' (for BOGO).
     */
    public function buyTarget(): static
    {
        return $this->state(fn(array $attributes) => [
            'target' => 'buy',
        ]);
    }

    /**
     * Set target to 'get' (for BOGO).
     */
    public function getTarget(): static
    {
        return $this->state(fn(array $attributes) => [
            'target' => 'get',
        ]);
    }

    /**
     * Set target to 'both'.
     */
    public function bothTarget(): static
    {
        return $this->state(fn(array $attributes) => [
            'target' => 'both',
        ]);
    }
}
