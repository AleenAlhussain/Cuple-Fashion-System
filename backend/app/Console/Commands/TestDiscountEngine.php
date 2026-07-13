<?php

namespace App\Console\Commands;

use App\Models\DiscountRule;
use App\Models\ProductVariant;
use App\Services\OfferEngine\SkuOfferEngineService;
use Illuminate\Console\Command;

class TestDiscountEngine extends Command
{
    protected $signature = 'discount:test
        {--scenario=basic : Test scenario (basic, bogo, bulk, cart, stacking, all)}
        {--sku= : Specific SKU to test}
        {--qty=1 : Quantity for testing}
        {--price=100 : Price for testing}
        {--cleanup : Clean up test data after running}';

    protected $description = 'Test the SKU-based discount engine';

    private SkuOfferEngineService $engine;

    public function __construct()
    {
        parent::__construct();
        $this->engine = new SkuOfferEngineService();
    }

    public function handle(): int
    {
        $scenario = $this->option('scenario');

        $this->info("====================================");
        $this->info("SKU-Based Discount Engine Test");
        $this->info("====================================\n");

        match ($scenario) {
            'basic' => $this->testBasicDiscount(),
            'bogo' => $this->testBogoDiscount(),
            'bulk' => $this->testBulkDiscount(),
            'cart' => $this->testCartDiscount(),
            'stacking' => $this->testStackingRules(),
            'all' => $this->runAllTests(),
            default => $this->testBasicDiscount(),
        };

        return Command::SUCCESS;
    }

    private function testBasicDiscount(): void
    {
        $this->info("TEST: Basic Product Discount");
        $this->info("----------------------------");

        $sku = $this->option('sku') ?? 'TEST-SKU-001';
        $qty = (int) $this->option('qty');
        $price = (float) $this->option('price');

        $items = [[
            'variant_id' => 1,
            'sku' => $sku,
            'variant_sku' => $sku,
            'price' => $price,
            'qty' => $qty,
            'product_id' => 1,
            'category_ids' => [1],
            'tag_ids' => [],
            'promo_group_ids' => [],
        ]];

        $result = $this->engine->calculateDiscounts($items, $price * $qty, 0, []);

        $this->displayResult($result);
    }

    private function testBogoDiscount(): void
    {
        $this->info("TEST: BOGO (Buy 2 Get 1 Free)");
        $this->info("-----------------------------");

        $price = 100;
        $items = [[
            'variant_id' => 1,
            'sku' => 'BOGO-TEST-001',
            'variant_sku' => 'BOGO-TEST-001',
            'price' => $price,
            'qty' => 3, // Buy 2 Get 1
            'product_id' => 1,
            'category_ids' => [1],
            'tag_ids' => [],
            'promo_group_ids' => [],
        ]];

        $result = $this->engine->calculateDiscounts($items, $price * 3, 0, []);

        $this->displayResult($result);
        $this->info("Expected: 1 item free (100 AED discount)");
    }

    private function testBulkDiscount(): void
    {
        $this->info("TEST: Bulk Discount (Buy 3+ get 15% off)");
        $this->info("----------------------------------------");

        $price = 100;
        $items = [[
            'variant_id' => 1,
            'sku' => 'BULK-TEST-001',
            'variant_sku' => 'BULK-TEST-001',
            'price' => $price,
            'qty' => 5,
            'product_id' => 1,
            'category_ids' => [1],
            'tag_ids' => [],
            'promo_group_ids' => [],
        ]];

        $result = $this->engine->calculateDiscounts($items, $price * 5, 0, []);

        $this->displayResult($result);
        $this->info("Expected: 15% off 500 = 75 AED discount");
    }

