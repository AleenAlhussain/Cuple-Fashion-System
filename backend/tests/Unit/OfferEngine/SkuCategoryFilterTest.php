<?php

namespace Tests\Unit\OfferEngine;

use App\Models\DiscountRuleFilter;
use Tests\TestCase;

class SkuCategoryFilterTest extends TestCase
{
    /**
     * Test SKU + Category combined filter - both must match.
     */
    public function test_sku_category_filter_matches_when_both_sku_and_category_match(): void
    {
        $filter = new DiscountRuleFilter([
            'filter_type' => 'sku_category',
            'filter_values' => ['SKU-001', 'SKU-002'], // SKUs to match
            'secondary_type' => 'category',
            'secondary_values' => [1, 2], // Category IDs (e.g., Shoes = 1, Bags = 2)
            'is_exclude' => false,
        ]);

        // Test: SKU-001 in category 1 (Shoes) - should match
        $cartItem1 = [
            'variant_sku' => 'SKU-001',
            'category_ids' => [1], // Shoes
            'product_id' => 100,
            'variant_id' => 200,
        ];
        $this->assertTrue($filter->matches($cartItem1), 'SKU-001 in Shoes category should match');

        // Test: SKU-002 in category 2 (Bags) - should match
        $cartItem2 = [
            'variant_sku' => 'SKU-002',
            'category_ids' => [2], // Bags
            'product_id' => 101,
            'variant_id' => 201,
        ];
        $this->assertTrue($filter->matches($cartItem2), 'SKU-002 in Bags category should match');

        // Test: SKU-001 in category 3 (Accessories) - should NOT match (wrong category)
        $cartItem3 = [
            'variant_sku' => 'SKU-001',
            'category_ids' => [3], // Accessories - not in secondary_values
            'product_id' => 100,
            'variant_id' => 200,
        ];
        $this->assertFalse($filter->matches($cartItem3), 'SKU-001 in Accessories should NOT match (wrong category)');

        // Test: SKU-003 in category 1 (Shoes) - should NOT match (wrong SKU)
        $cartItem4 = [
            'variant_sku' => 'SKU-003',
            'category_ids' => [1], // Shoes
            'product_id' => 102,
            'variant_id' => 202,
        ];
        $this->assertFalse($filter->matches($cartItem4), 'SKU-003 in Shoes should NOT match (wrong SKU)');

        // Test: SKU-003 in category 3 - should NOT match (both wrong)
        $cartItem5 = [
            'variant_sku' => 'SKU-003',
            'category_ids' => [3], // Accessories
            'product_id' => 102,
            'variant_id' => 202,
        ];
        $this->assertFalse($filter->matches($cartItem5), 'SKU-003 in Accessories should NOT match (both wrong)');
    }

    /**
     * Test SKU + Tag combined filter - both must match.
     */
    public function test_sku_tag_filter_matches_when_both_sku_and_tag_match(): void
    {
        $filter = new DiscountRuleFilter([
            'filter_type' => 'sku_tag',
            'filter_values' => ['SKU-001', 'SKU-002'], // SKUs to match
            'secondary_type' => 'tag',
            'secondary_values' => [10, 20], // Tag IDs (e.g., Sale = 10, Featured = 20)
            'is_exclude' => false,
        ]);

        // Test: SKU-001 with tag 10 (Sale) - should match
        $cartItem1 = [
            'variant_sku' => 'SKU-001',
            'tag_ids' => [10], // Sale
            'category_ids' => [1],
            'product_id' => 100,
            'variant_id' => 200,
        ];
        $this->assertTrue($filter->matches($cartItem1), 'SKU-001 with Sale tag should match');

        // Test: SKU-002 with tag 20 (Featured) - should match
        $cartItem2 = [
            'variant_sku' => 'SKU-002',
            'tag_ids' => [20], // Featured
            'category_ids' => [1],
            'product_id' => 101,
            'variant_id' => 201,
        ];
        $this->assertTrue($filter->matches($cartItem2), 'SKU-002 with Featured tag should match');

        // Test: SKU-001 with tag 30 (New Arrival) - should NOT match (wrong tag)
        $cartItem3 = [
            'variant_sku' => 'SKU-001',
            'tag_ids' => [30], // New Arrival - not in secondary_values
            'category_ids' => [1],
            'product_id' => 100,
            'variant_id' => 200,
        ];
        $this->assertFalse($filter->matches($cartItem3), 'SKU-001 with New Arrival tag should NOT match (wrong tag)');

        // Test: SKU-003 with tag 10 (Sale) - should NOT match (wrong SKU)
        $cartItem4 = [
            'variant_sku' => 'SKU-003',
            'tag_ids' => [10], // Sale
            'category_ids' => [1],
            'product_id' => 102,
            'variant_id' => 202,
        ];
        $this->assertFalse($filter->matches($cartItem4), 'SKU-003 with Sale tag should NOT match (wrong SKU)');
    }

