<?php

namespace App\Console\Commands;

use App\Models\DiscountRule;
use App\Models\Product;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\Filters\EligibilityFilter;
use App\Services\OfferEngine\OfferEngineService;
use Illuminate\Console\Command;

class DebugDiscountFilters extends Command
{
    protected $signature = 'discount:debug-filters
                            {--rule-id= : Specific rule ID to debug}
                            {--product-id= : Test with specific product ID}
                            {--test-calculation : Run a test calculation}';

    protected $description = 'Debug discount rule filters and eligibility matching';

    public function handle(): int
    {
        $this->info('=== Discount Filter Debug ===');
        $this->newLine();

        // Show all rules with their filters
        $this->showRulesWithFilters();

        // Test with a specific product if requested
        if ($this->option('product-id')) {
            $this->testProductEligibility((int) $this->option('product-id'));
        }

        // Run test calculation if requested
        if ($this->option('test-calculation')) {
            $this->runTestCalculation();
        }

        return 0;
    }

    private function showRulesWithFilters(): void
    {
        $query = DiscountRule::with(['filters', 'conditions']);

        if ($this->option('rule-id')) {
            $query->where('id', $this->option('rule-id'));
        }

        $rules = $query->get();

        $this->info("Total rules found: " . $rules->count());
        $this->newLine();

        foreach ($rules as $rule) {
            $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
                ? $rule->rule_type->value
                : (string) $rule->rule_type;

            $this->line("┌─ Rule: <info>{$rule->name}</info> (ID: {$rule->id})");
            $this->line("│  Type: {$ruleType}");
            $this->line("│  Active: " . ($rule->is_active ? '<fg=green>YES</>' : '<fg=red>NO</>'));
            $discountType = $rule->discount_type instanceof \App\Enums\DiscountType
                ? $rule->discount_type->value
                : (string) $rule->discount_type;
            $this->line("│  Discount: {$rule->discount_value} ({$discountType})");

            // Show conditions
            if ($rule->conditions->isNotEmpty()) {
                $this->line("│  Conditions: " . $rule->conditions->count());
                foreach ($rule->conditions as $condition) {
                    $this->line("│    - {$condition->type} {$condition->operator} {$condition->value}");
                }
            }

            // Show filters
            if ($rule->filters->isEmpty()) {
                $this->line("│  <fg=yellow>Filters: NONE (applies to ALL products)</>");
            } else {
                $this->line("│  Filters: " . $rule->filters->count());
                foreach ($rule->filters as $filter) {
                    $values = is_array($filter->filter_values)
                        ? implode(', ', array_slice($filter->filter_values, 0, 5))
                        : $filter->filter_values;

                    if (is_array($filter->filter_values) && count($filter->filter_values) > 5) {
                        $values .= ' (+' . (count($filter->filter_values) - 5) . ' more)';
                    }

                    $excludeLabel = $filter->is_exclude ? ' <fg=red>[EXCLUDE]</>' : '';
                    $this->line("│    - <fg=cyan>{$filter->filter_type}</> ({$filter->target}): [{$values}]{$excludeLabel}");
                }
            }

            $this->line("└─────────────────────────────────────");
            $this->newLine();
        }
    }

