<?php

namespace App\Console\Commands;

use App\Models\DiscountRule;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\OfferEngineService;
use Illuminate\Console\Command;
use Carbon\Carbon;

class DebugDiscountRulesCommand extends Command
{
    protected $signature = 'discount:debug
        {--activate-500 : Activate the 10% Off Orders Over 500 rule}
        {--activate-300 : Activate the 50 AED Off Orders Over 300 rule}
        {--fix-dates : Fix expired starts_at/ends_at dates}
        {--test-cart=398 : Test cart subtotal}';
    protected $description = 'Debug discount rules and test calculations';

    public function handle(OfferEngineService $offerEngine): int
    {
        $this->info('=== Discount Rules Debug ===');
        $this->newLine();

        // List all rules
        $rules = DiscountRule::with(['conditions', 'filters'])->get();
        $now = Carbon::now();

        $this->info('Current discount rules:');
        $this->table(
            ['ID', 'Name', 'Type', 'Active', 'Discount', 'Schedule', 'Conditions'],
            $rules->map(function ($rule) use ($now) {
                $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
                    ? $rule->rule_type->value
                    : $rule->rule_type;

                $conditionsSummary = $rule->conditions->map(function ($c) {
                    return "{$c->type} {$c->operator} {$c->value}";
                })->implode(', ') ?: 'None';

                // Check schedule status
                $scheduleStatus = 'OK';
                if ($rule->starts_at && $rule->starts_at > $now) {
                    $scheduleStatus = 'NOT STARTED';
                } elseif ($rule->ends_at && $rule->ends_at < $now) {
                    $scheduleStatus = 'EXPIRED!';
                }

                return [
                    $rule->id,
                    substr($rule->name, 0, 25),
                    $ruleType,
                    $rule->is_active ? 'YES' : 'NO',
                    $rule->discount_display,
                    $scheduleStatus,
                    substr($conditionsSummary, 0, 25),
                ];
            })->toArray()
        );

        // Show detailed schedule info for any problematic rules
        $expiredRules = $rules->filter(function ($rule) use ($now) {
            return ($rule->ends_at && $rule->ends_at < $now) ||
                   ($rule->starts_at && $rule->starts_at > $now);
        });

        if ($expiredRules->isNotEmpty()) {
            $this->newLine();
            $this->warn('⚠ Schedule issues found:');
            foreach ($expiredRules as $rule) {
                $this->line("  [{$rule->id}] {$rule->name}");
                $this->line("      starts_at: " . ($rule->starts_at ? $rule->starts_at->toDateTimeString() : 'null'));
                $this->line("      ends_at: " . ($rule->ends_at ? $rule->ends_at->toDateTimeString() : 'null'));
                $this->line("      now: " . $now->toDateTimeString());
            }
            $this->line('  → Run with --fix-dates to fix these');
        }

        // Fix expired dates if requested
        if ($this->option('fix-dates')) {
            $this->info('Fixing expired rule dates...');
            $now = Carbon::now();
            $expiredRules = DiscountRule::where(function ($q) use ($now) {
                $q->where('ends_at', '<', $now)
                  ->orWhere('starts_at', '>', $now);
            })->get();

            foreach ($expiredRules as $rule) {
                $oldEnds = $rule->ends_at;
                $oldStarts = $rule->starts_at;
                $rule->starts_at = $now->copy()->subDay();
                $rule->ends_at = $now->copy()->addYear();
                $rule->save();
                $this->line("  ✓ Fixed: {$rule->name} (was: {$oldStarts} - {$oldEnds}, now: {$rule->starts_at} - {$rule->ends_at})");
            }

            if ($expiredRules->isEmpty()) {
                $this->line('  No expired rules found.');
            }
            $this->newLine();
        }

        // Activate "10% Off Orders Over 500" if requested
        if ($this->option('activate-500')) {
            $rule = DiscountRule::where('name', 'like', '%10%Off%500%')->first();
            if ($rule) {
                $rule->is_active = true;
                // Also fix dates
                $rule->starts_at = Carbon::now()->subDay();
                $rule->ends_at = Carbon::now()->addYear();
                $rule->save();
                $this->info("✓ Activated rule: {$rule->name} (ID: {$rule->id})");
            } else {
                $this->warn('Rule "10% Off Orders Over 500" not found');
            }
        }

        // Activate "50 AED Off Orders Over 300" if requested
        if ($this->option('activate-300')) {
            $rule = DiscountRule::where('name', 'like', '%50%Off%300%')->first();
            if ($rule) {
                $rule->is_active = true;
                // Also fix dates
                $rule->starts_at = Carbon::now()->subDay();
                $rule->ends_at = Carbon::now()->addYear();
                $rule->save();
                $this->info("✓ Activated rule: {$rule->name} (ID: {$rule->id})");
            } else {
                $this->warn('Rule "50 AED Off Orders Over 300" not found');
            }
        }

        // Test calculation
        $testSubtotal = (float) $this->option('test-cart');
        $this->newLine();
        $this->info("=== Testing Cart with Subtotal: {$testSubtotal} AED ===");

        // Create a test cart item
        $cartItems = [[
            'variant_id' => 1,
            'variant_sku' => 'TEST-SKU-001',
            'price' => $testSubtotal,
            'qty' => 1,
            'product_id' => 1,
            'category_ids' => [],
            'tag_ids' => [],
            'line_id' => 'test-line-1',
        ]];

        $context = [
            'user_id' => null,
            'country' => 'AE',
            'timezone' => 'Asia/Dubai',
        ];

        $this->line("Cart items: " . json_encode($cartItems));
        $this->line("Context: " . json_encode($context));
        $this->newLine();

        // Get active rules (database level)
        $dbActiveRules = DiscountRule::active()->byPriority()->withAllRelations()->get();
        $this->info("Rules with is_active=true in DB: " . $dbActiveRules->count());

        // Filter by schedule (application level)
        $now = Carbon::now();
        $scheduleActiveRules = $dbActiveRules->filter(function ($rule) use ($now) {
            return $rule->isWithinSchedule($now);
        });

        $this->info("Rules passing schedule check: " . $scheduleActiveRules->count());

        if ($dbActiveRules->count() > 0 && $scheduleActiveRules->count() < $dbActiveRules->count()) {
            $this->warn("Rules EXCLUDED by schedule:");
            foreach ($dbActiveRules as $rule) {
                if (!$rule->isWithinSchedule($now)) {
                    $reason = 'Unknown';
                    if ($rule->starts_at && $rule->starts_at > $now) {
                        $reason = "Not started yet (starts: {$rule->starts_at})";
                    } elseif ($rule->ends_at && $rule->ends_at < $now) {
                        $reason = "EXPIRED (ended: {$rule->ends_at})";
                    }
                    $this->line("  - [{$rule->id}] {$rule->name}: {$reason}");
                }
            }
            $this->newLine();
        }

        // Active rules for display
        $activeRules = $scheduleActiveRules;
        foreach ($activeRules as $rule) {
            $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
                ? $rule->rule_type->value
                : $rule->rule_type;
            $this->line("  - [{$rule->id}] {$rule->name} (type: {$ruleType})");
        }
        $this->newLine();

        // Calculate discounts
        $result = $offerEngine->calculate($cartItems, $context);

        $this->info("=== Calculation Result ===");
        $this->line("Total Discount: " . $result->getTotalDiscount() . " AED");
        $this->line("Cart Discount Total: " . $result->cart_discount_total . " AED");
        $this->line("Applied Rules: " . count($result->applied_rules));

        if (!empty($result->applied_rules)) {
            $this->line("Applied rules details:");
            foreach ($result->applied_rules as $appliedRule) {
                $this->line("  - [{$appliedRule['id']}] {$appliedRule['name']}: -{$appliedRule['discount_amount']} AED");
            }
        } else {
            $this->warn("No rules were applied!");

            // Debug why rules didn't apply
            $this->newLine();
            $this->info("=== Debugging Why Rules Didn't Apply ===");

            foreach ($activeRules as $rule) {
                $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
                    ? $rule->rule_type->value
                    : $rule->rule_type;

                $this->line("Rule [{$rule->id}] {$rule->name}:");

                // Check conditions
                $conditionData = [
                    'cart_qty' => 1,
                    'cart_subtotal' => $testSubtotal,
                    'user_id' => null,
                    'user_role' => null,
                    'country' => 'AE',
                    'is_first_order' => false,
                    'eligible_qty' => 1,
                    'eligible_subtotal' => $testSubtotal,
                ];

                $conditionsPassed = $rule->evaluateConditions($conditionData);
                $this->line("  Conditions passed: " . ($conditionsPassed ? 'YES' : 'NO'));

                if (!$conditionsPassed) {
                    foreach ($rule->conditions as $condition) {
                        $actual = $conditionData[$condition->type] ?? 'N/A';
                        $this->line("    - {$condition->type} {$condition->operator} {$condition->value} (actual: {$actual})");
                    }
                }

                // Check filters
                $this->line("  Filters count: " . $rule->filters->count());
                if ($rule->filters->count() > 0) {
                    foreach ($rule->filters as $filter) {
                        $this->line("    - {$filter->filter_type}: " . json_encode($filter->filter_values));
                    }
                }
            }
        }

        $this->newLine();
        $this->info('Check storage/logs/laravel.log for detailed [OfferEngine] and [CartDiscountCalculator] entries.');

        return Command::SUCCESS;
    }
}
