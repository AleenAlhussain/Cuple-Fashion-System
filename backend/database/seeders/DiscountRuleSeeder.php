<?php

namespace Database\Seeders;

use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Models\DiscountRule;
use App\Models\DiscountRuleCondition;
use App\Models\DiscountRuleFilter;
use App\Models\DiscountRuleRange;
use App\Models\DiscountRuleSchedule;
use Illuminate\Database\Seeder;

class DiscountRuleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Product Discount: 20% off all items
        $productDiscount = DiscountRule::create([
            'name' => 'Summer Sale - 20% Off',
            'internal_code' => 'SUMMER20',
            'description' => 'Get 20% off on all products during summer sale',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'is_active' => true,
            'priority' => 50,
            'max_discount_amount' => 100, // Max 100 AED discount
            'offer_message' => 'Summer Sale! 20% off on all items',
            'starts_at' => now(),
            'ends_at' => now()->addMonths(2),
        ]);

        // 2. Cart Discount: 50 AED off when cart > 300 AED
        $cartDiscount = DiscountRule::create([
            'name' => 'Spend 300, Save 50',
            'internal_code' => 'SAVE50',
            'description' => 'Get 50 AED off when you spend 300 AED or more',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 50,
            'is_active' => true,
            'priority' => 40,
            'offer_message' => 'You qualify for 50 AED off!',
        ]);

        DiscountRuleCondition::create([
            'discount_rule_id' => $cartDiscount->id,
            'type' => 'cart_subtotal',
            'operator' => '>=',
            'value' => '300',
        ]);

        // 3. Bulk Discount: Tiered pricing
        $bulkDiscount = DiscountRule::create([
            'name' => 'Bulk Buy Savings',
            'internal_code' => 'BULK',
            'description' => 'Buy more, save more! Tiered discounts on quantity.',
            'rule_type' => DiscountRuleType::BULK,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10, // Base value, ranges override
            'is_active' => true,
            'priority' => 60,
            'min_qty' => 2,
            'is_recursive' => true,
            'offer_message' => 'Bulk discount applied!',
        ]);

        // Bulk tiers
        DiscountRuleRange::create([
            'discount_rule_id' => $bulkDiscount->id,
            'min_qty' => 2,
            'max_qty' => 4,
            'discount_type' => 'percentage',
            'discount_value' => 10,
        ]);

        DiscountRuleRange::create([
            'discount_rule_id' => $bulkDiscount->id,
            'min_qty' => 5,
            'max_qty' => 9,
            'discount_type' => 'percentage',
            'discount_value' => 15,
        ]);

        DiscountRuleRange::create([
            'discount_rule_id' => $bulkDiscount->id,
            'min_qty' => 10,
            'max_qty' => null,
            'discount_type' => 'percentage',
            'discount_value' => 20,
        ]);

        // 4. BOGO: Buy 2 Get 1 Free
        $bogoDiscount = DiscountRule::create([
            'name' => 'Buy 2 Get 1 Free',
            'internal_code' => 'BOGO21',
            'description' => 'Buy 2 items, get 1 free (cheapest item)',
            'rule_type' => DiscountRuleType::BOGO,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 100, // 100% off the free item
            'is_active' => true,
            'priority' => 70,
            'buy_qty' => 2,
            'get_qty' => 1,
            'selection_strategy' => 'cheapest',
            'offer_message' => 'Congrats! You get 1 item free!',
        ]);

        // BOGO range
        DiscountRuleRange::create([
            'discount_rule_id' => $bogoDiscount->id,
            'min_qty' => 2,
            'max_qty' => null,
            'discount_type' => 'percentage',
            'discount_value' => 100,
            'free_qty' => 1,
        ]);

        // 5. Bundle Discount: 3 for 199 AED
        $bundleDiscount = DiscountRule::create([
            'name' => '3 for 199 AED',
            'internal_code' => '3FOR199',
            'description' => 'Buy any 3 items from the collection for just 199 AED',
            'rule_type' => DiscountRuleType::BUNDLE,
            'discount_type' => DiscountType::FIXED_PRICE,
            'discount_value' => 199,
            'is_active' => true,
            'priority' => 80,
            'bundle_qty' => 3,
            'bundle_price' => 199,
            'offer_message' => 'Bundle deal! 3 items for 199 AED',
        ]);

        // 6. First Order Discount
        $firstOrderDiscount = DiscountRule::create([
            'name' => 'Welcome Discount - First Order',
            'internal_code' => 'WELCOME15',
            'description' => 'Get 15% off on your first order',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 15,
            'is_active' => true,
            'priority' => 90,
            'max_discount_amount' => 75,
            'usage_limit_per_user' => 1,
            'offer_message' => 'Welcome! Enjoy 15% off your first order!',
        ]);

        DiscountRuleCondition::create([
            'discount_rule_id' => $firstOrderDiscount->id,
            'type' => 'first_order',
            'operator' => '==',
            'value' => 'true',
        ]);

        // 7. UAE Exclusive Discount
        $uaeDiscount = DiscountRule::create([
            'name' => 'UAE Exclusive - 10% Off',
            'internal_code' => 'UAE10',
            'description' => 'Special discount for UAE customers',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'is_active' => true,
            'priority' => 30,
            'offer_message' => 'UAE exclusive discount applied!',
        ]);

        DiscountRuleCondition::create([
            'discount_rule_id' => $uaeDiscount->id,
            'type' => 'country',
            'operator' => 'in',
            'value' => 'UAE,AE',
        ]);

        // 8. VIP Customer Discount
        $vipDiscount = DiscountRule::create([
            'name' => 'VIP Customer Discount',
            'internal_code' => 'VIP25',
            'description' => 'Exclusive 25% discount for VIP members',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 25,
            'is_active' => true,
            'priority' => 100,
            'stop_other_rules' => true, // VIP discount is exclusive
            'offer_message' => 'VIP discount applied!',
        ]);

        DiscountRuleCondition::create([
            'discount_rule_id' => $vipDiscount->id,
            'type' => 'user_role',
            'operator' => '==',
            'value' => 'vip',
        ]);

        // 9. Weekend Flash Sale (Friday-Saturday)
        $weekendSale = DiscountRule::create([
            'name' => 'Weekend Flash Sale',
            'internal_code' => 'WEEKEND30',
            'description' => '30% off every Friday and Saturday',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 30,
            'is_active' => true,
            'priority' => 45,
            'timezone' => 'Asia/Dubai',
            'offer_message' => 'Weekend Flash Sale! 30% off today only!',
        ]);

        // Friday schedule
        DiscountRuleSchedule::create([
            'discount_rule_id' => $weekendSale->id,
            'type' => 'weekly_window',
            'day_of_week' => 5, // Friday
            'start_time' => '00:00',
            'end_time' => '23:59',
        ]);

        // Saturday schedule
        DiscountRuleSchedule::create([
            'discount_rule_id' => $weekendSale->id,
            'type' => 'weekly_window',
            'day_of_week' => 6, // Saturday
            'start_time' => '00:00',
            'end_time' => '23:59',
        ]);

        // 10. Limited Usage Discount
        $limitedDiscount = DiscountRule::create([
            'name' => 'Flash Deal - Limited to 100 Uses',
            'internal_code' => 'FLASH100',
            'description' => 'Quick! Only 100 uses available for this exclusive deal',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 40,
            'is_active' => true,
            'priority' => 95,
            'usage_limit_total' => 100,
            'usage_limit_per_user' => 1,
            'offer_message' => 'Flash deal applied! You got 40% off!',
        ]);

        DiscountRuleCondition::create([
            'discount_rule_id' => $limitedDiscount->id,
            'type' => 'cart_subtotal',
            'operator' => '>=',
            'value' => '200',
        ]);

        // 11. Promo Code Discount: Requires code SAVE25
        $promoDiscount = DiscountRule::create([
            'name' => 'Promo Code - SAVE25',
            'internal_code' => 'PROMO_SAVE25',
            'description' => 'Enter promo code SAVE25 to get 25% off your order',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 25,
            'is_active' => true,
            'priority' => 55,
            'max_discount_amount' => 150,
            'requires_promo_code' => true,
            'promo_code' => 'SAVE25',
            'show_as_coupon' => true,
            'offer_message' => 'Promo code SAVE25 applied! 25% off your order!',
        ]);

        DiscountRuleCondition::create([
            'discount_rule_id' => $promoDiscount->id,
            'type' => 'cart_subtotal',
            'operator' => '>=',
            'value' => '100',
        ]);

        // 12. Promo Code + Filter Conditions: NEWUSER coupon
        $newUserPromo = DiscountRule::create([
            'name' => 'New User Coupon - NEWUSER',
            'internal_code' => 'PROMO_NEWUSER',
            'description' => 'New users get 30 AED off when buying 2+ eligible items worth 150+ AED',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 30,
            'is_active' => true,
            'priority' => 65,
            'requires_promo_code' => true,
            'promo_code' => 'NEWUSER',
            'show_as_coupon' => true,
            'filter_conditions' => [
                ['type' => 'eligible_qty', 'operator' => '>=', 'value' => 2],
                ['type' => 'eligible_subtotal', 'operator' => '>=', 'value' => 150],
            ],
            'offer_message' => 'Welcome! 30 AED off with code NEWUSER!',
        ]);

        DiscountRuleCondition::create([
            'discount_rule_id' => $newUserPromo->id,
            'type' => 'first_order',
            'operator' => '==',
            'value' => 'true',
        ]);

        // 13. Filter Conditions Only (no promo code): Minimum eligible items
        $filterCondRule = DiscountRule::create([
            'name' => 'Buy 3+ Items Get 15% Off',
            'internal_code' => 'MIN3ITEMS',
            'description' => 'Automatic 15% off when you have 3 or more eligible items in your cart',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 15,
            'is_active' => true,
            'priority' => 42,
            'filter_conditions' => [
                ['type' => 'eligible_qty', 'operator' => '>=', 'value' => 3],
            ],
            'offer_message' => '15% off! You have 3+ qualifying items!',
        ]);

        // 14. BXGX with Promo Code: Buy 3 Get 1 Free (same product)
        $bxgxPromo = DiscountRule::create([
            'name' => 'BXGX Promo - Buy 3 Get 1 Free',
            'internal_code' => 'BXGX_FREE1',
            'description' => 'Use code FREE1 - Buy 3 of the same item, get 1 free',
            'rule_type' => DiscountRuleType::BXGX,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 100,
            'is_active' => true,
            'priority' => 75,
            'buy_qty' => 3,
            'get_qty' => 1,
            'selection_strategy' => 'cheapest',
            'requires_promo_code' => true,
            'promo_code' => 'FREE1',
            'show_as_coupon' => false,
            'offer_message' => 'Buy 3 Get 1 Free applied!',
        ]);

        $this->command->info('Created 14 demo discount rules successfully!');
    }
}
