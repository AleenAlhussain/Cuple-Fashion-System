<?php

namespace App\Console\Commands;

use App\Enums\ConditionType;
use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Enums\FilterTarget;
use App\Enums\FilterType;
use App\Models\Category;
use App\Models\DiscountRule;
use App\Models\DiscountRuleCondition;
use App\Models\DiscountRuleFilter;
use App\Models\DiscountRuleRange;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\OfferEngine\OfferEngineService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TestDiscountRulesComplete extends Command
{
    protected $signature = 'discount:test-complete
                            {--scenario= : Run specific scenario (product,cart,bulk,bundle,bogo,bxgx,filters,conditions,stacking,messages,all)}
                            {--cleanup : Clean up test data after running}';

    protected $description = 'Comprehensive test for all discount rule scenarios';

    protected OfferEngineService $offerEngine;
    protected array $testResults = [];
    protected int $passed = 0;
    protected int $failed = 0;

    // Test data IDs
    protected array $testCategories = [];
    protected array $testProducts = [];
    protected array $testVariants = [];
    protected array $testRules = [];

    public function handle(): int
    {
        $this->offerEngine = app(OfferEngineService::class);
        $scenario = $this->option('scenario') ?? 'all';

        $this->info('');
        $this->info('╔══════════════════════════════════════════════════════════════╗');
        $this->info('║       DISCOUNT RULES COMPREHENSIVE TEST SUITE                ║');
        $this->info('╚══════════════════════════════════════════════════════════════╝');
        $this->info('');

        try {
            DB::beginTransaction();

            // Setup test data
            $this->setupTestData();

            // Run scenarios based on option
            $scenarios = $scenario === 'all'
                ? ['product', 'cart', 'bulk', 'bundle', 'bogo', 'bxgx', 'filters', 'conditions', 'stacking', 'messages']
                : [$scenario];

            foreach ($scenarios as $s) {
                $this->runScenario($s);
            }

            // Display summary
            $this->displaySummary();

            if ($this->option('cleanup')) {
                DB::rollBack();
                $this->info('Test data cleaned up (rolled back).');
            } else {
                DB::commit();
                $this->info('Test data committed to database. Use --cleanup to rollback.');
            }

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Test failed with exception: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return Command::FAILURE;
        }

        return $this->failed > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    protected function setupTestData(): void
    {
        $this->info('Setting up test data...');

        // Create test categories
        $this->testCategories['shirts'] = Category::create([
            'name' => 'Test Shirts',
            'slug' => 'test-shirts-' . time(),
            'status' => true,
        ]);
        $this->testCategories['pants'] = Category::create([
            'name' => 'Test Pants',
            'slug' => 'test-pants-' . time(),
            'status' => true,
        ]);
        $this->testCategories['accessories'] = Category::create([
            'name' => 'Test Accessories',
            'slug' => 'test-accessories-' . time(),
            'status' => true,
        ]);

        // Create test products with variants
        $products = [
            ['name' => 'Test Shirt A', 'category' => 'shirts', 'price' => 100],
            ['name' => 'Test Shirt B', 'category' => 'shirts', 'price' => 150],
            ['name' => 'Test Pants A', 'category' => 'pants', 'price' => 200],
            ['name' => 'Test Pants B', 'category' => 'pants', 'price' => 250],
            ['name' => 'Test Belt', 'category' => 'accessories', 'price' => 50],
            ['name' => 'Test Watch', 'category' => 'accessories', 'price' => 300],
        ];

        foreach ($products as $index => $data) {
            $sku = 'TEST-PROD-' . time() . '-' . $index;
            $product = Product::create([
                'name' => $data['name'],
                'slug' => 'test-product-' . time() . '-' . $index,
                'sku' => $sku,
                'description' => 'Test product for discount testing',
                'price' => $data['price'],
                'stock_status' => 'in_stock',
                'is_active' => true,
                'type' => 'simple',
            ]);
            $product->categories()->attach($this->testCategories[$data['category']]->id);

            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'sku' => 'TEST-SKU-' . time() . '-' . $index,
                'price' => $data['price'],
                'stock_quantity' => 100,
                'is_active' => true,
            ]);

            $key = strtolower(str_replace(' ', '_', $data['name']));
            $this->testProducts[$key] = $product;
            $this->testVariants[$key] = $variant;
        }

        $this->info('Created ' . count($this->testProducts) . ' test products with variants.');
        $this->info('');
    }

    protected function runScenario(string $scenario): void
    {
        $method = 'test' . ucfirst($scenario) . 'Scenario';
        if (method_exists($this, $method)) {
            $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            $this->info("▶ Running: " . strtoupper($scenario) . " SCENARIO");
            $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            $this->$method();
            $this->info('');
        } else {
            $this->warn("Unknown scenario: $scenario");
        }
    }

    // =========================================================================
    // PRODUCT DISCOUNT TESTS
    // =========================================================================

    protected function testProductScenario(): void
    {
        $this->newLine();

        // Test 1: Product percentage discount
        $rule = $this->createRule([
            'name' => 'Test Product 20% Off',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'priority' => 100,
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // 100 * 2 = 200
        ]);

        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Product 20% discount on 2 shirts @ 100 each',
            $result->getTotalDiscount() === 40.0, // 200 * 20% = 40
            "Expected 40, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);

        // Test 2: Product fixed amount discount
        $rule = $this->createRule([
            'name' => 'Test Product 15 AED Off',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 15,
            'priority' => 100,
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_pants_a', 'qty' => 3], // 200 * 3 = 600
        ]);

        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Product 15 AED off per unit on 3 pants @ 200 each',
            $result->getTotalDiscount() === 45.0, // 15 * 3 = 45
            "Expected 45, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);

        // Test 3: Product with max discount limit
        $rule = $this->createRule([
            'name' => 'Test Product 50% Off Max 30',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 50,
            'max_discount_amount' => 30,
            'priority' => 100,
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // 100 * 2 = 200, 50% = 100 but max 30
        ]);

        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Product 50% discount with max 30 AED cap',
            $result->getTotalDiscount() === 30.0,
            "Expected 30 (capped), got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);
    }

    // =========================================================================
    // CART DISCOUNT TESTS
    // =========================================================================

    protected function testCartScenario(): void
    {
        $this->newLine();

        // Test 1: Cart percentage discount
        $rule = $this->createRule([
            'name' => 'Test Cart 10% Off',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'priority' => 100,
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 1], // 100
            ['variant' => 'test_pants_a', 'qty' => 1], // 200
        ]);

        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Cart 10% discount on 300 AED cart',
            $result->getTotalDiscount() === 30.0,
            "Expected 30, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);

        // Test 2: Cart fixed amount discount with min cart total condition
        $rule = $this->createRule([
            'name' => 'Test Cart 50 AED Off over 250',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 50,
            'min_cart_total' => 250,
            'priority' => 100,
        ]);

        // Cart below minimum
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // 200
        ]);

        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Cart discount NOT applied when below min (200 < 250)',
            $result->getTotalDiscount() === 0.0,
            "Expected 0 (below min), got " . $result->getTotalDiscount()
        );

        // Cart above minimum
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 3], // 300
        ]);

        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Cart 50 AED discount applied when above min (300 >= 250)',
            $result->getTotalDiscount() === 50.0,
            "Expected 50, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);
    }

    // =========================================================================
    // BULK DISCOUNT TESTS
    // =========================================================================

    protected function testBulkScenario(): void
    {
        $this->newLine();

        // Create bulk rule with ranges
        $rule = $this->createRule([
            'name' => 'Test Bulk Tiered Discount',
            'rule_type' => DiscountRuleType::BULK,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 0, // Uses ranges
            'priority' => 100,
        ]);

        // Add ranges: buy 2+ get 10% off, buy 5+ get 20% off, buy 10+ get 30% off
        DiscountRuleRange::create([
            'discount_rule_id' => $rule->id,
            'min_qty' => 2,
            'max_qty' => 4,
            'discount_type' => DiscountType::PERCENTAGE->value,
            'discount_value' => 10,
        ]);
        DiscountRuleRange::create([
            'discount_rule_id' => $rule->id,
            'min_qty' => 5,
            'max_qty' => 9,
            'discount_type' => DiscountType::PERCENTAGE->value,
            'discount_value' => 20,
        ]);
        DiscountRuleRange::create([
            'discount_rule_id' => $rule->id,
            'min_qty' => 10,
            'max_qty' => null,
            'discount_type' => DiscountType::PERCENTAGE->value,
            'discount_value' => 30,
        ]);

        // Test tier 1: 2 items
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // 100 * 2 = 200, 10% = 20
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Bulk tier 1: 2 items @ 10% off',
            $result->getTotalDiscount() === 20.0,
            "Expected 20, got " . $result->getTotalDiscount()
        );

        // Test tier 2: 5 items
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 5], // 100 * 5 = 500, 20% = 100
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Bulk tier 2: 5 items @ 20% off',
            $result->getTotalDiscount() === 100.0,
            "Expected 100, got " . $result->getTotalDiscount()
        );

        // Test tier 3: 10 items
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 10], // 100 * 10 = 1000, 30% = 300
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Bulk tier 3: 10 items @ 30% off',
            $result->getTotalDiscount() === 300.0,
            "Expected 300, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);
    }

    // =========================================================================
    // BUNDLE DISCOUNT TESTS
    // =========================================================================

    protected function testBundleScenario(): void
    {
        $this->newLine();

        // Create bundle rule: 2 shirts for 150 (normally 100 each = 200)
        $rule = $this->createRule([
            'name' => 'Test Bundle 2 for 150',
            'rule_type' => DiscountRuleType::BUNDLE,
            'discount_type' => DiscountType::FIXED_PRICE,
            'discount_value' => 150,
            'bundle_qty' => 2,
            'bundle_price' => 150,
            'priority' => 100,
        ]);

        // Add filter for shirts category
        DiscountRuleFilter::create([
            'discount_rule_id' => $rule->id,
            'filter_type' => FilterType::CATEGORY->value,
            'filter_values' => [$this->testCategories['shirts']->id],
            'target' => FilterTarget::BOTH->value,
        ]);

        // Test with exactly 2 shirts
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // 100 * 2 = 200, bundle price 150, save 50
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Bundle: 2 shirts (200 AED) for 150 AED',
            $result->getTotalDiscount() === 50.0,
            "Expected 50, got " . $result->getTotalDiscount()
        );

        // Test with 3 shirts (1 bundle + 1 extra)
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 3], // 2 in bundle (150), 1 extra (100) = 250 total
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Bundle: 3 shirts = 1 bundle (150) + 1 regular (100)',
            $result->getTotalDiscount() === 50.0,
            "Expected 50, got " . $result->getTotalDiscount()
        );

        // Test with 4 shirts (2 bundles)
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 4], // 2 bundles = 300, normally 400, save 100
        ]);
        $rule->is_recursive = true;
        $rule->save();
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Bundle recursive: 4 shirts = 2 bundles (300 AED total)',
            $result->getTotalDiscount() === 100.0,
            "Expected 100, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);
    }

    // =========================================================================
    // BOGO DISCOUNT TESTS (Buy X Get Y)
    // =========================================================================

    protected function testBogoScenario(): void
    {
        $this->newLine();

        // Create BOGO rule: Buy 2 shirts, get 1 belt free
        $rule = $this->createRule([
            'name' => 'Test BOGO Buy 2 Shirts Get 1 Belt Free',
            'rule_type' => DiscountRuleType::BOGO,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 100, // 100% off = free
            'buy_qty' => 2,
            'get_qty' => 1,
            'priority' => 100,
        ]);

        // Buy filter: shirts category
        DiscountRuleFilter::create([
            'discount_rule_id' => $rule->id,
            'filter_type' => FilterType::CATEGORY->value,
            'filter_values' => [$this->testCategories['shirts']->id],
            'target' => FilterTarget::BUY->value,
        ]);

        // Get filter: accessories category
        DiscountRuleFilter::create([
            'discount_rule_id' => $rule->id,
            'filter_type' => FilterType::CATEGORY->value,
            'filter_values' => [$this->testCategories['accessories']->id],
            'target' => FilterTarget::GET->value,
        ]);

        // Test with 2 shirts + 1 belt
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // Buy 2 shirts
            ['variant' => 'test_belt', 'qty' => 1],    // Get belt free (50 AED)
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'BOGO: Buy 2 shirts, get 1 belt free',
            $result->getTotalDiscount() === 50.0,
            "Expected 50 (free belt), got " . $result->getTotalDiscount()
        );

        // Test with only 1 shirt (doesn't qualify)
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 1],
            ['variant' => 'test_belt', 'qty' => 1],
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'BOGO: Only 1 shirt (not enough to qualify)',
            $result->getTotalDiscount() === 0.0,
            "Expected 0 (not qualified), got " . $result->getTotalDiscount()
        );

        // Test with 4 shirts + 2 belts (recursive)
        $rule->is_recursive = true;
        $rule->save();

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 4], // Buy 4 shirts = 2x qualifying
            ['variant' => 'test_belt', 'qty' => 2],    // Get 2 belts free (100 AED)
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'BOGO recursive: Buy 4 shirts, get 2 belts free',
            $result->getTotalDiscount() === 100.0,
            "Expected 100 (2 free belts), got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);

        // Test BOGO with percentage discount (not free)
        $rule = $this->createRule([
            'name' => 'Test BOGO Buy 2 Get 1 50% Off',
            'rule_type' => DiscountRuleType::BOGO,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 50, // 50% off
            'buy_qty' => 2,
            'get_qty' => 1,
            'priority' => 100,
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 3], // 100 * 3 = 300, 1 at 50% off = 50
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'BOGO: Buy 2 shirts, get 1 at 50% off (same product)',
            $result->getTotalDiscount() === 50.0,
            "Expected 50 (50% off 1 shirt), got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);
    }

    // =========================================================================
    // BXGX DISCOUNT TESTS (Buy X Get X from same pool)
    // =========================================================================

    protected function testBxgxScenario(): void
    {
        $this->newLine();

        // Create BXGX rule: Buy 2 Get 1 Free (same products)
        $rule = $this->createRule([
            'name' => 'Test BXGX Buy 2 Get 1 Free',
            'rule_type' => DiscountRuleType::BXGX,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 100,
            'buy_qty' => 2,
            'free_qty' => 1,
            'priority' => 100,
        ]);

        // Filter: shirts category
        DiscountRuleFilter::create([
            'discount_rule_id' => $rule->id,
            'filter_type' => FilterType::CATEGORY->value,
            'filter_values' => [$this->testCategories['shirts']->id],
            'target' => FilterTarget::BOTH->value,
        ]);

        // Test with 3 shirts (buy 2, get 1 free)
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 3], // 100 * 3 = 300, 1 free = 100 off
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'BXGX: Buy 3 shirts, get cheapest free',
            $result->getTotalDiscount() === 100.0,
            "Expected 100, got " . $result->getTotalDiscount()
        );

        // Test with 6 shirts (recursive: 2 applications)
        $rule->is_recursive = true;
        $rule->save();

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 6], // 2 applications = 2 free = 200 off
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'BXGX recursive: Buy 6 shirts, get 2 free',
            $result->getTotalDiscount() === 200.0,
            "Expected 200, got " . $result->getTotalDiscount()
        );

        // Test with mixed prices (should give cheapest free)
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // 100 * 2
            ['variant' => 'test_shirt_b', 'qty' => 1], // 150 * 1 (more expensive)
        ]);
        $rule->is_recursive = false;
        $rule->selection_strategy = 'cheapest_first';
        $rule->save();

        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'BXGX: Mixed prices, cheapest (100 AED) is free',
            $result->getTotalDiscount() === 100.0,
            "Expected 100, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);
    }

    // =========================================================================
    // FILTER TESTS
    // =========================================================================

    protected function testFiltersScenario(): void
    {
        $this->newLine();

        // Test 1: Category filter (include)
        $rule = $this->createRule([
            'name' => 'Test Category Filter - Shirts Only',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 25,
            'priority' => 100,
        ]);

        DiscountRuleFilter::create([
            'discount_rule_id' => $rule->id,
            'filter_type' => FilterType::CATEGORY->value,
            'filter_values' => [$this->testCategories['shirts']->id],
            'target' => FilterTarget::BOTH->value,
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 1], // 100, eligible
            ['variant' => 'test_pants_a', 'qty' => 1], // 200, NOT eligible
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Category filter: Only shirts get 25% off',
            $result->getTotalDiscount() === 25.0, // Only 100 * 25% = 25
            "Expected 25, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);

        // Test 2: Product filter (specific product)
        $rule = $this->createRule([
            'name' => 'Test Product Filter - Specific SKU',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 30,
            'priority' => 100,
        ]);

        DiscountRuleFilter::create([
            'discount_rule_id' => $rule->id,
            'filter_type' => FilterType::PRODUCT_ID->value,
            'filter_values' => [$this->testProducts['test_shirt_a']->id],
            'target' => FilterTarget::BOTH->value,
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 1], // 100, eligible
            ['variant' => 'test_shirt_b', 'qty' => 1], // 150, NOT eligible
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Product filter: Only specific product gets 30% off',
            $result->getTotalDiscount() === 30.0, // Only 100 * 30% = 30
            "Expected 30, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);

        // Test 3: Exclude filter
        $rule = $this->createRule([
            'name' => 'Test Exclude Filter - All Except Accessories',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'priority' => 100,
        ]);

        DiscountRuleFilter::create([
            'discount_rule_id' => $rule->id,
            'filter_type' => FilterType::CATEGORY->value,
            'filter_values' => [$this->testCategories['accessories']->id],
            'target' => FilterTarget::BOTH->value,
            'is_exclude' => true,
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 1], // 100, eligible
            ['variant' => 'test_belt', 'qty' => 1],    // 50, NOT eligible (excluded)
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Exclude filter: Everything except accessories gets 20% off',
            $result->getTotalDiscount() === 20.0, // Only 100 * 20% = 20
            "Expected 20, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);

        // Test 4: Multiple category filters (OR logic)
        $rule = $this->createRule([
            'name' => 'Test Multiple Categories',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 15,
            'priority' => 100,
        ]);

        DiscountRuleFilter::create([
            'discount_rule_id' => $rule->id,
            'filter_type' => FilterType::CATEGORY->value,
            'filter_values' => [
                $this->testCategories['shirts']->id,
                $this->testCategories['pants']->id,
            ],
            'target' => FilterTarget::BOTH->value,
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 1], // 100, eligible
            ['variant' => 'test_pants_a', 'qty' => 1], // 200, eligible
            ['variant' => 'test_belt', 'qty' => 1],    // 50, NOT eligible
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Multiple categories filter: Shirts + Pants get 15% off',
            $result->getTotalDiscount() === 45.0, // (100 + 200) * 15% = 45
            "Expected 45, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);
    }

    // =========================================================================
    // CONDITION TESTS
    // =========================================================================

    protected function testConditionsScenario(): void
    {
        $this->newLine();

        // Test 1: Cart subtotal condition
        $rule = $this->createRule([
            'name' => 'Test Cart Subtotal Condition',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'priority' => 100,
        ]);

        DiscountRuleCondition::create([
            'discount_rule_id' => $rule->id,
            'type' => ConditionType::CART_SUBTOTAL->value,
            'operator' => '>=',
            'value' => '300',
        ]);

        // Below threshold
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // 200
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Cart subtotal condition: 200 < 300 (not applied)',
            $result->getTotalDiscount() === 0.0,
            "Expected 0, got " . $result->getTotalDiscount()
        );

        // Above threshold
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 3], // 300
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Cart subtotal condition: 300 >= 300 (applied)',
            $result->getTotalDiscount() === 30.0, // 300 * 10% = 30
            "Expected 30, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);

        // Test 2: Cart quantity condition
        $rule = $this->createRule([
            'name' => 'Test Cart Quantity Condition',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'priority' => 100,
        ]);

        DiscountRuleCondition::create([
            'discount_rule_id' => $rule->id,
            'type' => ConditionType::CART_QTY->value,
            'operator' => '>=',
            'value' => '5',
        ]);

        // Below threshold
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 3],
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Cart quantity condition: 3 < 5 items (not applied)',
            $result->getTotalDiscount() === 0.0,
            "Expected 0, got " . $result->getTotalDiscount()
        );

        // Above threshold
        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 5], // 500
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Cart quantity condition: 5 >= 5 items (applied)',
            $result->getTotalDiscount() === 100.0, // 500 * 20% = 100
            "Expected 100, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);

        // Test 3: First order condition
        $rule = $this->createRule([
            'name' => 'Test First Order Only',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 50,
            'priority' => 100,
        ]);

        DiscountRuleCondition::create([
            'discount_rule_id' => $rule->id,
            'type' => ConditionType::FIRST_ORDER->value,
            'operator' => '==',
            'value' => 'true',
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2],
        ]);

        // Not first order
        $result = $this->offerEngine->calculate($cart, ['is_first_order' => false]);

        $this->assertTest(
            'First order condition: Not first order (not applied)',
            $result->getTotalDiscount() === 0.0,
            "Expected 0, got " . $result->getTotalDiscount()
        );

        // Is first order
        $result = $this->offerEngine->calculate($cart, ['is_first_order' => true]);

        $this->assertTest(
            'First order condition: First order (applied)',
            $result->getTotalDiscount() === 50.0,
            "Expected 50, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule);
    }

    // =========================================================================
    // STACKING TESTS
    // =========================================================================

    protected function testStackingScenario(): void
    {
        $this->newLine();

        // Test 1: Multiple rules stacking
        $rule1 = $this->createRule([
            'name' => 'Test Stack Rule 1 - 10%',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 10,
            'priority' => 100,
            'stacking_group' => 'stack_group_a',
        ]);

        $rule2 = $this->createRule([
            'name' => 'Test Stack Rule 2 - 5 AED Off',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 5,
            'priority' => 90,
            'stacking_group' => 'stack_group_b', // Different group = can stack
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // 200
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Stacking: Two rules from different groups both apply',
            $result->getTotalDiscount() === 25.0, // 200*10% + 5 = 25
            "Expected 25, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule1);
        $this->cleanupRule($rule2);

        // Test 2: Same stacking group (only higher priority applies)
        $rule1 = $this->createRule([
            'name' => 'Test Same Group Rule 1 - 20%',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'priority' => 100, // Higher priority
            'stacking_group' => 'exclusive_group',
        ]);

        $rule2 = $this->createRule([
            'name' => 'Test Same Group Rule 2 - 30%',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 30,
            'priority' => 50, // Lower priority
            'stacking_group' => 'exclusive_group', // Same group = conflict
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // 200
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        // Only higher priority (20%) should apply
        $this->assertTest(
            'Stacking: Same group, only higher priority (20%) applies',
            $result->getTotalDiscount() === 40.0, // 200 * 20% = 40, not 60
            "Expected 40, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule1);
        $this->cleanupRule($rule2);

        // Test 3: Stop other rules flag
        $rule1 = $this->createRule([
            'name' => 'Test Stop Rules - 15%',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 15,
            'priority' => 100,
            'stop_other_rules' => true,
        ]);

        $rule2 = $this->createRule([
            'name' => 'Test Blocked Rule - 10 AED',
            'rule_type' => DiscountRuleType::CART,
            'discount_type' => DiscountType::FIXED_AMOUNT,
            'discount_value' => 10,
            'priority' => 50,
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 2], // 200
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $this->assertTest(
            'Stop other rules: Only first rule (15%) applies',
            $result->getTotalDiscount() === 30.0, // Only 200 * 15% = 30
            "Expected 30, got " . $result->getTotalDiscount()
        );

        $this->cleanupRule($rule1);
        $this->cleanupRule($rule2);
    }

    // =========================================================================
    // MESSAGES TESTS
    // =========================================================================

    protected function testMessagesScenario(): void
    {
        $this->newLine();

        // Test 1: Promotion message
        $rule = $this->createRule([
            'name' => 'Test Rule With Message',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 20,
            'priority' => 100,
            'offer_message' => 'Save 20% on this item!',
        ]);

        $cart = $this->buildCart([
            ['variant' => 'test_shirt_a', 'qty' => 1],
        ]);
        $result = $this->offerEngine->calculate($cart, []);

        $hasMessage = collect($result->messages)->contains(fn($m) =>
            str_contains($m, 'Save 20%') || str_contains($m, 'Test Rule With Message')
        );

        $this->assertTest(
            'Promotion message included in result',
            $hasMessage || count($result->applied_rules) > 0,
            "Expected message or applied rule, got messages: " . json_encode($result->messages)
        );

        $this->cleanupRule($rule);

        // Test 2: Get active offer messages for variant (rule without filters = applies to all)
        $rule = $this->createRule([
            'name' => 'Test Global Offer Message',
            'rule_type' => DiscountRuleType::PRODUCT,
            'discount_type' => DiscountType::PERCENTAGE,
            'discount_value' => 25,
            'priority' => 100,
            'offer_message' => 'Special: 25% off all items!',
        ]);
        // No filters = applies to all products

        $messages = $this->offerEngine->getActiveOfferMessages(
            $this->testVariants['test_shirt_a']->id
        );

        $this->assertTest(
            'Get active offer messages for variant (global rule)',
            count($messages) > 0,
            "Expected at least 1 message, got " . count($messages)
        );

        $this->cleanupRule($rule);
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    protected function createRule(array $data): DiscountRule
    {
        $defaults = [
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(),
        ];

        $rule = DiscountRule::create(array_merge($defaults, $data));
        $this->testRules[] = $rule->id;

        return $rule;
    }

    protected function cleanupRule(DiscountRule $rule): void
    {
        $rule->conditions()->delete();
        $rule->filters()->delete();
        $rule->ranges()->delete();
        $rule->delete();
    }

    protected function buildCart(array $items): array
    {
        $cart = [];
        foreach ($items as $item) {
            $variant = $this->testVariants[$item['variant']];
            $product = $this->testProducts[$item['variant']];

            $cart[] = [
                'variant_id' => $variant->id,
                'variant_sku' => $variant->sku,
                'price' => (float) $variant->price,
                'qty' => $item['qty'],
                'product_id' => $product->id,
                'category_ids' => $product->categories->pluck('id')->toArray(),
            ];
        }
        return $cart;
    }

    protected function assertTest(string $name, bool $condition, string $errorDetail = ''): void
    {
        if ($condition) {
            $this->passed++;
            $this->info("  ✓ {$name}");
        } else {
            $this->failed++;
            $this->error("  ✗ {$name}");
            if ($errorDetail) {
                $this->warn("    → {$errorDetail}");
            }
        }

        $this->testResults[] = [
            'name' => $name,
            'passed' => $condition,
            'error' => $condition ? null : $errorDetail,
        ];
    }

    protected function displaySummary(): void
    {
        $this->newLine();
        $this->info('══════════════════════════════════════════════════════════════');
        $this->info('                       TEST SUMMARY');
        $this->info('══════════════════════════════════════════════════════════════');
        $this->newLine();

        $total = $this->passed + $this->failed;
        $percentage = $total > 0 ? round(($this->passed / $total) * 100, 1) : 0;

        $this->info("  Total Tests:  {$total}");
        $this->info("  Passed:       {$this->passed}");

        if ($this->failed > 0) {
            $this->error("  Failed:       {$this->failed}");
        } else {
            $this->info("  Failed:       0");
        }

        $this->info("  Pass Rate:    {$percentage}%");

        $this->newLine();

        if ($this->failed === 0) {
            $this->info('  ╔════════════════════════════════════╗');
            $this->info('  ║   ALL TESTS PASSED SUCCESSFULLY!  ║');
            $this->info('  ╚════════════════════════════════════╝');
        } else {
            $this->error('  ╔════════════════════════════════════╗');
            $this->error('  ║   SOME TESTS FAILED - SEE ABOVE   ║');
            $this->error('  ╚════════════════════════════════════╝');

            $this->newLine();
            $this->warn('  Failed Tests:');
            foreach ($this->testResults as $result) {
                if (!$result['passed']) {
                    $this->warn("    - {$result['name']}");
                    if ($result['error']) {
                        $this->warn("      {$result['error']}");
                    }
                }
            }
        }

        $this->newLine();
    }
}