    private function testCartDiscount(): void
    {
        $this->info("TEST: Cart Discount (10% off orders over 300)");
        $this->info("----------------------------------------------");

        $items = [
            [
                'variant_id' => 1,
                'sku' => 'CART-TEST-001',
                'variant_sku' => 'CART-TEST-001',
                'price' => 200,
                'qty' => 1,
                'product_id' => 1,
                'category_ids' => [1],
                'tag_ids' => [],
                'promo_group_ids' => [],
            ],
            [
                'variant_id' => 2,
                'sku' => 'CART-TEST-002',
                'variant_sku' => 'CART-TEST-002',
                'price' => 150,
                'qty' => 1,
                'product_id' => 2,
                'category_ids' => [1],
                'tag_ids' => [],
                'promo_group_ids' => [],
            ],
        ];

        $subtotal = 350;
        $result = $this->engine->calculateDiscounts($items, $subtotal, 0, []);

        $this->displayResult($result);
        $this->info("Expected: 10% off 350 = 35 AED discount");
    }

    private function testStackingRules(): void
    {
        $this->info("TEST: Stacking Rules");
        $this->info("--------------------");

        $this->info("\n1. Product + BOGO should stack:");
        $this->info("   Product: 20% off");
        $this->info("   BOGO: Buy 2 Get 1 Free");

        $items = [[
            'variant_id' => 1,
            'sku' => 'STACK-TEST-001',
            'variant_sku' => 'STACK-TEST-001',
            'price' => 100,
            'qty' => 3,
            'product_id' => 1,
            'category_ids' => [1],
            'tag_ids' => [],
            'promo_group_ids' => [],
        ]];

        $result = $this->engine->calculateDiscounts($items, 300, 0, []);

        $this->displayResult($result);
        $this->info("Expected: Product discount on 2 items + 1 free item");

        $this->info("\n2. Free Shipping should always stack:");

        $result = $this->engine->calculateDiscounts($items, 300, 25, []); // 25 AED shipping

        $this->displayResult($result);
        $this->info("Expected: Previous discounts + shipping discount");
    }

    private function runAllTests(): void
    {
        $this->testBasicDiscount();
        $this->newLine();

        $this->testBogoDiscount();
        $this->newLine();

        $this->testBulkDiscount();
        $this->newLine();

        $this->testCartDiscount();
        $this->newLine();

        $this->testStackingRules();
        $this->newLine();

        $this->showActiveRules();
    }

    private function showActiveRules(): void
    {
        $this->info("ACTIVE DISCOUNT RULES");
        $this->info("---------------------");

        $rules = DiscountRule::where('is_active', true)
            ->orderBy('priority', 'desc')
            ->get();

        if ($rules->isEmpty()) {
            $this->warn("No active discount rules found.");
            return;
        }

        $headers = ['ID', 'Name', 'Type', 'Discount', 'Priority'];
        $rows = $rules->map(fn($rule) => [
            $rule->id,
            $rule->name,
            $rule->rule_type instanceof \BackedEnum ? $rule->rule_type->value : $rule->rule_type,
            $rule->discount_display,
            $rule->priority,
        ])->toArray();

        $this->table($headers, $rows);
    }

    private function displayResult(array $result): void
    {
        $this->info("\n📊 Result:");
        $this->info("Total Discount: {$result['total_discount']} AED");
        $this->info("Grand Total: {$result['grand_total']} AED");

        if (!empty($result['applied_rules'])) {
            $this->info("\nApplied Rules:");
            foreach ($result['applied_rules'] as $rule) {
                $this->info("  - [{$rule['rule_type']}] {$rule['rule_name']}: {$rule['discount_amount']} AED");
            }
        } else {
            $this->warn("No rules applied.");
        }

        if (!empty($result['line_discounts'])) {
            $this->info("\nLine Discounts:");
            foreach ($result['line_discounts'] as $ld) {
                $this->info("  - [{$ld['type']}] {$ld['rule_name']}: {$ld['amount']} AED");
            }
        }

        if ($result['cart_discount'] > 0) {
            $this->info("\nCart Discount: {$result['cart_discount']} AED");
        }

        if ($result['shipping_discount'] > 0) {
            $this->info("\nShipping Discount: {$result['shipping_discount']} AED");
        }

        $this->newLine();
    }
}
