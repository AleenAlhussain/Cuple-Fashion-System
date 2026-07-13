<?php

namespace Tests\Feature\OfferEngine;

use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Models\DiscountRule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiscountRuleApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    /** @test */
    public function it_can_list_discount_rules()
    {
        DiscountRule::factory()->count(5)->create();

        $response = $this->actingAs($this->admin)->getJson('/api/admin/discount-rule');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'name', 'rule_type', 'discount_type', 'discount_value', 'is_active'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $this->assertTrue($response->json('success'));
        $this->assertCount(5, $response->json('data'));
    }

    /** @test */
    public function it_can_filter_rules_by_status()
    {
        DiscountRule::factory()->count(3)->create(['is_active' => true]);
        DiscountRule::factory()->count(2)->inactive()->create();

        $response = $this->actingAs($this->admin)->getJson('/api/admin/discount-rule?is_active=true');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    /** @test */
    public function it_can_filter_rules_by_type()
    {
        DiscountRule::factory()->count(2)->product()->create();
        DiscountRule::factory()->count(3)->cart()->create();

        $response = $this->actingAs($this->admin)->getJson('/api/admin/discount-rule?rule_type=cart');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    /** @test */
    public function it_can_search_rules_by_name()
    {
        DiscountRule::factory()->create(['name' => 'Summer Sale']);
        DiscountRule::factory()->create(['name' => 'Winter Clearance']);
        DiscountRule::factory()->create(['name' => 'Summer Collection']);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/discount-rule?search=Summer');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    /** @test */
    public function it_can_get_single_rule()
    {
        $rule = DiscountRule::factory()->create([
            'name' => 'Test Rule',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/admin/discount-rule/{$rule->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $rule->id)
            ->assertJsonPath('data.name', 'Test Rule')
            ->assertJsonPath('data.discount_value', 20);
    }

    /** @test */
    public function it_returns_404_for_nonexistent_rule()
    {
        $response = $this->actingAs($this->admin)->getJson('/api/admin/discount-rule/99999');

        $response->assertNotFound();
    }

    /** @test */
    public function it_can_create_product_discount_rule()
    {
        $data = [
            'name' => 'New Product Discount',
            'rule_type' => 'product',
            'discount_type' => 'percentage',
            'discount_value' => 15,
            'is_active' => true,
            'priority' => 10,
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/admin/discount-rule', $data);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'New Product Discount');

        $this->assertDatabaseHas('discount_rules', [
            'name' => 'New Product Discount',
            'discount_value' => 15,
        ]);
    }

    /** @test */
    public function it_can_create_rule_with_conditions()
    {
        $data = [
            'name' => 'Cart Minimum Rule',
            'rule_type' => 'cart',
            'discount_type' => 'fixed_amount',
            'discount_value' => 50,
            'is_active' => true,
            'conditions' => [
                [
                    'condition_type' => 'cart_subtotal',
                    'operator' => 'gte',
                    'value' => 500,
                ],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/admin/discount-rule', $data);

        $response->assertCreated();

        $ruleId = $response->json('data.id');
        $this->assertDatabaseHas('discount_rule_conditions', [
            'discount_rule_id' => $ruleId,
            'type' => 'cart_subtotal',
            'operator' => '>=',
        ]);
    }

    /** @test */
    public function it_can_create_rule_with_filters()
    {
        $data = [
            'name' => 'Category Discount',
            'rule_type' => 'product',
            'discount_type' => 'percentage',
            'discount_value' => 20,
            'is_active' => true,
            'filters' => [
                [
                    'filter_type' => 'category',
                    'filter_values' => [1, 2, 3],
                    'target' => 'both',
                    'is_exclude' => false,
                ],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/admin/discount-rule', $data);

        $response->assertCreated();

        $ruleId = $response->json('data.id');
        $this->assertDatabaseHas('discount_rule_filters', [
            'discount_rule_id' => $ruleId,
            'filter_type' => 'category',
            'target' => 'both',
        ]);
    }

    /** @test */
    public function it_validates_required_fields_on_create()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/admin/discount-rule', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'rule_type', 'discount_type', 'discount_value']);
    }

    /** @test */
    public function it_validates_rule_type_enum()
    {
        $data = [
            'name' => 'Invalid Rule',
            'rule_type' => 'invalid_type',
            'discount_type' => 'percentage',
            'discount_value' => 10,
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/admin/discount-rule', $data);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['rule_type']);
    }

    /** @test */
    public function it_can_update_discount_rule()
    {
        $rule = DiscountRule::factory()->create([
            'name' => 'Original Name',
            'discount_value' => 10,
        ]);

        $data = [
            'name' => 'Updated Name',
            'rule_type' => 'product',
            'discount_type' => 'percentage',
            'discount_value' => 25,
        ];

        $response = $this->actingAs($this->admin)->putJson("/api/admin/discount-rule/{$rule->id}", $data);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.discount_value', 25);

        $this->assertDatabaseHas('discount_rules', [
            'id' => $rule->id,
            'name' => 'Updated Name',
        ]);
    }

    /** @test */
    public function it_can_delete_discount_rule()
    {
        $rule = DiscountRule::factory()->create();

        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/discount-rule/{$rule->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        // Soft delete check
        $this->assertSoftDeleted('discount_rules', ['id' => $rule->id]);
    }

    /** @test */
    public function it_can_bulk_delete_rules()
    {
        $rules = DiscountRule::factory()->count(3)->create();
        $ids = $rules->pluck('id')->toArray();

        $response = $this->actingAs($this->admin)->postJson('/api/admin/discount-rule/bulk-delete', [
            'ids' => $ids,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        foreach ($ids as $id) {
            $this->assertSoftDeleted('discount_rules', ['id' => $id]);
        }
    }

    /** @test */
    public function it_can_toggle_rule_status()
    {
        $rule = DiscountRule::factory()->create(['is_active' => false]);

        $response = $this->actingAs($this->admin)->putJson("/api/admin/discount-rule/{$rule->id}/toggle-status");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('discount_rules', [
            'id' => $rule->id,
            'is_active' => true,
        ]);
    }

    /** @test */
    public function it_can_duplicate_rule()
    {
        $rule = DiscountRule::factory()->create([
            'name' => 'Original Rule',
            'discount_value' => 20,
        ]);

        $response = $this->actingAs($this->admin)->postJson("/api/admin/discount-rule/{$rule->id}/duplicate");

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Original Rule (Copy)')
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseCount('discount_rules', 2);
    }

    /** @test */
    public function it_can_get_enums()
    {
        $response = $this->actingAs($this->admin)->getJson('/api/admin/discount-rule/enums');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'rule_types',
                    'discount_types',
                    'condition_types',
                    'filter_types',
                    'filter_targets',
                    'schedule_types',
                    'selection_strategies',
                ],
            ]);
    }

    /** @test */
    public function it_can_get_stacking_groups()
    {
        DiscountRule::factory()->create(['stacking_group' => 'seasonal']);
        DiscountRule::factory()->create(['stacking_group' => 'clearance']);
        DiscountRule::factory()->create(['stacking_group' => 'seasonal']); // duplicate

        $response = $this->actingAs($this->admin)->getJson('/api/admin/discount-rule/stacking-groups');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    /** @test */
    public function it_can_get_rule_statistics()
    {
        $rule = DiscountRule::factory()->create([
            'usage_limit_total' => 100,
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/admin/discount-rule/{$rule->id}/statistics");

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'rule_id',
                    'rule_name',
                    'total_uses',
                    'total_discount_given',
                    'usage_limit',
                    'remaining_uses',
                    'uses_by_day',
                    'top_users',
                    'recent_orders',
                ],
            ]);
    }
}
