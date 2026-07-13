<?php

namespace Tests\Unit\OfferEngine;

use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Models\DiscountRule;
use App\Services\OfferEngine\Calculators\CartDiscountCalculator;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\Filters\EligibilityFilter;
use App\Services\OfferEngine\Filters\FilterMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartDiscountCalculatorTest extends TestCase
{
    use RefreshDatabase;

    protected CartDiscountCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $filterMatcher = new FilterMatcher();
        $eligibilityFilter = new EligibilityFilter($filterMatcher);
        $this->calculator = new CartDiscountCalculator($eligibilityFilter);
    }

    /** @test */
    public function it_calculates_percentage_cart_discount()
    {
        $rule = DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'is_active' => true,
        ]);

        $items = [
            new CartItemDTO(variant_id: 1, variant_sku: 'SKU-001', price: 100.00, qty: 2, product_id: 1),
            new CartItemDTO(variant_id: 2, variant_sku: 'SKU-002', price: 50.00, qty: 1, product_id: 2),
        ];

        $context = new ContextDTO();
        $result = $this->calculator->calculate($rule, $items, $context);

        // Cart total: (100 * 2) + (50 * 1) = 250
        // 10% of 250 = 25
        $this->assertEquals(25.00, $result->getTotalDiscount());
        $this->assertEquals(25.00, $result->cart_discount_total);
    }

    /** @test */
    public function it_calculates_fixed_amount_cart_discount()
    {
        $rule = DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 30,
            'is_active' => true,
        ]);

        $items = [
            new CartItemDTO(variant_id: 1, variant_sku: 'SKU-001', price: 100.00, qty: 1, product_id: 1),
            new CartItemDTO(variant_id: 2, variant_sku: 'SKU-002', price: 100.00, qty: 1, product_id: 2),
        ];

        $context = new ContextDTO();
        $result = $this->calculator->calculate($rule, $items, $context);

        // 30 AED off cart
        $this->assertEquals(30.00, $result->getTotalDiscount());
    }

    /** @test */
    public function it_applies_max_discount_cap_to_cart()
    {
        $rule = DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'max_discount_amount' => 50,
            'is_active' => true,
        ]);

        $items = [
            new CartItemDTO(variant_id: 1, variant_sku: 'SKU-001', price: 200.00, qty: 2, product_id: 1),
        ];

        $context = new ContextDTO();
        $result = $this->calculator->calculate($rule, $items, $context);

        // Cart total: 400
        // 20% of 400 = 80, but capped at 50
        $this->assertEquals(50.00, $result->getTotalDiscount());
    }

    /** @test */
    public function it_returns_empty_result_for_empty_cart()
    {
        $rule = DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'is_active' => true,
        ]);

        $items = [];

        $context = new ContextDTO();
        $result = $this->calculator->calculate($rule, $items, $context);

        $this->assertEquals(0, $result->getTotalDiscount());
        $this->assertFalse($result->hasDiscounts());
    }

    /** @test */
    public function it_tracks_affected_variants_for_cart_discount()
    {
        $rule = DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 5,
            'is_active' => true,
        ]);

        $items = [
            new CartItemDTO(variant_id: 10, variant_sku: 'SKU-010', price: 50.00, qty: 1, product_id: 1),
            new CartItemDTO(variant_id: 20, variant_sku: 'SKU-020', price: 75.00, qty: 1, product_id: 2),
            new CartItemDTO(variant_id: 30, variant_sku: 'SKU-030', price: 25.00, qty: 1, product_id: 3),
        ];

        $context = new ContextDTO();
        $result = $this->calculator->calculate($rule, $items, $context);

        $this->assertTrue($result->hasDiscounts());
        $this->assertCount(1, $result->applied_rules);
        $affectedVariants = $result->applied_rules[0]['affected_variants'];
        $this->assertContains(10, $affectedVariants);
        $this->assertContains(20, $affectedVariants);
        $this->assertContains(30, $affectedVariants);
    }

    /** @test */
    public function it_adds_cart_discount_to_result()
    {
        $rule = DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 25,
            'is_active' => true,
        ]);

        $items = [
            new CartItemDTO(variant_id: 1, variant_sku: 'SKU-001', price: 100.00, qty: 1, product_id: 1),
        ];

        $context = new ContextDTO();
        $result = $this->calculator->calculate($rule, $items, $context);

        // Verify it's in cart_discount_total, not adjusted_items
        $this->assertEquals(25.00, $result->cart_discount_total);
        $this->assertEmpty($result->adjusted_items);
    }

    /** @test */
    public function it_calculates_fixed_price_as_cart_discount()
    {
        $rule = DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_PRICE,
            'discount_value' => 150, // Set cart price to 150
            'is_active' => true,
        ]);

        $items = [
            new CartItemDTO(variant_id: 1, variant_sku: 'SKU-001', price: 100.00, qty: 2, product_id: 1),
        ];

        $context = new ContextDTO();
        $result = $this->calculator->calculate($rule, $items, $context);

        // Cart total: 200
        // Fixed price: 150
        // Discount: 200 - 150 = 50
        $this->assertEquals(50.00, $result->getTotalDiscount());
    }

    /** @test */
    public function it_caps_fixed_amount_at_cart_total()
    {
        $rule = DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 200, // More than cart total
            'is_active' => true,
        ]);

        $items = [
            new CartItemDTO(variant_id: 1, variant_sku: 'SKU-001', price: 50.00, qty: 1, product_id: 1),
        ];

        $context = new ContextDTO();
        $result = $this->calculator->calculate($rule, $items, $context);

        // Cart total: 50
        // Fixed amount: 200, but capped at 50
        $this->assertEquals(50.00, $result->getTotalDiscount());
    }

    /** @test */
    public function it_includes_offer_message_in_result()
    {
        $rule = DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 15,
            'offer_message' => 'You save 15% on your order!',
            'is_active' => true,
        ]);

        $items = [
            new CartItemDTO(variant_id: 1, variant_sku: 'SKU-001', price: 100.00, qty: 1, product_id: 1),
        ];

        $context = new ContextDTO();
        $result = $this->calculator->calculate($rule, $items, $context);

        $this->assertContains('You save 15% on your order!', $result->messages);
    }

    /** @test */
    public function it_returns_rule_type_in_applied_rules()
    {
        $rule = DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'is_active' => true,
        ]);

        $items = [
            new CartItemDTO(variant_id: 1, variant_sku: 'SKU-001', price: 100.00, qty: 1, product_id: 1),
        ];

        $context = new ContextDTO();
        $result = $this->calculator->calculate($rule, $items, $context);

        $this->assertEquals('cart', $result->applied_rules[0]['type']);
        $this->assertEquals($rule->id, $result->applied_rules[0]['id']);
        $this->assertEquals($rule->name, $result->applied_rules[0]['name']);
    }
}
