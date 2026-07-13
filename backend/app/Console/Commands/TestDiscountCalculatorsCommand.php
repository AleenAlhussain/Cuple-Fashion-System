<?php

namespace App\Console\Commands;

use App\Models\DiscountRule;
use App\Services\OfferEngine\OfferEngineService;
use Illuminate\Console\Command;

class TestDiscountCalculatorsCommand extends Command
{
    protected $signature = 'discount:test {--type= : Test specific type (product, bogo, cart, bulk)} {--keep-active : Keep tested rules active after test}';
    protected $description = 'Test all discount calculators with sample cart data';

    // 3-item cart: 199 + 179 + 179 = 557 AED
    private array $testCart3Items = [
        ['variant_id' => 1, 'variant_sku' => 'SKU-001', 'product_id' => 2008, 'price' => 199.00, 'qty' => 1, 'category_ids' => [], 'tag_ids' => []],
        ['variant_id' => 2, 'variant_sku' => 'SKU-002', 'product_id' => 2021, 'price' => 179.00, 'qty' => 1, 'category_ids' => [], 'tag_ids' => []],
        ['variant_id' => 3, 'variant_sku' => 'SKU-003', 'product_id' => 2040, 'price' => 179.00, 'qty' => 1, 'category_ids' => [], 'tag_ids' => []],
    ];

    // 2-item cart: 199 + 179 = 378 AED (should NOT trigger Buy 2 Get 1 Free)
    private array $testCart2Items = [
        ['variant_id' => 1, 'variant_sku' => 'SKU-001', 'product_id' => 2008, 'price' => 199.00, 'qty' => 1, 'category_ids' => [], 'tag_ids' => []],
        ['variant_id' => 2, 'variant_sku' => 'SKU-002', 'product_id' => 2021, 'price' => 179.00, 'qty' => 1, 'category_ids' => [], 'tag_ids' => []],
    ];

    // 6-item cart for recursive BOGO test
    private array $testCart6Items = [
        ['variant_id' => 1, 'variant_sku' => 'SKU-001', 'product_id' => 2008, 'price' => 199.00, 'qty' => 2, 'category_ids' => [], 'tag_ids' => []],
        ['variant_id' => 2, 'variant_sku' => 'SKU-002', 'product_id' => 2021, 'price' => 179.00, 'qty' => 2, 'category_ids' => [], 'tag_ids' => []],
        ['variant_id' => 3, 'variant_sku' => 'SKU-003', 'product_id' => 2040, 'price' => 159.00, 'qty' => 2, 'category_ids' => [], 'tag_ids' => []],
    ];

    // Alias for backward compatibility
    private array $testCart = [];