    private function testProductEligibility(int $productId): void
    {
        $this->info("=== Testing Product Eligibility (ID: {$productId}) ===");
        $this->newLine();

        $product = Product::with(['categories', 'tags', 'variants'])->find($productId);

        if (!$product) {
            $this->error("Product with ID {$productId} not found!");
            return;
        }

        $this->line("Product: <info>{$product->name}</info>");
        $this->line("Categories: " . $product->categories->pluck('id')->implode(', '));
        $this->line("Tags: " . ($product->tags ? $product->tags->pluck('id')->implode(', ') : 'None'));
        $this->newLine();

        // Create a test cart item
        $variant = $product->variants->first();
        $cartItem = new CartItemDTO(
            variant_id: $variant?->id ?? $productId,
            variant_sku: $variant?->sku ?? 'TEST-SKU',
            price: $variant?->price ?? 100,
            qty: 1,
            product_id: $productId,
            category_ids: $product->categories->pluck('id')->toArray(),
            tag_ids: $product->tags ? $product->tags->pluck('id')->toArray() : [],
            attributes: [],
            line_id: 'test-line'
        );

        $this->line("Cart Item Data:");
        $this->line("  variant_id: {$cartItem->variant_id}");
        $this->line("  variant_sku: {$cartItem->variant_sku}");
        $this->line("  product_id: {$cartItem->product_id}");
        $this->line("  category_ids: [" . implode(', ', $cartItem->category_ids) . "]");
        $this->line("  tag_ids: [" . implode(', ', $cartItem->tag_ids) . "]");
        $this->newLine();

        // Test against all active rules with filters
        $eligibilityFilter = app(EligibilityFilter::class);
        $rules = DiscountRule::with('filters')->where('is_active', true)->get();

        $this->info("Testing against active rules:");
        foreach ($rules as $rule) {
            $eligible = $eligibilityFilter->getEligibleItems([$cartItem], $rule);
            $isEligible = !empty($eligible);

            $status = $isEligible
                ? '<fg=green>✓ ELIGIBLE</>'
                : '<fg=red>✗ NOT ELIGIBLE</>';

            $filterInfo = $rule->filters->isEmpty()
                ? '(no filters)'
                : '(' . $rule->filters->count() . ' filters)';

            $this->line("  {$status} - {$rule->name} {$filterInfo}");

            // If not eligible and has filters, show why
            if (!$isEligible && $rule->filters->isNotEmpty()) {
                foreach ($rule->filters as $filter) {
                    $matches = $filter->matches($cartItem->toArray());
                    $matchStatus = $matches ? '<fg=green>✓</>' : '<fg=red>✗</>';

                    $filterValues = is_array($filter->filter_values)
                        ? implode(',', $filter->filter_values)
                        : $filter->filter_values;

                    $this->line("      {$matchStatus} {$filter->filter_type}: item has [" .
                        $this->getItemValueForFilter($cartItem, $filter->filter_type) .
                        "] vs filter [{$filterValues}]");
                }
            }
        }
        $this->newLine();
    }

    private function getItemValueForFilter(CartItemDTO $item, string $filterType): string
    {
        return match ($filterType) {
            'product_id' => (string) $item->product_id,
            'variant_id' => (string) $item->variant_id,
            'variant_sku' => $item->variant_sku,
            'category' => implode(',', $item->category_ids),
            'tag' => implode(',', $item->tag_ids),
            'attribute' => json_encode($item->attributes),
            default => 'unknown',
        };
    }

    private function runTestCalculation(): void
    {
        $this->info("=== Running Test Calculation ===");
        $this->newLine();

        // Get first product with categories
        $product = Product::with(['categories', 'variants'])->first();

        if (!$product) {
            $this->error('No products found in database!');
            return;
        }

        $variant = $product->variants->first();
        $price = $variant?->price ?? 100;

        $cartItems = [
            [
                'variant_id' => $variant?->id ?? $product->id,
                'variant_sku' => $variant?->sku ?? 'TEST-SKU-' . $product->id,
                'price' => $price,
                'qty' => 2,
                'product_id' => $product->id,
                'category_ids' => $product->categories->pluck('id')->toArray(),
                'line_id' => 'test-line-1',
            ]
        ];

        $context = [
            'user_id' => null,
            'country' => 'AE',
            'timezone' => 'Asia/Dubai',
        ];

        $this->line("Test Cart:");
        $this->line("  Product: {$product->name} (ID: {$product->id})");
        $this->line("  Variant: " . ($variant?->id ?? 'N/A'));
        $this->line("  Price: {$price}");
        $this->line("  Qty: 2");
        $this->line("  Categories: [" . implode(', ', $cartItems[0]['category_ids']) . "]");
        $this->line("  Subtotal: " . ($price * 2));
        $this->newLine();

        try {
            $offerEngine = app(OfferEngineService::class);
            $result = $offerEngine->calculate($cartItems, $context);

            $this->info("Calculation Result:");
            $this->line("  Total Discount: <fg=green>{$result->getTotalDiscount()}</>");
            $this->line("  Applied Rules: " . count($result->applied_rules));

            if (!empty($result->applied_rules)) {
                foreach ($result->applied_rules as $appliedRule) {
                    $this->line("    - {$appliedRule['rule_name']}: -{$appliedRule['discount_amount']}");
                }
            }

            if (!empty($result->messages)) {
                $this->line("  Messages:");
                foreach ($result->messages as $msg) {
                    $this->line("    - {$msg}");
                }
            }

            $this->newLine();
            $this->line("<fg=yellow>Check storage/logs/laravel.log for detailed [OfferEngine] entries.</>");

        } catch (\Exception $e) {
            $this->error("Calculation failed: " . $e->getMessage());
            $this->line($e->getTraceAsString());
        }
    }
}
