<?php

namespace Tests\Feature\OfferEngine;

use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Models\DiscountRule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiscountCalculationApiTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_can_calculate_discounts_for_cart()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    'variant_id' => 1,
                    'variant_sku' => 'SKU-001',
                    'price' => 100.00,
                    'qty' => 2,
                    'product_id' => 1,
                    'category_ids' => [1],
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'adjusted_items',
                    'cart_discount_total',
                    'free_items',
                    'applied_rules',
                    'messages',
                    'total_discount',
                ],
            ])
            ->assertJsonPath('success', true);

        $this->assertEquals(20, $response->json('data.total_discount'));
    }

    /** @test */
    public function it_can_preview_discounts()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 15,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/website/cart/preview-discounts', [
            'items' => [
                [
                    'variant_id' => 1,
                    'variant_sku' => 'SKU-001',
                    'price' => 200.00,
                    'qty' => 1,
                    'product_id' => 1,
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('success', true);

        $this->assertEquals(30, $response->json('data.total_discount'));
    }

    /** @test */
    public function it_validates_cart_items_structure()
    {
        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    // Missing required fields
                    'variant_id' => 1,
                ],
            ],
        ]);

        $response->assertUnprocessable();
    }

    /** @test */
    public function it_returns_empty_discount_for_no_active_rules()
    {
        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    'variant_id' => 1,
                    'variant_sku' => 'SKU-001',
                    'price' => 100.00,
                    'qty' => 1,
                    'product_id' => 1,
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.total_discount', 0);
    }

    /** @test */
    public function it_applies_multiple_rules()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'is_active' => true,
            'priority' => 10,
        ]);

        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 5,
            'is_active' => true,
            'priority' => 5,
        ]);

        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    'variant_id' => 1,
                    'variant_sku' => 'SKU-001',
                    'price' => 100.00,
                    'qty' => 1,
                    'product_id' => 1,
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertEquals(15, $response->json('data.total_discount'));
    }

    /** @test */
    public function it_returns_applied_rules_summary()
    {
        DiscountRule::factory()->create([
            'name' => 'Test Discount',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    'variant_id' => 1,
                    'variant_sku' => 'SKU-001',
                    'price' => 50.00,
                    'qty' => 1,
                    'product_id' => 1,
                ],
            ],
        ]);

        $response->assertOk();

        $appliedRules = $response->json('data.applied_rules');
        $this->assertNotEmpty($appliedRules);
        $this->assertEquals('Test Discount', $appliedRules[0]['name']);
        $this->assertEquals('product', $appliedRules[0]['type']);
    }

    /** @test */
    public function it_includes_offer_messages()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 25,
            'offer_message' => 'Save 25% on this item!',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    'variant_id' => 1,
                    'variant_sku' => 'SKU-001',
                    'price' => 100.00,
                    'qty' => 1,
                    'product_id' => 1,
                ],
            ],
        ]);

        $response->assertOk();
        $this->assertContains('Save 25% on this item!', $response->json('data.messages'));
    }

    /** @test */
    public function it_returns_adjusted_item_prices()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    'variant_id' => 123,
                    'variant_sku' => 'SKU-123',
                    'price' => 80.00,
                    'qty' => 1,
                    'product_id' => 1,
                ],
            ],
        ]);

        $response->assertOk();

        $adjustedItems = $response->json('data.adjusted_items');
        $this->assertNotEmpty($adjustedItems);
        $this->assertEquals(123, $adjustedItems[0]['variant_id']);
        $this->assertEquals(80, $adjustedItems[0]['original_price']);
        $this->assertEquals(72, $adjustedItems[0]['adjusted_price']);
        $this->assertEquals(8, $adjustedItems[0]['discount_amount']);
    }

    /** @test */
    public function it_handles_multiple_items_in_cart()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    'variant_id' => 1,
                    'variant_sku' => 'SKU-001',
                    'price' => 100.00,
                    'qty' => 2,
                    'product_id' => 1,
                ],
                [
                    'variant_id' => 2,
                    'variant_sku' => 'SKU-002',
                    'price' => 50.00,
                    'qty' => 3,
                    'product_id' => 2,
                ],
            ],
        ]);

        $response->assertOk();

        // Item 1: 10% of (100 * 2) = 20
        // Item 2: 10% of (50 * 3) = 15
        // Total: 35
        $this->assertEquals(35, $response->json('data.total_discount'));
    }

    /** @test */
    public function it_accepts_timezone_parameter()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 5,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    'variant_id' => 1,
                    'variant_sku' => 'SKU-001',
                    'price' => 100.00,
                    'qty' => 1,
                    'product_id' => 1,
                ],
            ],
            'timezone' => 'Asia/Riyadh',
            'country' => 'SA',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);
    }

    /** @test */
    public function it_returns_cart_discount_separately()
    {
        DiscountRule::factory()->create([
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 20,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    'variant_id' => 1,
                    'variant_sku' => 'SKU-001',
                    'price' => 100.00,
                    'qty' => 1,
                    'product_id' => 1,
                ],
            ],
        ]);

        $response->assertOk();

        $this->assertEquals(20, $response->json('data.cart_discount_total'));
        $this->assertEquals(20, $response->json('data.total_discount'));

        // adjusted_items should be empty for cart discount
        $this->assertEmpty($response->json('data.adjusted_items'));
    }
}
