<?php

namespace Database\Seeders;

use App\Models\DiscountRule;
use App\Models\DiscountRuleCondition;
use App\Models\DiscountRuleRange;
use App\Models\DiscountRuleFilter;
use Illuminate\Database\Seeder;

class TestDiscountRulesSeeder extends Seeder
{
    public function run(): void
    {
        // Deactivate existing rules first
        DiscountRule::query()->update(['is_active' => false]);

        $this->command->info('Creating test discount rules...');

        // Rule 1: Product Discount (20% off all products)
        $rule1 = DiscountRule::updateOrCreate(
            ['name' => 'Summer Sale 20%'],
            [
                'description' => '20% off on all products',
                'rule_type' => 'product',
                'discount_type' => 'percentage',
                'discount_value' => 20,
                'is_active' => false,
                'priority' => 10,
                'starts_at' => now(),
                'ends_at' => now()->addMonth(),
            ]
        );
        // Clear filters so it applies to all products
        $rule1->filters()->delete();
        $rule1->conditions()->delete();
        $this->command->line("  ✓ Created: Summer Sale 20%");

        // Rule 2: BOGO (Buy 2 Get 1 Free)
        $rule2 = DiscountRule::updateOrCreate(
            ['name' => 'Buy 2 Get 1 Free'],
            [
                'description' => 'Buy any 2 items, get the cheapest one free',
                'rule_type' => 'bogo',
                'discount_type' => 'percentage',
                'discount_value' => 100,
                'buy_qty' => 2,
                'get_qty' => 1,
                'selection_strategy' => 'cheapest_first',
                'is_active' => false,
                'priority' => 20,
                'starts_at' => now(),
                'ends_at' => now()->addMonth(),
            ]
        );
        // Clear filters so it applies to all products
        $rule2->filters()->delete();
        $rule2->conditions()->delete();
        $this->command->line("  ✓ Created: Buy 2 Get 1 Free");

        // Rule 3: Cart Discount (10% off orders over 500 AED)
        $rule3 = DiscountRule::updateOrCreate(
            ['name' => '10% Off Orders Over 500'],
            [
                'description' => '10% discount on orders over 500 AED',
                'rule_type' => 'cart',
                'discount_type' => 'percentage',
                'discount_value' => 10,
                'is_active' => false,
                'priority' => 30,
                'starts_at' => now(),
                'ends_at' => now()->addMonth(),
            ]
        );
        // Add cart subtotal condition
        $rule3->filters()->delete();
        $rule3->conditions()->delete();
        $rule3->conditions()->create([
            'type' => 'cart_subtotal',
            'operator' => '>=',
            'value' => '500',
        ]);
        $this->command->line("  ✓ Created: 10% Off Orders Over 500");

        // Rule 4: Fixed Cart Discount (50 AED off orders over 300 AED)
        $rule4 = DiscountRule::updateOrCreate(
            ['name' => '50 AED Off Orders Over 300'],
            [
                'description' => '50 AED off on orders over 300 AED',
                'rule_type' => 'cart',
                'discount_type' => 'fixed_amount',
                'discount_value' => 50,
                'is_active' => false,
                'priority' => 40,
                'starts_at' => now(),
                'ends_at' => now()->addMonth(),
            ]
        );
        // Add cart subtotal condition
        $rule4->filters()->delete();
        $rule4->conditions()->delete();
        $rule4->conditions()->create([
            'type' => 'cart_subtotal',
            'operator' => '>=',
            'value' => '300',
        ]);
        $this->command->line("  ✓ Created: 50 AED Off Orders Over 300");

        // Rule 5: Bulk Discount (Buy 3+ get 15% off)
        $rule5 = DiscountRule::updateOrCreate(
            ['name' => 'Buy 3+ Get 15% Off'],
            [
                'description' => '15% off when buying 3 or more items',
                'rule_type' => 'bulk',
                'discount_type' => 'percentage',
                'discount_value' => 15,
                'is_active' => false,
                'priority' => 50,
                'starts_at' => now(),
                'ends_at' => now()->addMonth(),
            ]
        );
        // Add bulk range
        $rule5->filters()->delete();
        $rule5->conditions()->delete();
        $rule5->ranges()->delete();
        $rule5->ranges()->create([
            'min_qty' => 3,
            'max_qty' => null,
            'discount_type' => 'percentage',
            'discount_value' => 15,
        ]);
        $this->command->line("  ✓ Created: Buy 3+ Get 15% Off");

        $this->command->newLine();
        $this->command->info('Test discount rules created successfully!');
        $this->command->newLine();

        $this->command->table(
            ['ID', 'Name', 'Type', 'Discount', 'Active'],
            DiscountRule::orderBy('priority')->get(['id', 'name', 'rule_type', 'discount_value', 'is_active'])->toArray()
        );
    }
}
