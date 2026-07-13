<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscountRule;
use App\Models\DiscountRuleUsage;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DiscountReportController extends Controller
{
    /**
     * Get overview statistics for discount reports dashboard.
     */
    public function overview(): JsonResponse
    {
        $totalActiveRules = DiscountRule::where('is_active', true)->count();
        $totalRules = DiscountRule::count();

        // Today's discounts
        $todayUsages = DiscountRuleUsage::today();
        $totalDiscountsToday = $todayUsages->sum('discount_amount');
        $ordersWithDiscountsToday = $todayUsages->distinct('order_id')->count('order_id');

        // This month's discounts
        $monthUsages = DiscountRuleUsage::thisMonth();
        $totalDiscountsThisMonth = $monthUsages->sum('discount_amount');
        $ordersWithDiscountsThisMonth = $monthUsages->distinct('order_id')->count('order_id');

        // Most used rule
        $mostUsedRule = DiscountRule::withCount('usages')
            ->orderByDesc('usages_count')
            ->first();

        // Top discount by total amount
        $topDiscountRule = DiscountRuleUsage::select('discount_rule_id')
            ->selectRaw('SUM(discount_amount) as total_discount')
            ->groupBy('discount_rule_id')
            ->orderByDesc('total_discount')
            ->first();

        $topDiscountRuleDetails = null;
        if ($topDiscountRule) {
            $rule = DiscountRule::find($topDiscountRule->discount_rule_id);
            $topDiscountRuleDetails = [
                'id' => $rule?->id,
                'name' => $rule?->name,
                'total_discount' => round($topDiscountRule->total_discount, 2),
            ];
        }

        // Weekly trend (last 7 days)
        $weeklyTrend = DiscountRuleUsage::where('created_at', '>=', now()->subDays(7))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as uses, SUM(discount_amount) as total_discount')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($item) => [
                'date' => $item->date,
                'uses' => (int) $item->uses,
                'total_discount' => (float) $item->total_discount,
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'total_rules' => $totalRules,
                'total_active_rules' => $totalActiveRules,
                'total_discounts_today' => round($totalDiscountsToday, 2),
                'orders_with_discounts_today' => $ordersWithDiscountsToday,
                'total_discounts_this_month' => round($totalDiscountsThisMonth, 2),
                'orders_with_discounts_this_month' => $ordersWithDiscountsThisMonth,
                'most_used_rule' => $mostUsedRule ? [
                    'id' => $mostUsedRule->id,
                    'name' => $mostUsedRule->name,
                    'uses' => $mostUsedRule->usages_count,
                ] : null,
                'top_discount_by_amount' => $topDiscountRuleDetails,
                'weekly_trend' => $weeklyTrend,
            ],
        ]);
    }

    /**
     * Get statistics by rule.
     */
    public function byRule(Request $request): JsonResponse
    {
        $sortBy = $request->input('sort_by', 'uses');
        $sortDir = $request->input('sort_dir', 'desc');
        $perPage = min($request->input('per_page', 20), 100);

        $query = DiscountRule::withCount('usages')
            ->with(['usages' => function ($q) {
                $q->selectRaw('discount_rule_id, SUM(discount_amount) as total_discount')
                    ->groupBy('discount_rule_id');
            }]);

        // Sort by different criteria
        switch ($sortBy) {
            case 'discount_amount':
                // Need to use subquery for sorting by sum
                $query->leftJoin('discount_rule_usages', 'discount_rules.id', '=', 'discount_rule_usages.discount_rule_id')
                    ->selectRaw('discount_rules.*, COALESCE(SUM(discount_rule_usages.discount_amount), 0) as total_discount_amount')
                    ->groupBy('discount_rules.id')
                    ->orderBy('total_discount_amount', $sortDir);
                break;
            case 'name':
                $query->orderBy('name', $sortDir);
                break;
            case 'created_at':
                $query->orderBy('created_at', $sortDir);
                break;
            default: // uses
                $query->orderBy('usages_count', $sortDir);
                break;
        }

        $rules = $query->paginate($perPage);

        // Calculate additional stats for each rule
        $data = $rules->map(function ($rule) {
            $totalDiscount = DiscountRuleUsage::forRule($rule->id)->sum('discount_amount');
            $ordersCount = DiscountRuleUsage::forRule($rule->id)->distinct('order_id')->count('order_id');

            $ruleType = $rule->rule_type instanceof \App\Enums\DiscountRuleType
                ? $rule->rule_type->value
                : $rule->rule_type;

            return [
                'id' => $rule->id,
                'name' => $rule->name,
                'rule_type' => $ruleType,
                'is_active' => $rule->is_active,
                'uses' => $rule->usages_count,
                'total_discount' => round($totalDiscount, 2),
                'orders_count' => $ordersCount,
                'usage_limit' => $rule->usage_limit_total,
                'created_at' => $rule->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'current_page' => $rules->currentPage(),
                'last_page' => $rules->lastPage(),
                'per_page' => $rules->perPage(),
                'total' => $rules->total(),
            ],
        ]);
    }

    /**
     * Get statistics by date.
     */
    public function byDate(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'group_by' => 'nullable|in:day,week,month',
        ]);

        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $groupBy = $request->input('group_by', 'day');

        $query = DiscountRuleUsage::whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        switch ($groupBy) {
            case 'week':
                $data = $query->selectRaw('YEARWEEK(created_at, 1) as period, MIN(DATE(created_at)) as start_date, COUNT(*) as uses, SUM(discount_amount) as total_discount, COUNT(DISTINCT order_id) as orders_count, COUNT(DISTINCT user_id) as unique_users')
                    ->groupBy('period')
                    ->orderBy('period')
                    ->get()
                    ->map(fn($item) => [
                        'period' => $item->start_date,
                        'period_type' => 'week',
                        'uses' => (int) $item->uses,
                        'total_discount' => (float) $item->total_discount,
                        'orders_count' => (int) $item->orders_count,
                        'unique_users' => (int) $item->unique_users,
                    ]);
                break;

            case 'month':
                $data = $query->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as period, COUNT(*) as uses, SUM(discount_amount) as total_discount, COUNT(DISTINCT order_id) as orders_count, COUNT(DISTINCT user_id) as unique_users')
                    ->groupBy('period')
                    ->orderBy('period')
                    ->get()
                    ->map(fn($item) => [
                        'period' => $item->period,
                        'period_type' => 'month',
                        'uses' => (int) $item->uses,
                        'total_discount' => (float) $item->total_discount,
                        'orders_count' => (int) $item->orders_count,
                        'unique_users' => (int) $item->unique_users,
                    ]);
                break;

            default: // day
                $data = $query->selectRaw('DATE(created_at) as period, COUNT(*) as uses, SUM(discount_amount) as total_discount, COUNT(DISTINCT order_id) as orders_count, COUNT(DISTINCT user_id) as unique_users')
                    ->groupBy('period')
                    ->orderBy('period')
                    ->get()
                    ->map(fn($item) => [
                        'period' => $item->period,
                        'period_type' => 'day',
                        'uses' => (int) $item->uses,
                        'total_discount' => (float) $item->total_discount,
                        'orders_count' => (int) $item->orders_count,
                        'unique_users' => (int) $item->unique_users,
                    ]);
                break;
        }

        // Calculate totals
        $totals = [
            'total_uses' => $data->sum('uses'),
            'total_discount' => round($data->sum('total_discount'), 2),
            'total_orders' => DiscountRuleUsage::whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                ->distinct('order_id')
                ->count('order_id'),
            'unique_users' => DiscountRuleUsage::whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                ->whereNotNull('user_id')
                ->distinct('user_id')
                ->count('user_id'),
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'totals' => $totals,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'group_by' => $groupBy,
            ],
        ]);
    }

    /**
     * Export discount report to CSV.
     */
    public function export(Request $request): Response
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'format' => 'nullable|in:csv',
        ]);

        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $usages = DiscountRuleUsage::with(['discountRule:id,name,rule_type', 'order:id,order_number,total', 'user:id,name,email'])
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Build CSV content
        $headers = ['Date', 'Order Number', 'Rule Name', 'Rule Type', 'Discount Amount', 'Customer Name', 'Customer Email'];
        $rows = [];

        foreach ($usages as $usage) {
            $ruleType = $usage->discountRule?->rule_type;
            if ($ruleType instanceof \App\Enums\DiscountRuleType) {
                $ruleType = $ruleType->value;
            }

            $rows[] = [
                $usage->created_at?->format('Y-m-d H:i:s'),
                $usage->order?->order_number ?? 'N/A',
                $usage->discountRule?->name ?? 'Deleted Rule',
                $ruleType ?? 'N/A',
                number_format($usage->discount_amount, 2),
                $usage->user?->name ?? 'Guest',
                $usage->user?->email ?? 'N/A',
            ];
        }

        // Generate CSV
        $csv = implode(',', $headers) . "\n";
        foreach ($rows as $row) {
            $csv .= implode(',', array_map(fn($cell) => '"' . str_replace('"', '""', $cell) . '"', $row)) . "\n";
        }

        $filename = "discount_report_{$startDate}_to_{$endDate}.csv";

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Get rule type breakdown.
     */
    public function byRuleType(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $data = DiscountRuleUsage::join('discount_rules', 'discount_rule_usages.discount_rule_id', '=', 'discount_rules.id')
            ->whereBetween('discount_rule_usages.created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->selectRaw('discount_rules.rule_type, COUNT(*) as uses, SUM(discount_rule_usages.discount_amount) as total_discount')
            ->groupBy('discount_rules.rule_type')
            ->orderByDesc('uses')
            ->get()
            ->map(fn($item) => [
                'rule_type' => $item->rule_type,
                'label' => ucfirst(str_replace('_', ' ', $item->rule_type)),
                'uses' => (int) $item->uses,
                'total_discount' => (float) $item->total_discount,
            ]);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
