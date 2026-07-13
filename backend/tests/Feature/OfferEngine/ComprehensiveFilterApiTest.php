<?php

namespace Tests\Feature\OfferEngine;

use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Models\DiscountRule;
use App\Models\DiscountRuleCondition;
use App\Models\DiscountRuleFilter;
use App\Models\DiscountRuleRange;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature-level API tests for the discount calculation endpoint.
 * Tests the full HTTP flow including cart enrichment and response structure.
 */
class ComprehensiveFilterApiTest extends TestCase
{
    use RefreshDatabase;

    private function postCalculate(array $items, array $extra = []): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/website/cart/calculate-discounts', array_merge([
            'items' => $items,
        ], $extra));
    }

    private function cartItem(
        int    $variantId,
        float  $price,
        int    $qty = 1,
        int    $productId = null,
        string $sku = null,
        array  $categoryIds = [],
        array  $tagIds = [],
        array  $promoGroupIds = [],
    ): array {
        return array_filter([
            'variant_id'      => $variantId,
            'variant_sku'     => $sku ?? 'SKU-' . $variantId,
            'price'           => $price,
            'qty'             => $qty,
            'product_id'      => $productId ?? $variantId,
            'category_ids'    => $categoryIds,
            'tag_ids'         => $tagIds,
            'promo_group_ids' => $promoGroupIds,
        ], fn($v) => $v !== null);
    }

    // ================================================================
    // API response structure
    // ================================================================

    /** @test */
    public function api_returns_correct_structure()
    {
        DiscountRule::factory()->product()->percentage(10)->create();

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 1),
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
                    'promotion_messages',
                ],
            ])
            ->assertJsonPath('success', true);
    }

    /** @test */
    public function api_validates_required_fields()
    {
        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                ['variant_id' => 1], // missing price, qty, product_id
            ],
        ]);

        $response->assertUnprocessable();
    }

    /** @test */
    public function api_accepts_empty_items_gracefully()
    {
        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [],
        ]);

        // Should fail validation (min:1)
        $response->assertUnprocessable();
    }

    // ================================================================
    // Product rule through API
    // ================================================================

    /** @test */
    public function api_product_percentage_discount()
    {
        DiscountRule::factory()->product()->percentage(20)->create();

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 2),
        ]);

        $response->assertOk();
        $this->assertEquals(40, $response->json('data.total_discount'));
    }

    /** @test */
    public function api_product_discount_with_category_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(15)->create();
        DiscountRuleFilter::factory()->for($rule)->category([5])->bothTarget()->create();

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 1, 1, null, [5]),    // matches
            $this->cartItem(2, 200, 1, 2, null, [6]),    // no match
        ]);

        $response->assertOk();
        $this->assertEquals(15, $response->json('data.total_discount'));
    }

    /** @test */
    public function api_product_discount_with_promo_group_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(20)->create();
        DiscountRuleFilter::factory()->for($rule)->state([
            'filter_type' => 'promo_group',
            'filter_values' => [4],
        ])->bothTarget()->create();

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 1, 1, null, [], [], [4]),  // promo 4, matches
            $this->cartItem(2, 200, 1, 2, null, [], [], []),   // no promo
        ]);

        $response->assertOk();
        $this->assertEquals(20, $response->json('data.total_discount'));
    }

    // ================================================================
    // Cart rule through API
    // ================================================================

    /** @test */
    public function api_cart_percentage_discount()
    {
        DiscountRule::factory()->cart()->percentage(10)->create();

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 2),
            $this->cartItem(2, 50, 1),
        ]);

        $response->assertOk();
        $this->assertEquals(25, $response->json('data.total_discount'));
        $this->assertEquals(25, $response->json('data.cart_discount_total'));
    }

    /** @test */
    public function api_cart_with_min_total_condition()
    {
        $rule = DiscountRule::factory()->cart()->percentage(10)->create([
            'min_cart_total' => 300,
        ]);

        // Below min
        $response1 = $this->postCalculate([
            $this->cartItem(1, 100, 2), // 200
        ]);
        $this->assertEquals(0, $response1->json('data.total_discount'));

        // Above min
        $response2 = $this->postCalculate([
            $this->cartItem(1, 100, 4), // 400
        ]);
        $this->assertEquals(40, $response2->json('data.total_discount'));
    }

    // ================================================================
    // BOGO through API
    // ================================================================

    /** @test */
    public function api_bogo_buy_2_get_1_free()
    {
        DiscountRule::factory()->bogo()->create([
            'buy_qty' => 2,
            'get_qty' => 1,
            'discount_value' => 100,
        ]);

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 3),
        ]);

        $response->assertOk();
        $this->assertEquals(100, $response->json('data.total_discount'));
        $this->assertNotEmpty($response->json('data.free_items'));
    }

    /** @test */
    public function api_bogo_with_promo_group_buy_get_filters()
    {
        $rule = DiscountRule::factory()->bogo()->create([
            'buy_qty' => 2,
            'get_qty' => 1,
            'discount_value' => 100,
        ]);

        DiscountRuleFilter::factory()->for($rule)->state([
            'filter_type' => 'promo_group',
            'filter_values' => [4],
        ])->buyTarget()->create();

        DiscountRuleFilter::factory()->for($rule)->state([
            'filter_type' => 'promo_group',
            'filter_values' => [4],
        ])->getTarget()->create();

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 2, 1, null, [], [], [4]),
            $this->cartItem(2, 80, 1, 2, null, [], [], [4]),
        ]);

        $response->assertOk();
        $this->assertEquals(80, $response->json('data.total_discount'));
    }

    // ================================================================
    // Promo code through API
    // ================================================================

    /** @test */
    public function api_promo_code_discount()
    {
        DiscountRule::factory()->product()->percentage(25)->create([
            'requires_promo_code' => true,
            'promo_code' => 'SAVE25',
        ]);

        // Without code
        $response1 = $this->postCalculate(
            [$this->cartItem(1, 100, 1)]
        );
        $this->assertEquals(0, $response1->json('data.total_discount'));

        // With correct code
        $response2 = $this->postCalculate(
            [$this->cartItem(1, 100, 1)],
            ['promo_code' => 'SAVE25']
        );
        $this->assertEquals(25, $response2->json('data.total_discount'));
    }

    // ================================================================
    // Scheduling through API
    // ================================================================

    /** @test */
    public function api_expired_rule_not_applied()
    {
        DiscountRule::factory()->product()->percentage(50)->expired()->create();

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 1),
        ]);

        $response->assertOk();
        $this->assertEquals(0, $response->json('data.total_discount'));
    }

    /** @test */
    public function api_future_rule_not_applied()
    {
        DiscountRule::factory()->product()->percentage(50)->future()->create();

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 1),
        ]);

        $response->assertOk();
        $this->assertEquals(0, $response->json('data.total_discount'));
    }

    // ================================================================
    // Multiple rules through API
    // ================================================================

    /** @test */
    public function api_multiple_rules_stacked()
    {
        DiscountRule::factory()->product()->percentage(10)->create([
            'priority' => 10,
            'stop_other_rules' => false,
        ]);
        DiscountRule::factory()->cart()->fixedAmount(5)->create([
            'priority' => 5,
            'stop_other_rules' => false,
        ]);

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 1),
        ]);

        $response->assertOk();
        $this->assertEquals(15, $response->json('data.total_discount'));
    }

    /** @test */
    public function api_exclusive_rule_stops_others()
    {
        DiscountRule::factory()->product()->percentage(10)->exclusive()->create([
            'priority' => 100,
        ]);
        DiscountRule::factory()->product()->percentage(50)->create([
            'priority' => 1,
        ]);

        $response = $this->postCalculate([
            $this->cartItem(1, 100, 1),
        ]);

        $response->assertOk();
        $this->assertEquals(10, $response->json('data.total_discount'));
        $this->assertCount(1, $response->json('data.applied_rules'));
    }

    // ================================================================
    // Auto SKU generation
    // ================================================================

    /** @test */
    public function api_generates_fallback_sku_when_missing()
    {
        DiscountRule::factory()->product()->percentage(10)->create();

        $response = $this->postJson('/api/website/cart/calculate-discounts', [
            'items' => [
                [
                    'variant_id' => 1,
                    // no variant_sku
                    'price' => 100,
                    'qty' => 1,
                    'product_id' => 5,
                ],
            ],
        ]);

        $response->assertOk();
        $this->assertEquals(10, $response->json('data.total_discount'));
    }

    // ================================================================
    // Preview endpoint
    // ================================================================

    /** @test */
    public function api_preview_returns_same_discount()
    {
        DiscountRule::factory()->product()->percentage(20)->create();

        $items = [$this->cartItem(1, 100, 2)];

        $calcResponse = $this->postCalculate($items);
        $previewResponse = $this->postJson('/api/website/cart/preview-discounts', [
            'items' => [[
                'variant_id' => 1,
                'variant_sku' => 'SKU-1',
                'price' => 100,
                'qty' => 2,
                'product_id' => 1,
            ]],
        ]);

        $previewResponse->assertOk();
        $this->assertEquals(
            $calcResponse->json('data.total_discount'),
            $previewResponse->json('data.total_discount')
        );
    }
}
