<?php

namespace App\Console\Commands;

use App\Enums\ConditionType;
use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Enums\FilterTarget;
use App\Enums\FilterType;
use App\Models\Category;
use App\Models\DiscountRule;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\info;
use function Laravel\Prompts\multiselect;
use function Laravel\Prompts\note;
use function Laravel\Prompts\outro;
use function Laravel\Prompts\select;
use function Laravel\Prompts\table;
use function Laravel\Prompts\text;
use function Laravel\Prompts\warning;

class CreateDiscountRuleCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'discount:create
                            {--type= : Rule type (product, cart, bulk, bundle, bogo)}
                            {--quick : Skip optional fields for quick creation}
                            {--interactive : Force interactive mode}';

    /**
     * The console command description.
     */
    protected $description = 'Create a new discount rule interactively';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        info('Creating a new Discount Rule');
        note('Follow the prompts to configure your discount rule.');

        try {
            $ruleData = $this->collectRuleData();
            $conditions = $this->collectConditions();
            $filters = $this->collectFilters($ruleData['rule_type']);
            $ranges = $this->collectRanges($ruleData['rule_type']);

            // Show summary
            $this->showSummary($ruleData, $conditions, $filters, $ranges);

            if (!confirm('Create this discount rule?', true)) {
                warning('Discount rule creation cancelled.');
                return self::FAILURE;
            }

            // Create the rule
            $rule = $this->createRule($ruleData, $conditions, $filters, $ranges);

            outro("Discount rule created successfully! ID: {$rule->id}");

            // Show quick activation option
            if (!$rule->is_active && confirm('Activate this rule now?', false)) {
                $rule->update(['is_active' => true]);
                info('Rule activated.');
            }

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Error creating rule: {$e->getMessage()}");
            return self::FAILURE;
        }
    }

    /**
     * Collect main rule data.
     */
    private function collectRuleData(): array
    {
        // Rule Type
        $ruleType = $this->option('type');
        if (!$ruleType || !in_array($ruleType, DiscountRuleType::values())) {
            $ruleType = select(
                label: 'Select rule type:',
                options: collect(DiscountRuleType::cases())->mapWithKeys(
                    fn($type) => [$type->value => $type->label()]
                )->toArray(),
                default: 'product'
            );
        }

        // Name
        $name = text(
            label: 'Rule name (displayed to customers):',
            placeholder: 'e.g., Summer Sale 20% Off',
            required: true,
            validate: fn($value) => strlen($value) < 3 ? 'Name must be at least 3 characters.' : null
        );

        // Internal Code (optional)
        $internalCode = null;
        if (!$this->option('quick')) {
            $internalCode = text(
                label: 'Internal code (optional, for tracking):',
                placeholder: 'e.g., SUMMER2026'
            );
        }

        // Discount Type
        $discountType = select(
            label: 'Select discount type:',
            options: collect(DiscountType::cases())->mapWithKeys(
                fn($type) => [$type->value => $type->label()]
            )->toArray(),
            default: 'percentage'
        );

        // Discount Value
        $discountValue = text(
            label: "Discount value" . ($discountType === 'percentage' ? ' (%)' : ' (AED)') . ':',
            placeholder: $discountType === 'percentage' ? 'e.g., 20' : 'e.g., 50',
            required: true,
            validate: fn($value) => !is_numeric($value) || $value < 0 ? 'Enter a valid positive number.' : null
        );

        // Max Discount Amount (for percentage)
        $maxDiscountAmount = null;
        if ($discountType === 'percentage' && !$this->option('quick')) {
            $hasMax = confirm('Set maximum discount amount cap?', false);
            if ($hasMax) {
                $maxDiscountAmount = text(
                    label: 'Maximum discount amount (AED):',
                    placeholder: 'e.g., 100',
                    validate: fn($value) => !is_numeric($value) || $value < 0 ? 'Enter a valid positive number.' : null
                );
            }
        }

        // Bundle-specific fields
        $bundleQty = null;
        $bundlePrice = null;
        if ($ruleType === 'bundle') {
            $bundleQty = text(
                label: 'Bundle quantity (how many items for the bundle):',
                placeholder: 'e.g., 3',
                required: true,
                validate: fn($value) => !is_numeric($value) || $value < 2 ? 'Bundle quantity must be at least 2.' : null
            );
            $bundlePrice = text(
                label: 'Bundle price (AED):',
                placeholder: 'e.g., 200',
                required: true,
                validate: fn($value) => !is_numeric($value) || $value < 0 ? 'Enter a valid price.' : null
            );
        }

        // BOGO-specific fields
        $buyQty = null;
        $getQty = null;
        if ($ruleType === 'bogo') {
            $buyQty = text(
                label: 'Buy quantity (customer must buy this many):',
                placeholder: 'e.g., 2',
                required: true,
                validate: fn($value) => !is_numeric($value) || $value < 1 ? 'Buy quantity must be at least 1.' : null
            );
            $getQty = text(
                label: 'Get quantity (items to receive discount):',
                placeholder: 'e.g., 1',
                required: true,
                validate: fn($value) => !is_numeric($value) || $value < 1 ? 'Get quantity must be at least 1.' : null
            );
        }

        // Priority
        $priority = 10;
        if (!$this->option('quick')) {
            $priority = text(
                label: 'Priority (higher = evaluated first):',
                default: '10',
                validate: fn($value) => !is_numeric($value) ? 'Enter a valid number.' : null
            );
        }

        // Active status
        $isActive = confirm('Activate this rule immediately?', false);

        // Offer message
        $offerMessage = null;
        if (!$this->option('quick')) {
            $offerMessage = text(
                label: 'Offer message (shown on product pages, optional):',
                placeholder: 'e.g., Save 20% on this item!'
            );
        }

        return [
            'name' => $name,
            'internal_code' => $internalCode ?: null,
            'rule_type' => $ruleType,
            'discount_type' => $discountType,
            'discount_value' => (float) $discountValue,
            'max_discount_amount' => $maxDiscountAmount ? (float) $maxDiscountAmount : null,
            'bundle_qty' => $bundleQty ? (int) $bundleQty : null,
            'bundle_price' => $bundlePrice ? (float) $bundlePrice : null,
            'buy_qty' => $buyQty ? (int) $buyQty : null,
            'get_qty' => $getQty ? (int) $getQty : null,
            'priority' => (int) $priority,
            'is_active' => $isActive,
            'offer_message' => $offerMessage ?: null,
        ];
    }

    /**
     * Collect conditions.
     */
    private function collectConditions(): array
    {
        if ($this->option('quick')) {
            return [];
        }

        $conditions = [];

        if (!confirm('Add conditions (e.g., cart total minimum)?', false)) {
            return [];
        }

        do {
            $type = select(
                label: 'Condition type:',
                options: collect(ConditionType::cases())->mapWithKeys(
                    fn($t) => [$t->value => $t->label()]
                )->toArray()
            );

            $operator = select(
                label: 'Operator:',
                options: [
                    'eq' => 'Equals (=)',
                    'neq' => 'Not Equals (!=)',
                    'gt' => 'Greater Than (>)',
                    'gte' => 'Greater Than or Equal (>=)',
                    'lt' => 'Less Than (<)',
                    'lte' => 'Less Than or Equal (<=)',
                ]
            );

            $value = text(
                label: 'Value:',
                required: true
            );

            $conditions[] = [
                'condition_type' => $type,
                'operator' => $operator,
                'value' => is_numeric($value) ? (float) $value : $value,
            ];

            $addMore = confirm('Add another condition?', false);
        } while ($addMore);

        return $conditions;
    }

    /**
     * Collect filters.
     */
    private function collectFilters(string $ruleType): array
    {
        $filters = [];

        $filterQuestion = $ruleType === 'bogo'
            ? 'Add product filters (for Buy and Get items)?'
            : 'Add product filters (limit which products this applies to)?';

        if (!confirm($filterQuestion, $ruleType === 'bogo')) {
            return [];
        }

        // Get categories for selection
        $categories = Category::pluck('name', 'id')->toArray();

        do {
            $filterType = select(
                label: 'Filter type:',
                options: collect(FilterType::cases())->mapWithKeys(
                    fn($t) => [$t->value => $t->label()]
                )->toArray(),
                default: 'category'
            );

            $filterValues = [];

            if ($filterType === 'category' && !empty($categories)) {
                $selectedCategories = multiselect(
                    label: 'Select categories:',
                    options: $categories,
                    required: true
                );
                $filterValues = array_map('intval', $selectedCategories);
            } else {
                $valuesStr = text(
                    label: "Enter {$filterType} IDs (comma-separated):",
                    placeholder: 'e.g., 1, 2, 3',
                    required: true
                );
                $filterValues = array_map('intval', array_filter(explode(',', $valuesStr)));
            }

            // Target (for BOGO)
            $target = 'apply';
            if ($ruleType === 'bogo') {
                $target = select(
                    label: 'Filter target:',
                    options: [
                        'buy' => 'Buy Items (customer must purchase these)',
                        'get' => 'Get Items (these receive the discount)',
                    ]
                );
            }

            $isExclude = confirm('Exclude these items (instead of include)?', false);

            $filters[] = [
                'filter_type' => $filterType,
                'filter_values' => $filterValues,
                'target' => $target,
                'is_exclude' => $isExclude,
            ];

            $addMore = confirm('Add another filter?', $ruleType === 'bogo' && count($filters) < 2);
        } while ($addMore);

        return $filters;
    }

    /**
     * Collect ranges for bulk discounts.
     */
    private function collectRanges(string $ruleType): array
    {
        if ($ruleType !== 'bulk') {
            return [];
        }

        $ranges = [];

        info('Configure quantity tiers for bulk discount:');

        do {
            $minQty = text(
                label: 'Minimum quantity:',
                required: true,
                validate: fn($v) => !is_numeric($v) || $v < 1 ? 'Enter a valid number >= 1.' : null
            );

            $maxQty = text(
                label: 'Maximum quantity (leave empty for unlimited):',
                validate: fn($v) => $v !== '' && (!is_numeric($v) || $v < $minQty) ? 'Must be >= min quantity.' : null
            );

            $discountType = select(
                label: 'Discount type for this tier:',
                options: collect(DiscountType::cases())->mapWithKeys(
                    fn($t) => [$t->value => $t->label()]
                )->toArray(),
                default: 'percentage'
            );

            $discountValue = text(
                label: "Discount value" . ($discountType === 'percentage' ? ' (%)' : ' (AED)') . ':',
                required: true,
                validate: fn($v) => !is_numeric($v) || $v < 0 ? 'Enter a valid positive number.' : null
            );

            $ranges[] = [
                'min_qty' => (int) $minQty,
                'max_qty' => $maxQty !== '' ? (int) $maxQty : null,
                'discount_type' => $discountType,
                'discount_value' => (float) $discountValue,
            ];

            $addMore = confirm('Add another quantity tier?', false);
        } while ($addMore);

        return $ranges;
    }

    /**
     * Show summary before creation.
     */
    private function showSummary(array $ruleData, array $conditions, array $filters, array $ranges): void
    {
        note('Rule Summary:');

        $summaryRows = [
            ['Name', $ruleData['name']],
            ['Type', DiscountRuleType::from($ruleData['rule_type'])->label()],
            ['Discount', $this->formatDiscount($ruleData)],
            ['Priority', $ruleData['priority']],
            ['Active', $ruleData['is_active'] ? 'Yes' : 'No'],
        ];

        if ($ruleData['internal_code']) {
            $summaryRows[] = ['Internal Code', $ruleData['internal_code']];
        }

        if ($ruleData['max_discount_amount']) {
            $summaryRows[] = ['Max Discount', $ruleData['max_discount_amount'] . ' AED'];
        }

        if ($ruleData['bundle_qty']) {
            $summaryRows[] = ['Bundle', "{$ruleData['bundle_qty']} for {$ruleData['bundle_price']} AED"];
        }

        if ($ruleData['buy_qty']) {
            $summaryRows[] = ['BOGO', "Buy {$ruleData['buy_qty']}, Get {$ruleData['get_qty']}"];
        }

        table(['Field', 'Value'], $summaryRows);

        if (!empty($conditions)) {
            info('Conditions: ' . count($conditions));
            foreach ($conditions as $c) {
                $this->line("  - {$c['condition_type']} {$c['operator']} {$c['value']}");
            }
        }

        if (!empty($filters)) {
            info('Filters: ' . count($filters));
            foreach ($filters as $f) {
                $exclude = $f['is_exclude'] ? '(exclude)' : '';
                $this->line("  - {$f['filter_type']} [{$f['target']}]: " . implode(', ', $f['filter_values']) . " {$exclude}");
            }
        }

        if (!empty($ranges)) {
            info('Ranges: ' . count($ranges));
            foreach ($ranges as $r) {
                $max = $r['max_qty'] ?? '+';
                $this->line("  - {$r['min_qty']}-{$max}: {$r['discount_value']}" . ($r['discount_type'] === 'percentage' ? '%' : ' AED'));
            }
        }
    }

    /**
     * Format discount for display.
     */
    private function formatDiscount(array $ruleData): string
    {
        $value = $ruleData['discount_value'];
        return match ($ruleData['discount_type']) {
            'percentage' => "{$value}%",
            'fixed_amount' => "{$value} AED off",
            'fixed_price' => "{$value} AED fixed",
            default => (string) $value,
        };
    }

    /**
     * Create the rule in the database.
     */
    private function createRule(array $ruleData, array $conditions, array $filters, array $ranges): DiscountRule
    {
        return DB::transaction(function () use ($ruleData, $conditions, $filters, $ranges) {
            $rule = DiscountRule::create($ruleData);

            if (!empty($conditions)) {
                $rule->conditions()->createMany($conditions);
            }

            if (!empty($filters)) {
                $rule->filters()->createMany($filters);
            }

            if (!empty($ranges)) {
                $rule->ranges()->createMany($ranges);
            }

            return $rule;
        });
    }
}