    public function handle(): int
    {
        $this->testCart = $this->testCart3Items; // Default to 3-item cart

        $cart3Total = array_sum(array_map(fn($item) => $item['price'] * $item['qty'], $this->testCart3Items));

        $this->info("=== Discount Calculators Test ===");
        $this->info("Default Cart: 3 items, Total: {$cart3Total} AED (199 + 179 + 179)");
        $this->newLine();

        $service = app(OfferEngineService::class);
        $results = [];
        $type = $this->option('type');

        // Deactivate all rules first
        DiscountRule::query()->update(['is_active' => false]);

        // Test Product Discount (20%)
        if (!$type || $type === 'product') {
            $results[] = $this->testRuleWithCart('product', 'Summer Sale 20%', 111.40, $service, $this->testCart3Items, '3 items');
        }

        // Test BOGO (Buy 2 Get 1 Free) - needs 3 items
        if (!$type || $type === 'bogo') {
            // Test with 2 items - should NOT apply (need 3 for Buy 2 Get 1)
            $results[] = $this->testRuleWithCart('bogo', 'Buy 2 Get 1 Free', 0.00, $service, $this->testCart2Items, '2 items (no discount)');

            // Test with 3 items - should apply (1 free = 179 AED)
            $results[] = $this->testRuleWithCart('bogo', 'Buy 2 Get 1 Free', 179.00, $service, $this->testCart3Items, '3 items (1 free)');

            // Test recursive BOGO with 6 items - should give 2 free items (cheapest 2)
            // 6 items = 2 × (Buy 2 + Get 1) = 2 free items (159 + 159 = 318 AED)
            $results[] = $this->testRuleWithCart('bogo-recursive', 'Buy 2 Get 1 Free', 318.00, $service, $this->testCart6Items, '6 items (2 free)');
        }

        // Test Cart Discount (10% over 500)
        if (!$type || $type === 'cart') {
            $results[] = $this->testRuleWithCart('cart', '10% Off Orders Over 500', 55.70, $service, $this->testCart3Items, '3 items');
        }

        // Test Fixed Cart Discount (50 off over 300)
        if (!$type || $type === 'fixed') {
            $results[] = $this->testRuleWithCart('cart', '50 AED Off Orders Over 300', 50.00, $service, $this->testCart3Items, '3 items');
        }

        // Test Bulk Discount (3+ items = 15% off)
        if (!$type || $type === 'bulk') {
            $results[] = $this->testRuleWithCart('bulk', 'Buy 3+ Get 15% Off', 83.55, $service, $this->testCart3Items, '3 items');
        }

        // Deactivate all after testing (unless --keep-active flag is set)
        if (!$this->option('keep-active')) {
            DiscountRule::query()->update(['is_active' => false]);
            $this->line("All rules deactivated. Use --keep-active to keep tested rules active.");
        } else {
            $this->line("Rules left in tested state (last tested rule is active).");
        }

        // Summary table
        $this->newLine();
        $this->info("=== Summary ===");
        $this->table(
            ['Rule Name', 'Type', 'Cart', 'Expected', 'Actual', 'Status'],
            $results
        );

        $passed = count(array_filter($results, fn($r) => $r[5] === '✅ PASS'));
        $total = count($results);

        $this->newLine();
        if ($passed === $total) {
            $this->info("All {$total} tests passed!");
        } else {
            $this->error("{$passed}/{$total} tests passed. Please fix failing calculators.");
        }

        return $passed === $total ? 0 : 1;
    }

    private function testRuleWithCart(string $type, string $ruleName, float $expected, OfferEngineService $service, array $cart, string $cartLabel): array
    {
        // Deactivate all rules
        DiscountRule::query()->update(['is_active' => false]);

        // Find and activate only this rule
        $rule = DiscountRule::where('name', $ruleName)->first();

        if (!$rule) {
            return [$ruleName, $type, $cartLabel, number_format($expected, 2), 'RULE NOT FOUND', '❌ FAIL'];
        }

        $rule->update(['is_active' => true]);

        // For recursive BOGO test, enable is_recursive
        if ($type === 'bogo-recursive') {
            $rule->update(['is_recursive' => true]);
        } else {
            $rule->update(['is_recursive' => false]);
        }

        // Clear any filters that might interfere
        $rule->filters()->delete();

        $cartTotal = array_sum(array_map(fn($item) => $item['price'] * $item['qty'], $cart));
        $itemCount = array_sum(array_map(fn($item) => $item['qty'], $cart));
        $this->line("Testing: {$ruleName} ({$type}) with {$itemCount} items, {$cartTotal} AED");

        try {
            $result = $service->calculate($cart, ['country' => 'AE']);
            $actual = $result->getTotalDiscount();

            // Allow small floating point tolerance
            $tolerance = 0.01;
            $passed = abs($actual - $expected) <= $tolerance;

            $status = $passed ? '✅ PASS' : '❌ FAIL';
            $this->line("  Expected: {$expected} AED, Actual: {$actual} AED - {$status}");

            if (!$passed) {
                $this->warn("  Applied rules: " . json_encode($result->applied_rules));
                $this->warn("  Free items: " . json_encode($result->free_items));
            }

            return [$ruleName, $type, $cartLabel, number_format($expected, 2), number_format($actual, 2), $status];
        } catch (\Exception $e) {
            $this->error("  Error: " . $e->getMessage());
            return [$ruleName, $type, $cartLabel, number_format($expected, 2), 'ERROR', '❌ FAIL'];
        }
    }
}
