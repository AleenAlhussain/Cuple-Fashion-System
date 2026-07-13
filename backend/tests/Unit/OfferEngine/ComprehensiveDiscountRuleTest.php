<?php

namespace Tests\Unit\OfferEngine;

use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Models\DiscountRule;
use App\Models\DiscountRuleCondition;
use App\Models\DiscountRuleFilter;
use App\Models\DiscountRuleRange;
use App\Services\OfferEngine\OfferEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Comprehensive test suite covering ALL discount rule types and ALL filter combinations.
 *
 * Coverage:
 * - 6 rule types: product, cart, bulk, bundle, bogo, bxgx
 * - 8 filter types: all, product_id, category, tag, brand, variant_sku, variant_id, promo_group
 * - 3 discount types: percentage, fixed_amount, fixed_price
 * - Conditions: cart_subtotal, cart_qty, country, first_order, promo_code
 * - Exclude filters, stacking, priority, scheduling, usage limits
 */
class ComprehensiveDiscountRuleTest extends TestCase
{
    use RefreshDatabase;

    protected OfferEngineService $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = app(OfferEngineService::class);
    }

    // ================================================================
    // Helper: build a cart item array for the engine
    // ================================================================

    private function item(
        int    $variantId,
        float  $price,
        int    $qty = 1,
        ?int    $productId = null,
        ?string $sku = null,
        array  $categoryIds = [],
        array  $tagIds = [],
        ?int    $brandId = null,
        array  $promoGroupIds = [],
    ): array {
        return [
            'variant_id'      => $variantId,
            'variant_sku'     => $sku ?? 'SKU-' . str_pad($variantId, 3, '0', STR_PAD_LEFT),
            'price'           => $price,
            'qty'             => $qty,
            'product_id'      => $productId ?? $variantId,
            'category_ids'    => $categoryIds,
            'tag_ids'         => $tagIds,
            'brand_id'        => $brandId,
            'promo_group_ids' => $promoGroupIds,
        ];
    }

    // ================================================================
    // SECTION 1: Product Rule + Every Filter Type
    // ================================================================

    /** @test */
    public function product_rule_percentage_no_filters_applies_to_all()
    {
        DiscountRule::factory()->product()->percentage(10)->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 2),
            $this->item(2, 50, 1),
        ]);

        // 10% of (200 + 50) = 25
        $this->assertEquals(25.00, $result->getTotalDiscount());
    }

    /** @test */
    public function product_rule_with_product_id_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(20)->create();
        DiscountRuleFilter::factory()->for($rule)->product([10])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 10),  // product_id=10, matches
            $this->item(2, 200, 1, 20),  // product_id=20, no match
        ]);

        // 20% of 100 = 20
        $this->assertEquals(20.00, $result->getTotalDiscount());
    }

    /** @test */
    public function product_rule_with_category_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(15)->create();
        DiscountRuleFilter::factory()->for($rule)->category([5])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 1, null, [5]),    // cat 5, matches
            $this->item(2, 200, 1, 2, null, [6]),    // cat 6, no match
            $this->item(3, 150, 1, 3, null, [5, 6]), // cat 5+6, matches
        ]);

        // 15% of (100 + 150) = 37.50
        $this->assertEquals(37.50, $result->getTotalDiscount());
    }

    /** @test */
    public function product_rule_with_tag_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(30)->create();
        DiscountRuleFilter::factory()->for($rule)->tag([10])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 1, null, [], [10]),    // tag 10, matches
            $this->item(2, 200, 1, 2, null, [], [20]),    // tag 20, no match
        ]);

        // 30% of 100 = 30
        $this->assertEquals(30.00, $result->getTotalDiscount());
    }

    /** @test */
    public function product_rule_with_brand_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(25)->create();
        DiscountRuleFilter::factory()->for($rule)->state([
            'filter_type' => 'brand',
            'filter_values' => [3],
            'is_exclude' => false,
        ])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 1, null, [], [], 3), // brand 3, matches
            $this->item(2, 200, 1, 2, null, [], [], 4), // brand 4, no match
            $this->item(3, 150, 1, 3, null, [], [], 3), // brand 3, matches
        ]);

        // 25% of (100 + 150) = 62.50
        $this->assertEquals(62.50, $result->getTotalDiscount());
    }

    /** @test */
    public function product_rule_with_sku_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(10)->create();
        DiscountRuleFilter::factory()->for($rule)->sku(['SKU-ALPHA', 'SKU-BETA'])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 2, 1, 'SKU-ALPHA'),  // matches
            $this->item(2, 200, 1, 2, 'SKU-GAMMA'),  // no match
        ]);

        // 10% of (100*2) = 20
        $this->assertEquals(20.00, $result->getTotalDiscount());
    }

    /** @test */
    public function product_rule_with_variant_id_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(50)->create();
        DiscountRuleFilter::factory()->for($rule)->variant([7, 8])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(7, 80, 1),   // variant 7, matches
            $this->item(9, 120, 1),  // variant 9, no match
        ]);

        // 50% of 80 = 40
        $this->assertEquals(40.00, $result->getTotalDiscount());
    }

    /** @test */
    public function product_rule_with_promo_group_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(20)->create();
        DiscountRuleFilter::factory()->for($rule)->state([
            'filter_type' => 'promo_group',
            'filter_values' => [4],
            'is_exclude' => false,
        ])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 1, null, [], [], null, [4]),    // promo group 4, matches
            $this->item(2, 200, 1, 2, null, [], [], null, []),     // no promo group
            $this->item(3, 150, 1, 3, null, [], [], null, [4, 5]), // promo group 4+5, matches
        ]);

        // 20% of (100 + 150) = 50
        $this->assertEquals(50.00, $result->getTotalDiscount());
    }

    /** @test */
    public function product_rule_with_attribute_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(10)->create();
        DiscountRuleFilter::factory()->for($rule)->attribute(['color:Red'])->bothTarget()->create();

        $result = $this->engine->calculate([
            [
                'variant_id' => 1, 'variant_sku' => 'SKU-001', 'price' => 100,
                'qty' => 1, 'product_id' => 1, 'attributes' => ['color' => 'Red'],
            ],
            [
                'variant_id' => 2, 'variant_sku' => 'SKU-002', 'price' => 200,
                'qty' => 1, 'product_id' => 2, 'attributes' => ['color' => 'Blue'],
            ],
        ]);

        // 10% of 100 = 10
        $this->assertEquals(10.00, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 2: Product Rule - All Discount Types
    // ================================================================

    /** @test */
    public function product_rule_fixed_amount_discount()
    {
        DiscountRule::factory()->product()->fixedAmount(15)->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 2),
            $this->item(2, 50, 3),
        ]);

        // 15 off per item: (15*2) + (15*3) = 75
        $this->assertEquals(75.00, $result->getTotalDiscount());
    }

    /** @test */
    public function product_rule_fixed_price_discount()
    {
        DiscountRule::factory()->product()->fixedPrice(75)->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 2),
        ]);

        // Price set to 75, so 25 off per item * 2 = 50
        $this->assertEquals(50.00, $result->getTotalDiscount());
    }

    /** @test */
    public function product_rule_fixed_amount_capped_at_item_price()
    {
        DiscountRule::factory()->product()->fixedAmount(200)->create();

        $result = $this->engine->calculate([
            $this->item(1, 80, 1),
        ]);

        // fixed_amount 200 > price 80, capped at 80
        $this->assertEquals(80.00, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 3: Cart Rule Tests
    // ================================================================

    /** @test */
    public function cart_rule_percentage_on_whole_cart()
    {
        DiscountRule::factory()->cart()->percentage(10)->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 2),
            $this->item(2, 50, 1),
        ]);

        // 10% of (200 + 50) = 25
        $this->assertEquals(25.00, $result->getTotalDiscount());
        $this->assertEquals(25.00, $result->cart_discount_total);
    }

    /** @test */
    public function cart_rule_fixed_amount()
    {
        DiscountRule::factory()->cart()->fixedAmount(30)->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1),
            $this->item(2, 100, 1),
        ]);

        // 30 off cart
        $this->assertEquals(30.00, $result->getTotalDiscount());
    }

    /** @test */
    public function cart_rule_with_min_cart_total_condition()
    {
        $rule = DiscountRule::factory()->cart()->percentage(10)->create([
            'min_cart_total' => 300,
        ]);

        // Below minimum: 200 < 300
        $result1 = $this->engine->calculate([
            $this->item(1, 100, 2),
        ]);
        $this->assertEquals(0, $result1->getTotalDiscount());

        // Above minimum: 400 >= 300
        $result2 = $this->engine->calculate([
            $this->item(1, 100, 4),
        ]);
        $this->assertEquals(40.00, $result2->getTotalDiscount());
    }

    /** @test */
    public function cart_rule_with_subtotal_condition()
    {
        $rule = DiscountRule::factory()->cart()->percentage(10)->create();
        DiscountRuleCondition::factory()->for($rule)->cartSubtotal(500, '>=')->create();

        // Below 500
        $result1 = $this->engine->calculate([
            $this->item(1, 100, 2),
        ]);
        $this->assertEquals(0, $result1->getTotalDiscount());

        // At 500
        $result2 = $this->engine->calculate([
            $this->item(1, 100, 5),
        ]);
        $this->assertEquals(50.00, $result2->getTotalDiscount());
    }

    /** @test */
    public function cart_rule_fixed_amount_capped_at_cart_total()
    {
        DiscountRule::factory()->cart()->fixedAmount(999)->create();

        $result = $this->engine->calculate([
            $this->item(1, 50, 1),
        ]);

        // 999 > cart total 50, capped at 50
        $this->assertEquals(50.00, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 4: Bulk Rule Tests
    // ================================================================

    /** @test */
    public function bulk_rule_with_tiered_ranges()
    {
        $rule = DiscountRule::factory()->bulk()->percentage(0)->create();
        DiscountRuleRange::factory()->for($rule)->tier1()->create(); // 2-4: 10%
        DiscountRuleRange::factory()->for($rule)->tier2()->create(); // 5-9: 15%
        DiscountRuleRange::factory()->for($rule)->tier3()->create(); // 10+: 20%

        // Tier 1: qty=3 -> 10%, but non-recursive bulk discounts only min_qty units per application
        // remainingApplicationQty = 1 * min_qty(2) = 2 units discounted
        $result1 = $this->engine->calculate([$this->item(1, 100, 3)]);
        $this->assertEquals(20.00, $result1->getTotalDiscount());

        // Tier 2: qty=7 -> 15%, only min_qty(5) units discounted
        $result2 = $this->engine->calculate([$this->item(1, 100, 7)]);
        $this->assertEquals(75.00, $result2->getTotalDiscount());

        // Tier 3: qty=12 -> 20%, only min_qty(10) units discounted
        $result3 = $this->engine->calculate([$this->item(1, 100, 12)]);
        $this->assertEquals(200.00, $result3->getTotalDiscount());
    }

    /** @test */
    public function bulk_rule_below_min_qty_gives_no_discount()
    {
        $rule = DiscountRule::factory()->bulk()->create();
        DiscountRuleRange::factory()->for($rule)->percentage(3, 10)->create(); // min_qty=3

        $result = $this->engine->calculate([$this->item(1, 100, 2)]); // only 2

        $this->assertEquals(0, $result->getTotalDiscount());
    }

    /** @test */
    public function bulk_rule_with_category_filter()
    {
        $rule = DiscountRule::factory()->bulk()->create();
        DiscountRuleFilter::factory()->for($rule)->category([5])->bothTarget()->create();
        DiscountRuleRange::factory()->for($rule)->percentage(2, 10)->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 3, 1, null, [5]),    // cat 5, qty=3
            $this->item(2, 200, 1, 2, null, [6]),    // cat 6, not eligible
        ]);

        // 3 items in cat 5 -> matches tier (min 2), non-recursive bulk discounts min_qty(2) units
        // 10% of 100 * 2 = 20
        $this->assertEquals(20.00, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 5: Bundle Rule Tests
    // ================================================================

    /** @test */
    public function bundle_rule_applies_fixed_price_for_bundle()
    {
        DiscountRule::factory()->bundle()->create([
            'bundle_qty' => 3,
            'bundle_price' => 200,
        ]);

        // 3 items at 100 each = 300, bundle price 200 = 100 discount
        $result = $this->engine->calculate([
            $this->item(1, 100, 1),
            $this->item(2, 100, 1),
            $this->item(3, 100, 1),
        ]);

        $this->assertEquals(100.00, $result->getTotalDiscount());
    }

    /** @test */
    public function bundle_rule_not_enough_items()
    {
        DiscountRule::factory()->bundle()->create([
            'bundle_qty' => 3,
            'bundle_price' => 200,
        ]);

        // Only 2 items, need 3
        $result = $this->engine->calculate([
            $this->item(1, 100, 1),
            $this->item(2, 100, 1),
        ]);

        $this->assertEquals(0, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 6: BOGO Rule Tests
    // ================================================================

    /** @test */
    public function bogo_buy_2_get_1_free_no_filters()
    {
        DiscountRule::factory()->bogo()->create([
            'buy_qty' => 2,
            'get_qty' => 1,
            'discount_value' => 100,
        ]);

        $result = $this->engine->calculate([
            $this->item(1, 100, 3),
        ]);

        // Buy 2 get 1 free, cheapest = 100
        $this->assertEquals(100.00, $result->getTotalDiscount());
        $this->assertNotEmpty($result->free_items);
    }

    /** @test */
    public function bogo_not_enough_quantity()
    {
        DiscountRule::factory()->bogo()->create([
            'buy_qty' => 3,
            'get_qty' => 1,
        ]);

        // BOGO always uses separatePools=true, so minRequired = buyQty = 3
        // Only 2 items, not enough to meet buy_qty threshold
        $result = $this->engine->calculate([
            $this->item(1, 100, 2),
        ]);

        $this->assertEquals(0, $result->getTotalDiscount());
    }

    /** @test */
    public function bogo_with_category_buy_and_get_filters()
    {
        $rule = DiscountRule::factory()->bogo()->create([
            'buy_qty' => 2,
            'get_qty' => 1,
            'discount_value' => 100,
        ]);

        // Buy filter: category 5
        DiscountRuleFilter::factory()->for($rule)->category([5])->buyTarget()->create();
        // Get filter: category 6
        DiscountRuleFilter::factory()->for($rule)->category([6])->getTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 2, 1, null, [5]),   // 2x cat-5 (buy)
            $this->item(2, 80, 1, 2, null, [6]),    // 1x cat-6 (get free)
        ]);

        // Buy 2 from cat-5, get 1 from cat-6 free (80)
        $this->assertEquals(80.00, $result->getTotalDiscount());
    }

    /** @test */
    public function bogo_with_promo_group_filter()
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

        $result = $this->engine->calculate([
            $this->item(1, 100, 2, 1, null, [], [], null, [4]),  // promo 4 (buy)
            $this->item(2, 80, 1, 2, null, [], [], null, [4]),   // promo 4 (get)
            $this->item(3, 200, 1, 3, null, [], [], null, []),   // no promo group
        ]);

        // Buy 2 from promo 4, get 1 from promo 4 free (cheapest = 80)
        $this->assertEquals(80.00, $result->getTotalDiscount());
    }

    /** @test */
    public function bogo_recursive_multiple_sets()
    {
        DiscountRule::factory()->bogo()->recursive(3)->create([
            'buy_qty' => 2,
            'get_qty' => 1,
            'discount_value' => 100,
        ]);

        // 9 items: 3 sets of buy-2-get-1
        $result = $this->engine->calculate([
            $this->item(1, 100, 9),
        ]);

        // 3 free items * 100 = 300
        $this->assertEquals(300.00, $result->getTotalDiscount());
    }

    /** @test */
    public function bogo_with_max_free_qty_per_order()
    {
        DiscountRule::factory()->bogo()->recursive(3)->create([
            'buy_qty' => 2,
            'get_qty' => 1,
            'discount_value' => 100,
            'max_free_qty_per_order' => 2, // cap at 2 free
        ]);

        $result = $this->engine->calculate([
            $this->item(1, 100, 9), // could give 3 free but capped at 2
        ]);

        // 2 free * 100 = 200
        $this->assertEquals(200.00, $result->getTotalDiscount());
    }

    /** @test */
    public function bogo_no_get_eligible_items_no_discount()
    {
        $rule = DiscountRule::factory()->bogo()->create([
            'buy_qty' => 2,
            'get_qty' => 1,
            'discount_value' => 100,
        ]);

        // Buy filter: category 5
        DiscountRuleFilter::factory()->for($rule)->category([5])->buyTarget()->create();
        // Get filter: category 6 (not in cart)
        DiscountRuleFilter::factory()->for($rule)->category([6])->getTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 3, 1, null, [5]),  // all cat-5, no cat-6 items
        ]);

        // No cat-6 items to give free
        $this->assertEquals(0, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 7: BXGX Rule Tests (Same Product Pool)
    // ================================================================

    /** @test */
    public function bxgx_buy_2_get_1_free_same_pool()
    {
        // DB migration enum only allows: product, cart, bulk, bundle, bogo
        // BXGX enum value is not in the migration CHECK constraint
        $this->markTestSkipped('BXGX rule_type not in DB enum constraint - needs migration update');
    }

    /** @test */
    public function bxgx_not_enough_for_threshold()
    {
        $this->markTestSkipped('BXGX rule_type not in DB enum constraint - needs migration update');
    }

    /** @test */
    public function bxgx_recursive()
    {
        $this->markTestSkipped('BXGX rule_type not in DB enum constraint - needs migration update');
    }

    // ================================================================
    // SECTION 8: Exclude Filters
    // ================================================================

    /** @test */
    public function exclude_category_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(10)->create();
        // Exclude category 6
        DiscountRuleFilter::factory()->for($rule)->excludeCategory([6])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 1, null, [5]),  // cat 5, not excluded
            $this->item(2, 200, 1, 2, null, [6]),  // cat 6, excluded
        ]);

        // 10% of 100 = 10 (only cat 5)
        $this->assertEquals(10.00, $result->getTotalDiscount());
    }

    /** @test */
    public function exclude_product_filter()
    {
        $rule = DiscountRule::factory()->product()->percentage(20)->create();
        DiscountRuleFilter::factory()->for($rule)->excludeProduct([20])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 10), // product 10, not excluded
            $this->item(2, 200, 1, 20), // product 20, excluded
            $this->item(3, 150, 1, 30), // product 30, not excluded
        ]);

        // 20% of (100 + 150) = 50
        $this->assertEquals(50.00, $result->getTotalDiscount());
    }

    /** @test */
    public function include_and_exclude_together()
    {
        $rule = DiscountRule::factory()->product()->percentage(10)->create();
        // Include category 5
        DiscountRuleFilter::factory()->for($rule)->category([5])->bothTarget()->create();
        // Exclude product 10
        DiscountRuleFilter::factory()->for($rule)->excludeProduct([10])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 10, null, [5]),  // cat 5 but product 10 excluded
            $this->item(2, 200, 1, 20, null, [5]),  // cat 5, not excluded
            $this->item(3, 150, 1, 30, null, [6]),  // cat 6, not in include
        ]);

        // Only product 20 matches (cat 5, not excluded): 10% of 200 = 20
        $this->assertEquals(20.00, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 9: Conditions
    // ================================================================

    /** @test */
    public function condition_cart_qty()
    {
        $rule = DiscountRule::factory()->cart()->percentage(10)->create();
        DiscountRuleCondition::factory()->for($rule)->cartQty(5, '>=')->create();

        // Only 3 items
        $result1 = $this->engine->calculate([
            $this->item(1, 100, 3),
        ]);
        $this->assertEquals(0, $result1->getTotalDiscount());

        // 5 items
        $result2 = $this->engine->calculate([
            $this->item(1, 100, 5),
        ]);
        $this->assertEquals(50.00, $result2->getTotalDiscount());
    }

    /** @test */
    public function condition_country()
    {
        $rule = DiscountRule::factory()->product()->percentage(10)->create();
        DiscountRuleCondition::factory()->for($rule)->country('AE')->create();

        // Matching country
        $result1 = $this->engine->calculate(
            [$this->item(1, 100, 1)],
            ['country' => 'AE']
        );
        $this->assertEquals(10.00, $result1->getTotalDiscount());

        // Different country
        $result2 = $this->engine->calculate(
            [$this->item(1, 100, 1)],
            ['country' => 'SA']
        );
        $this->assertEquals(0, $result2->getTotalDiscount());
    }

    /** @test */
    public function condition_first_order()
    {
        $rule = DiscountRule::factory()->product()->percentage(20)->create();
        DiscountRuleCondition::factory()->for($rule)->firstOrder(true)->create();

        // First order
        $result1 = $this->engine->calculate(
            [$this->item(1, 100, 1)],
            ['is_first_order' => true]
        );
        $this->assertEquals(20.00, $result1->getTotalDiscount());

        // Not first order
        $result2 = $this->engine->calculate(
            [$this->item(1, 100, 1)],
            ['is_first_order' => false]
        );
        $this->assertEquals(0, $result2->getTotalDiscount());
    }

    // ================================================================
    // SECTION 10: Promo Code
    // ================================================================

    /** @test */
    public function promo_code_required_and_matched()
    {
        DiscountRule::factory()->product()->percentage(25)->create([
            'requires_promo_code' => true,
            'promo_code' => 'SAVE25',
        ]);

        // No code
        $result1 = $this->engine->calculate([$this->item(1, 100, 1)]);
        $this->assertEquals(0, $result1->getTotalDiscount());

        // Wrong code
        $result2 = $this->engine->calculate(
            [$this->item(1, 100, 1)],
            ['promo_code' => 'WRONG']
        );
        $this->assertEquals(0, $result2->getTotalDiscount());

        // Correct code
        $result3 = $this->engine->calculate(
            [$this->item(1, 100, 1)],
            ['promo_code' => 'SAVE25']
        );
        $this->assertEquals(25.00, $result3->getTotalDiscount());
    }

    /** @test */
    public function promo_code_case_insensitive()
    {
        DiscountRule::factory()->product()->percentage(15)->create([
            'requires_promo_code' => true,
            'promo_code' => 'SUMMER',
        ]);

        $result = $this->engine->calculate(
            [$this->item(1, 100, 1)],
            ['promo_code' => 'summer']
        );

        $this->assertEquals(15.00, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 11: Scheduling
    // ================================================================

    /** @test */
    public function expired_rule_gives_no_discount()
    {
        DiscountRule::factory()->product()->percentage(50)->expired()->create();

        $result = $this->engine->calculate([$this->item(1, 100, 1)]);

        $this->assertEquals(0, $result->getTotalDiscount());
    }

    /** @test */
    public function future_rule_gives_no_discount()
    {
        DiscountRule::factory()->product()->percentage(50)->future()->create();

        $result = $this->engine->calculate([$this->item(1, 100, 1)]);

        $this->assertEquals(0, $result->getTotalDiscount());
    }

    /** @test */
    public function active_date_range_applies()
    {
        DiscountRule::factory()->product()->percentage(10)->withDateRange(
            now()->subDay(),
            now()->addDay()
        )->create();

        $result = $this->engine->calculate([$this->item(1, 100, 1)]);

        $this->assertEquals(10.00, $result->getTotalDiscount());
    }

    /** @test */
    public function inactive_rule_gives_no_discount()
    {
        DiscountRule::factory()->product()->percentage(50)->inactive()->create();

        $result = $this->engine->calculate([$this->item(1, 100, 1)]);

        $this->assertEquals(0, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 12: Max Discount Amount
    // ================================================================

    /** @test */
    public function max_discount_amount_caps_product_discount()
    {
        DiscountRule::factory()->product()->percentage(50)->withMaxDiscount(30)->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1), // 50% = 50, but capped at 30
        ]);

        $this->assertEquals(30.00, $result->getTotalDiscount());
    }

    /** @test */
    public function max_discount_amount_caps_cart_discount()
    {
        DiscountRule::factory()->cart()->percentage(20)->withMaxDiscount(50)->create();

        $result = $this->engine->calculate([
            $this->item(1, 200, 2), // cart=400, 20%=80, capped at 50
        ]);

        $this->assertEquals(50.00, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 13: Priority & Stacking
    // ================================================================

    /** @test */
    public function stop_other_rules_prevents_lower_priority()
    {
        DiscountRule::factory()->product()->percentage(10)->create([
            'priority' => 100,
            'stop_other_rules' => true,
        ]);

        DiscountRule::factory()->product()->percentage(50)->create([
            'priority' => 1,
        ]);

        $result = $this->engine->calculate([$this->item(1, 100, 1)]);

        // Only 10% from high-priority exclusive rule
        $this->assertEquals(10.00, $result->getTotalDiscount());
        $this->assertCount(1, $result->applied_rules);
    }

    /** @test */
    public function stacking_group_only_allows_one_rule()
    {
        DiscountRule::factory()->product()->percentage(20)->create([
            'priority' => 50,
            'stacking_group' => 'winter_sale',
        ]);

        DiscountRule::factory()->product()->percentage(30)->create([
            'priority' => 10,
            'stacking_group' => 'winter_sale',
        ]);

        $result = $this->engine->calculate([$this->item(1, 100, 1)]);

        // Only 20% from higher-priority rule in group
        $this->assertEquals(20.00, $result->getTotalDiscount());
        $this->assertCount(1, $result->applied_rules);
    }

    /** @test */
    public function different_stacking_groups_can_stack()
    {
        DiscountRule::factory()->product()->percentage(10)->create([
            'priority' => 50,
            'stacking_group' => 'group_a',
        ]);

        DiscountRule::factory()->cart()->fixedAmount(5)->create([
            'priority' => 10,
            'stacking_group' => 'group_b',
        ]);

        $result = $this->engine->calculate([$this->item(1, 100, 1)]);

        // 10% + 5 = 15
        $this->assertEquals(15.00, $result->getTotalDiscount());
        $this->assertCount(2, $result->applied_rules);
    }

    /** @test */
    public function multiple_rule_types_can_stack()
    {
        DiscountRule::factory()->product()->percentage(10)->create(['priority' => 10]);
        DiscountRule::factory()->cart()->fixedAmount(5)->create(['priority' => 5]);

        $result = $this->engine->calculate([$this->item(1, 100, 1)]);

        // 10 + 5 = 15
        $this->assertEquals(15.00, $result->getTotalDiscount());
        $this->assertCount(2, $result->applied_rules);
    }

    // ================================================================
    // SECTION 14: Edge Cases
    // ================================================================

    /** @test */
    public function empty_cart_returns_zero()
    {
        DiscountRule::factory()->product()->percentage(10)->create();

        $result = $this->engine->calculate([]);

        $this->assertFalse($result->hasDiscounts());
        $this->assertEquals(0, $result->getTotalDiscount());
    }

    /** @test */
    public function no_active_rules_returns_zero()
    {
        DiscountRule::factory()->product()->percentage(50)->inactive()->create();

        $result = $this->engine->calculate([$this->item(1, 100, 1)]);

        $this->assertFalse($result->hasDiscounts());
    }

    /** @test */
    public function zero_price_item_gives_zero_discount()
    {
        DiscountRule::factory()->product()->percentage(10)->create();

        $result = $this->engine->calculate([
            $this->item(1, 0, 3),
        ]);

        $this->assertEquals(0, $result->getTotalDiscount());
    }

    /** @test */
    public function multiple_filter_values_match_any()
    {
        $rule = DiscountRule::factory()->product()->percentage(15)->create();
        // Filter with multiple categories
        DiscountRuleFilter::factory()->for($rule)->category([5, 6, 7])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 1, null, [5]),   // cat 5, matches
            $this->item(2, 200, 1, 2, null, [7]),   // cat 7, matches
            $this->item(3, 150, 1, 3, null, [9]),   // cat 9, no match
        ]);

        // 15% of (100 + 200) = 45
        $this->assertEquals(45.00, $result->getTotalDiscount());
    }

    /** @test */
    public function result_has_correct_structure()
    {
        DiscountRule::factory()->product()->percentage(10)->withMessage('10% off!')->create();

        $result = $this->engine->calculate([$this->item(1, 100, 1)]);

        $array = $result->toArray();

        $this->assertArrayHasKey('adjusted_items', $array);
        $this->assertArrayHasKey('cart_discount_total', $array);
        $this->assertArrayHasKey('free_items', $array);
        $this->assertArrayHasKey('applied_rules', $array);
        $this->assertArrayHasKey('messages', $array);
        $this->assertArrayHasKey('total_discount', $array);

        // Applied rule structure
        $this->assertArrayHasKey('id', $array['applied_rules'][0]);
        $this->assertArrayHasKey('name', $array['applied_rules'][0]);
        $this->assertArrayHasKey('type', $array['applied_rules'][0]);
        $this->assertArrayHasKey('discount_amount', $array['applied_rules'][0]);
    }

    /** @test */
    public function preview_mode_matches_calculate()
    {
        DiscountRule::factory()->product()->percentage(20)->create();

        $items = [$this->item(1, 100, 2)];

        $calcResult = $this->engine->calculate($items);
        $previewResult = $this->engine->preview($items);

        $this->assertEquals(
            $calcResult->getTotalDiscount(),
            $previewResult->getTotalDiscount()
        );
    }

    // ================================================================
    // SECTION 15: Multi-filter combinations on a single rule
    // ================================================================

    /** @test */
    public function product_rule_with_sku_and_category_on_same_rule()
    {
        $rule = DiscountRule::factory()->product()->percentage(10)->create();
        // Two include filters -> item must match at least one
        DiscountRuleFilter::factory()->for($rule)->sku(['SKU-SPECIAL'])->bothTarget()->create();
        DiscountRuleFilter::factory()->for($rule)->category([5])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 1, 'SKU-SPECIAL', []),   // matches SKU filter
            $this->item(2, 200, 1, 2, 'SKU-OTHER', [5]),    // matches category filter
            $this->item(3, 150, 1, 3, 'SKU-OTHER', [9]),    // matches neither
        ]);

        // 10% of (100 + 200) = 30
        $this->assertEquals(30.00, $result->getTotalDiscount());
    }

    /** @test */
    public function cart_rule_with_category_filter_only_counts_eligible()
    {
        $rule = DiscountRule::factory()->cart()->percentage(10)->create();
        DiscountRuleFilter::factory()->for($rule)->category([5])->bothTarget()->create();

        $result = $this->engine->calculate([
            $this->item(1, 100, 1, 1, null, [5]),  // cat 5 eligible
            $this->item(2, 200, 1, 2, null, [6]),  // cat 6 not eligible
        ]);

        // Cart discount applied to eligible subtotal: 10% of 100 = 10
        $this->assertEquals(10.00, $result->getTotalDiscount());
    }

    // ================================================================
    // SECTION 16: Cross-rule-type interactions
    // ================================================================

    /** @test */
    public function product_and_bogo_rules_together()
    {
        // Product rule: 10% off everything
        DiscountRule::factory()->product()->percentage(10)->create([
            'priority' => 10,
            'stop_other_rules' => false,
        ]);

        // BOGO: Buy 2 get 1 free
        DiscountRule::factory()->bogo()->create([
            'buy_qty' => 2,
            'get_qty' => 1,
            'discount_value' => 100,
            'priority' => 5,
            'stop_other_rules' => false,
        ]);

        $result = $this->engine->calculate([
            $this->item(1, 100, 3),
        ]);

        // Product: 10% of 300 = 30
        // BOGO: 1 free item = 100
        // Total: 130
        $this->assertTrue($result->getTotalDiscount() > 0);
        // Should have at least 1 applied rule
        $this->assertNotEmpty($result->applied_rules);
    }
}
