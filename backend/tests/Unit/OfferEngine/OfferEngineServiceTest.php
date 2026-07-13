<?php

namespace Tests\Unit\OfferEngine;

use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Models\DiscountRule;
use App\Services\OfferEngine\OfferEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfferEngineServiceTest extends TestCase
{
    use RefreshDatabase;

    protected OfferEngineService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(OfferEngineService::class);
    }

    /** @test */
    public function it_calculates_discounts_for_cart_items()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'is_active' => true,
            'priority' => 10,
        ]);

        $cartItems = [
            [
                'variant_id' => 1,
                'variant_sku' => 'SKU-001',
                'price' => 100.00,
                'qty' => 2,
                'product_id' => 1,
                'category_ids' => [1],
            ],
        ];

        $result = $this->service->calculate($cartItems);

        $this->assertTrue($result->hasDiscounts());
        $this->assertEquals(40.00, $result->getTotalDiscount());
    }

    /** @test */
    public function it_returns_empty_result_for_no_active_rules()
    {
        // Create an inactive rule
        DiscountRule::factory()->inactive()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
        ]);

        $cartItems = [
            [
                'variant_id' => 1,
                'variant_sku' => 'SKU-001',
                'price' => 100.00,
                'qty' => 1,
                'product_id' => 1,
            ],
        ];

        $result = $this->service->calculate($cartItems);

        $this->assertFalse($result->hasDiscounts());
        $this->assertEquals(0, $result->getTotalDiscount());
    }

    /** @test */
    public function it_returns_empty_result_for_empty_cart()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'is_active' => true,
        ]);

        $result = $this->service->calculate([]);

        $this->assertFalse($result->hasDiscounts());
        $this->assertEquals(0, $result->getTotalDiscount());
    }

    /** @test */
    public function it_applies_rules_in_priority_order()
    {
        // High priority rule - stops other rules
        DiscountRule::factory()->create([
            'name' => 'High Priority Rule',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'is_active' => true,
            'priority' => 100,
            'stop_other_rules' => true,
        ]);

        // Low priority rule - should not apply
        DiscountRule::factory()->create([
            'name' => 'Low Priority Rule',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 50,
            'is_active' => true,
            'priority' => 1,
        ]);

        $cartItems = [
            [
                'variant_id' => 1,
                'variant_sku' => 'SKU-001',
                'price' => 100.00,
                'qty' => 1,
                'product_id' => 1,
            ],
        ];

        $result = $this->service->calculate($cartItems);

        // Only 10% discount (from high priority rule)
        $this->assertEquals(10.00, $result->getTotalDiscount());
        $this->assertCount(1, $result->applied_rules);
        $this->assertEquals('High Priority Rule', $result->applied_rules[0]['name']);
    }

    /** @test */
    public function it_can_stack_multiple_rules()
    {
        DiscountRule::factory()->create([
            'name' => 'Rule 1',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'is_active' => true,
            'priority' => 10,
            'stop_other_rules' => false,
        ]);

        DiscountRule::factory()->create([
            'name' => 'Rule 2',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 5,
            'is_active' => true,
            'priority' => 5,
            'stop_other_rules' => false,
        ]);

        $cartItems = [
            [
                'variant_id' => 1,
                'variant_sku' => 'SKU-001',
                'price' => 100.00,
                'qty' => 1,
                'product_id' => 1,
            ],
        ];

        $result = $this->service->calculate($cartItems);

        // 10% of 100 = 10 (product) + 5 (cart) = 15
        $this->assertEquals(15.00, $result->getTotalDiscount());
        $this->assertCount(2, $result->applied_rules);
    }

    /** @test */
    public function it_respects_stacking_groups()
    {
        // First rule in group
        DiscountRule::factory()->create([
            'name' => 'Group Rule 1',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'is_active' => true,
            'priority' => 50,
            'stacking_group' => 'seasonal',
        ]);

        // Second rule in same group - should not apply
        DiscountRule::factory()->create([
            'name' => 'Group Rule 2',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 30,
            'is_active' => true,
            'priority' => 10,
            'stacking_group' => 'seasonal',
        ]);

        $cartItems = [
            [
                'variant_id' => 1,
                'variant_sku' => 'SKU-001',
                'price' => 100.00,
                'qty' => 1,
                'product_id' => 1,
            ],
        ];

        $result = $this->service->calculate($cartItems);

        // Only 20% (higher priority rule in group)
        $this->assertEquals(20.00, $result->getTotalDiscount());
        $this->assertCount(1, $result->applied_rules);
    }

    /** @test */
    public function it_preview_mode_works_same_as_calculate()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 15,
            'is_active' => true,
        ]);

        $cartItems = [
            [
                'variant_id' => 1,
                'variant_sku' => 'SKU-001',
                'price' => 100.00,
                'qty' => 1,
                'product_id' => 1,
            ],
        ];

        $result = $this->service->preview($cartItems);

        $this->assertTrue($result->hasDiscounts());
        $this->assertEquals(15.00, $result->getTotalDiscount());
    }

    /** @test */
    public function it_can_get_statistics()
    {
        DiscountRule::factory()->count(5)->create(['is_active' => true]);
        DiscountRule::factory()->count(3)->inactive()->create();

        $stats = $this->service->getStatistics();

        $this->assertEquals(8, $stats['total_rules']);
        $this->assertEquals(5, $stats['active_rules']);
        $this->assertArrayHasKey('total_discounts_this_month', $stats);
        $this->assertArrayHasKey('most_used_rules', $stats);
    }

    /** @test */
    public function it_ignores_expired_rules()
    {
        DiscountRule::factory()->expired()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 50,
            'is_active' => true,
        ]);

        $cartItems = [
            [
                'variant_id' => 1,
                'variant_sku' => 'SKU-001',
                'price' => 100.00,
                'qty' => 1,
                'product_id' => 1,
            ],
        ];

        $result = $this->service->calculate($cartItems);

        $this->assertFalse($result->hasDiscounts());
    }

    /** @test */
    public function it_ignores_future_rules()
    {
        DiscountRule::factory()->future()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 50,
            'is_active' => true,
        ]);

        $cartItems = [
            [
                'variant_id' => 1,
                'variant_sku' => 'SKU-001',
                'price' => 100.00,
                'qty' => 1,
                'product_id' => 1,
            ],
        ];

        $result = $this->service->calculate($cartItems);

        $this->assertFalse($result->hasDiscounts());
    }
}