    /**
     * Test SKU + Category filter with no secondary values - should match on SKU only.
     */
    public function test_sku_category_filter_with_no_secondary_values_matches_on_sku_only(): void
    {
        $filter = new DiscountRuleFilter([
            'filter_type' => 'sku_category',
            'filter_values' => ['SKU-001', 'SKU-002'],
            'secondary_type' => 'category',
            'secondary_values' => [], // Empty - no category restriction
            'is_exclude' => false,
        ]);

        // Test: SKU-001 in any category - should match (no category restriction)
        $cartItem1 = [
            'variant_sku' => 'SKU-001',
            'category_ids' => [99], // Any category
            'product_id' => 100,
            'variant_id' => 200,
        ];
        $this->assertTrue($filter->matches($cartItem1), 'SKU-001 in any category should match when no secondary values');

        // Test: SKU-003 - should NOT match (wrong SKU)
        $cartItem2 = [
            'variant_sku' => 'SKU-003',
            'category_ids' => [1],
            'product_id' => 102,
            'variant_id' => 202,
        ];
        $this->assertFalse($filter->matches($cartItem2), 'SKU-003 should NOT match (wrong SKU)');
    }

    /**
     * Test SKU matching is case-insensitive.
     */
    public function test_sku_matching_is_case_insensitive(): void
    {
        $filter = new DiscountRuleFilter([
            'filter_type' => 'sku_category',
            'filter_values' => ['SKU-001', 'sku-002'],
            'secondary_type' => 'category',
            'secondary_values' => [1],
            'is_exclude' => false,
        ]);

        // Test: lowercase sku-001 should match SKU-001
        $cartItem1 = [
            'variant_sku' => 'sku-001',
            'category_ids' => [1],
            'product_id' => 100,
            'variant_id' => 200,
        ];
        $this->assertTrue($filter->matches($cartItem1), 'sku-001 (lowercase) should match SKU-001');

        // Test: uppercase SKU-002 should match sku-002
        $cartItem2 = [
            'variant_sku' => 'SKU-002',
            'category_ids' => [1],
            'product_id' => 101,
            'variant_id' => 201,
        ];
        $this->assertTrue($filter->matches($cartItem2), 'SKU-002 (uppercase) should match sku-002');
    }

    /**
     * Test multiple categories - item with any matching category should pass.
     */
    public function test_sku_category_filter_matches_when_item_has_any_matching_category(): void
    {
        $filter = new DiscountRuleFilter([
            'filter_type' => 'sku_category',
            'filter_values' => ['SKU-001'],
            'secondary_type' => 'category',
            'secondary_values' => [1, 2], // Shoes = 1, Bags = 2
            'is_exclude' => false,
        ]);

        // Test: SKU-001 in multiple categories including one that matches
        $cartItem = [
            'variant_sku' => 'SKU-001',
            'category_ids' => [3, 1, 5], // Has category 1 (Shoes) among others
            'product_id' => 100,
            'variant_id' => 200,
        ];
        $this->assertTrue($filter->matches($cartItem), 'SKU-001 with category 1 among others should match');
    }
}
