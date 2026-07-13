<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ConditionType;
use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Enums\FilterTarget;
use App\Enums\FilterType;
use App\Enums\ScheduleType;
use App\Enums\SelectionStrategy;
use App\Http\Controllers\Controller;
use App\Http\Resources\DiscountRuleResource;
use App\Models\DiscountRule;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class DiscountRuleController extends Controller
{
    /**
     * List all discount rules with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DiscountRule::with(['conditions', 'filters', 'ranges', 'schedules'])
            ->withCount('usages');

        // Filter by status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Filter by rule type
        if ($request->filled('rule_type')) {
            $query->where('rule_type', $request->input('rule_type'));
        }

        // Filter by stacking group
        if ($request->filled('stacking_group')) {
            $query->where('stacking_group', $request->input('stacking_group'));
        }

        // Search by name or code
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('internal_code', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortField = $request->input('sort_by', 'priority');
        $sortDir = $request->input('sort_dir', 'asc');
        $query->orderBy($sortField, $sortDir);

        // Pagination
        $perPage = min($request->input('per_page', 15), 100);
        $rules = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => DiscountRuleResource::collection($rules),
            'meta' => [
                'current_page' => $rules->currentPage(),
                'last_page' => $rules->lastPage(),
                'per_page' => $rules->perPage(),
                'total' => $rules->total(),
            ],
        ]);
    }

    /**
     * Get a single discount rule.
     */
    public function show(int $id): JsonResponse
    {
        $rule = DiscountRule::with(['conditions', 'filters', 'ranges', 'schedules'])
            ->withCount('usages')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new DiscountRuleResource($rule),
        ]);
    }

    /**
     * Create a new discount rule.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateRule($request);

        $rule = DB::transaction(function () use ($validated) {
            $rule = DiscountRule::create($validated);

            // Create related records
            if (!empty($validated['conditions'])) {
                $rule->conditions()->createMany($validated['conditions']);
            }

            if (!empty($validated['filters'])) {
                $rule->filters()->createMany($validated['filters']);
            }

            if (!empty($validated['ranges'])) {
                $rule->ranges()->createMany($validated['ranges']);
            }

            if (!empty($validated['schedules'])) {
                $rule->schedules()->createMany($validated['schedules']);
            }

            return $rule;
        });

        $rule->load(['conditions', 'filters', 'ranges', 'schedules']);

        app(\App\Services\ProductOfferService::class)->clearCache();
        Cache::increment('products_list_version');
        $this->notifyDiscountRuleOffer($rule);

        return response()->json([
            'success' => true,
            'message' => 'Discount rule created successfully.',
            'data' => new DiscountRuleResource($rule),
        ], 201);
    }

    /**
     * Update a discount rule.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $rule = DiscountRule::findOrFail($id);
        $wasActive = (bool) $rule->is_active;
        $validated = $this->validateRule($request, $id);

        DB::transaction(function () use ($rule, $validated) {
            $rule->update($validated);

            // Sync related records
            if (array_key_exists('conditions', $validated)) {
                $rule->conditions()->delete();
                if (!empty($validated['conditions'])) {
                    $rule->conditions()->createMany($validated['conditions']);
                }
            }

            if (array_key_exists('filters', $validated)) {
                $rule->filters()->delete();
                if (!empty($validated['filters'])) {
                    $rule->filters()->createMany($validated['filters']);
                }
            }

            if (array_key_exists('ranges', $validated)) {
                $rule->ranges()->delete();
                if (!empty($validated['ranges'])) {
                    $rule->ranges()->createMany($validated['ranges']);
                }
            }

            if (array_key_exists('schedules', $validated)) {
                $rule->schedules()->delete();
                if (!empty($validated['schedules'])) {
                    $rule->schedules()->createMany($validated['schedules']);
                }
            }
        });

        $rule->load(['conditions', 'filters', 'ranges', 'schedules']);

        app(\App\Services\ProductOfferService::class)->clearCache();
        Cache::increment('products_list_version');
        if (!$wasActive && $rule->is_active) {
            $this->notifyDiscountRuleOffer($rule);
        }

        return response()->json([
            'success' => true,
            'message' => 'Discount rule updated successfully.',
            'data' => new DiscountRuleResource($rule),
        ]);
    }

    /**
     * Delete a discount rule (soft delete).
     */
    public function destroy(int $id): JsonResponse
    {
        $rule = DiscountRule::findOrFail($id);
        $rule->delete();

        app(\App\Services\ProductOfferService::class)->clearCache();
        Cache::increment('products_list_version');

        return response()->json([
            'success' => true,
            'message' => 'Discount rule deleted successfully.',
        ]);
    }

    /**
     * Bulk delete discount rules.
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:discount_rules,id',
        ]);

        DiscountRule::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'success' => true,
            'message' => count($validated['ids']) . ' discount rules deleted successfully.',
        ]);
    }

    /**
     * Toggle rule active status.
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $rule = DiscountRule::findOrFail($id);
        $oldStatus = $rule->is_active;
        $newStatus = !$oldStatus;

        \Log::info('[DiscountRuleController] Toggling rule status', [
            'rule_id' => $id,
            'rule_name' => $rule->name,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
        ]);

        // Use save() instead of update() to ensure proper persistence
        $rule->is_active = $newStatus;
        $saved = $rule->save();

        // Refresh from database to confirm
        $rule->refresh();

        \Log::info('[DiscountRuleController] Rule status after save', [
            'rule_id' => $id,
            'saved' => $saved,
            'current_status' => $rule->is_active,
        ]);

        app(\App\Services\ProductOfferService::class)->clearCache();
        Cache::increment('products_list_version');
        if ($rule->is_active) {
            $this->notifyDiscountRuleOffer($rule);
        }

        return response()->json([
            'success' => true,
            'message' => $rule->is_active ? 'Rule activated.' : 'Rule deactivated.',
            'data' => [
                'id' => $rule->id,
                'is_active' => $rule->is_active,
            ],
        ]);
    }

    /**
     * Duplicate a discount rule.
     */
    public function duplicate(int $id): JsonResponse
    {
        $original = DiscountRule::with(['conditions', 'filters', 'ranges', 'schedules'])
            ->findOrFail($id);

        $rule = DB::transaction(function () use ($original) {
            $newRule = $original->replicate();
            $newRule->name = $original->name . ' (Copy)';
            $newRule->internal_code = $original->internal_code ? $original->internal_code . '_copy_' . time() : null;
            $newRule->is_active = false;
            $newRule->save();

            // Copy related records
            foreach ($original->conditions as $condition) {
                $newRule->conditions()->create($condition->toArray());
            }

            foreach ($original->filters as $filter) {
                $newRule->filters()->create($filter->toArray());
            }

            foreach ($original->ranges as $range) {
                $newRule->ranges()->create($range->toArray());
            }

            foreach ($original->schedules as $schedule) {
                $newRule->schedules()->create($schedule->toArray());
            }

            return $newRule;
        });

        $rule->load(['conditions', 'filters', 'ranges', 'schedules']);

        return response()->json([
            'success' => true,
            'message' => 'Discount rule duplicated successfully.',
            'data' => new DiscountRuleResource($rule),
        ], 201);
    }

    /**
     * Get enum values for form dropdowns.
     */
    public function getEnums(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'rule_types' => array_map(fn($e) => ['value' => $e->value, 'label' => $e->label()], DiscountRuleType::cases()),
                'discount_types' => array_map(fn($e) => ['value' => $e->value, 'label' => $e->label()], DiscountType::cases()),
                'condition_types' => array_map(fn($e) => ['value' => $e->value, 'label' => $e->label()], ConditionType::cases()),
                'filter_types' => array_map(fn($e) => ['value' => $e->value, 'label' => $e->label()], FilterType::cases()),
                'filter_targets' => array_map(fn($e) => ['value' => $e->value, 'label' => $e->label()], FilterTarget::cases()),
                'schedule_types' => array_map(fn($e) => ['value' => $e->value, 'label' => $e->label()], ScheduleType::cases()),
                'selection_strategies' => array_map(fn($e) => ['value' => $e->value, 'label' => $e->label()], SelectionStrategy::cases()),
            ],
        ]);
    }

    private function notifyDiscountRuleOffer(DiscountRule $rule): void
    {
        if (!$rule->is_active) {
            return;
        }

        $message = trim((string) ($rule->offer_message ?? $rule->name ?? ''));
        if ($message === '') {
            return;
        }

        $alreadyExists = UserNotification::where('type', 'discount_offer')
            ->where('data->rule_id', $rule->id)
            ->exists();

        if ($alreadyExists) {
            return;
        }

        $payload = [
            'title' => 'New offer',
            'message' => $message,
            'status' => 'offer',
            'link' => '/offers',
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
        ];

        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);
        $now = now();

        User::where('role', 'customer')
            ->where('is_active', true)
            ->select('id')
            ->chunkById(500, function ($users) use ($payloadJson, $now) {
                if ($users->isEmpty()) {
                    return;
                }

                $rows = [];
                foreach ($users as $user) {
                    $rows[] = [
                        'user_id' => $user->id,
                        'type' => 'discount_offer',
                        'data' => $payloadJson,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                DB::table('notifications')->insert($rows);
            });
    }

    /**
     * Get stacking groups for dropdown.
     */
    public function getStackingGroups(): JsonResponse
    {
        $groups = DiscountRule::whereNotNull('stacking_group')
            ->distinct()
            ->pluck('stacking_group')
            ->sort()
            ->values();

        return response()->json([
            'success' => true,
            'data' => $groups,
        ]);
    }

    /**
     * Get statistics for a specific discount rule.
     */
    public function statistics(int $id): JsonResponse
    {
        $rule = DiscountRule::withCount('usages')->findOrFail($id);

        // Total uses and discount
        $totalUses = $rule->usages_count;
        $totalDiscountGiven = \App\Models\DiscountRuleUsage::forRule($id)->sum('discount_amount');

        // Uses by day (last 30 days)
        $usesByDay = \App\Models\DiscountRuleUsage::forRule($id)
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count, SUM(discount_amount) as total_discount')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($item) => [
                'date' => $item->date,
                'count' => (int) $item->count,
                'total_discount' => (float) $item->total_discount,
            ]);

        // Top users with phone and order numbers
        $topUsersRaw = \App\Models\DiscountRuleUsage::forRule($id)
            ->select('user_id')
            ->selectRaw('COUNT(*) as uses, SUM(discount_amount) as total_discount')
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->orderByDesc('uses')
            ->limit(10)
            ->with('user:id,name,email,phone')
            ->get();

        $topUsers = $topUsersRaw->map(function($item) use ($id) {
            $user = $item->user;

            // Get all orders for this user with this discount rule
            $userOrders = \App\Models\DiscountRuleUsage::forRule($id)
                ->where('user_id', $item->user_id)
                ->with('order:id,order_number,shipping_phone')
                ->get()
                ->pluck('order')
                ->filter();

            // Get order numbers
            $orderNumbers = $userOrders->map(function ($order) {
                if (!$order) return null;
                return $order->order_number ?? 'ORD-' . str_pad($order->id, 5, '0', STR_PAD_LEFT);
            })->filter()->unique()->values()->toArray();

            // Get phone from user or from order shipping_phone
            $phone = $user?->phone;
            if (empty($phone) && $userOrders->isNotEmpty()) {
                $phone = $userOrders->first()?->shipping_phone;
            }

            return [
                'user_id' => $item->user_id,
                'user_name' => $user?->name ?? 'Unknown',
                'user_email' => $user?->email ?? '',
                'user_phone' => $phone ?? '-',
                'order_numbers' => $orderNumbers,
                'uses' => (int) $item->uses,
                'total_discount' => (float) $item->total_discount,
            ];
        });

        // Top products discounted (from items_affected)
        $allAffectedVariants = \App\Models\DiscountRuleUsage::forRule($id)
            ->whereNotNull('items_affected')
            ->pluck('items_affected')
            ->flatten()
            ->countBy()
            ->sortDesc()
            ->take(10);

        $topProducts = [];
        if ($allAffectedVariants->isNotEmpty()) {
            $variantIds = $allAffectedVariants->keys()->toArray();
            $variants = \App\Models\ProductVariant::whereIn('id', $variantIds)
                ->with('product:id,name')
                ->get()
                ->keyBy('id');

            foreach ($allAffectedVariants as $variantId => $count) {
                $variant = $variants->get($variantId);
                $topProducts[] = [
                    'variant_id' => $variantId,
                    'product_name' => $variant?->product?->name ?? 'Unknown',
                    'variant_name' => $variant?->variant_name ?? '',
                    'times_discounted' => $count,
                ];
            }
        }

        // Recent orders using this rule
        $recentOrders = \App\Models\DiscountRuleUsage::forRule($id)
            ->with([
                'order:id,order_number,total,created_at,shipping_phone,shipping_first_name,shipping_last_name,user_id',
                'order.user:id,name,email,phone',
                'user:id,name,email,phone'
            ])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function($usage) {
                $order = $usage->order;
                $user = $usage->user ?? $order?->user;

                // Get customer name - prefer order shipping name, fallback to user name
                $customerName = trim(($order?->shipping_first_name ?? '') . ' ' . ($order?->shipping_last_name ?? ''));
                if (empty($customerName)) {
                    $customerName = $user?->name ?? 'Guest';
                }

                // Get phone - prefer order shipping phone, fallback to user phone
                $phone = $order?->shipping_phone ?? $user?->phone ?? '-';

                // Get order number with fallback
                $orderNumber = $order?->order_number;
                if (empty($orderNumber) && $order?->id) {
                    $orderNumber = 'ORD-' . str_pad($order->id, 5, '0', STR_PAD_LEFT);
                }

                return [
                    'order_id' => $usage->order_id,
                    'order_number' => $orderNumber,
                    'order_total' => $order?->total,
                    'discount_amount' => (float) $usage->discount_amount,
                    'customer_name' => $customerName,
                    'customer_phone' => $phone,
                    'customer_email' => $user?->email ?? '-',
                    'created_at' => $usage->created_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'rule_id' => $id,
                'rule_name' => $rule->name,
                'total_uses' => $totalUses,
                'total_discount_given' => round($totalDiscountGiven, 2),
                'usage_limit' => $rule->usage_limit_total,
                'remaining_uses' => $rule->usage_limit_total ? max(0, $rule->usage_limit_total - $totalUses) : null,
                'uses_by_day' => $usesByDay,
                'top_users' => $topUsers,
                'top_products' => $topProducts,
                'recent_orders' => $recentOrders,
            ],
        ]);
    }

    /**
     * Export discount rule statistics to Excel.
     */
    public function exportStatistics(int $id)
    {
        $rule = DiscountRule::withCount('usages')->findOrFail($id);

        // Get statistics data
        $totalUses = $rule->usages_count;
        $totalDiscountGiven = \App\Models\DiscountRuleUsage::forRule($id)->sum('discount_amount');

        // Top users with phone and order numbers
        $topUsersRaw = \App\Models\DiscountRuleUsage::forRule($id)
            ->select('user_id')
            ->selectRaw('COUNT(*) as uses, SUM(discount_amount) as total_discount')
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->orderByDesc('uses')
            ->limit(10)
            ->with('user:id,name,email,phone')
            ->get();

        $topUsers = $topUsersRaw->map(function($item) use ($id) {
            $user = $item->user;

            // Get all orders for this user with this discount rule
            $userOrders = \App\Models\DiscountRuleUsage::forRule($id)
                ->where('user_id', $item->user_id)
                ->with('order:id,order_number,shipping_phone')
                ->get()
                ->pluck('order')
                ->filter();

            // Get order numbers
            $orderNumbers = $userOrders->map(function ($order) {
                if (!$order) return null;
                return $order->order_number ?? 'ORD-' . str_pad($order->id, 5, '0', STR_PAD_LEFT);
            })->filter()->unique()->values()->toArray();

            // Get phone from user or from order shipping_phone
            $phone = $user?->phone;
            if (empty($phone) && $userOrders->isNotEmpty()) {
                $phone = $userOrders->first()?->shipping_phone;
            }

            return (object) [
                'user' => $user,
                'user_phone' => $phone ?? '-',
                'order_numbers' => $orderNumbers,
                'uses' => $item->uses,
                'total_discount' => $item->total_discount,
            ];
        });

        // Recent orders - get all for export
        $recentOrders = \App\Models\DiscountRuleUsage::forRule($id)
            ->with([
                'order:id,order_number,total,created_at,shipping_phone,shipping_first_name,shipping_last_name,user_id',
                'order.user:id,name,email,phone',
                'user:id,name,email,phone'
            ])
            ->orderByDesc('created_at')
            ->get();

        // Create spreadsheet
        $spreadsheet = new Spreadsheet();

        // ========== SUMMARY SHEET ==========
        $summarySheet = $spreadsheet->getActiveSheet();
        $summarySheet->setTitle('Summary');

        // Title
        $summarySheet->setCellValue('A1', 'Discount Rule Statistics Report');
        $summarySheet->mergeCells('A1:D1');
        $summarySheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1F4E78']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $summarySheet->getRowDimension(1)->setRowHeight(30);

        // Rule info
        $summarySheet->setCellValue('A3', 'Rule Name:');
        $summarySheet->setCellValue('B3', $rule->name);
        $summarySheet->setCellValue('A4', 'Generated On:');
        $summarySheet->setCellValue('B4', now()->format('Y-m-d H:i:s'));
        $summarySheet->setCellValue('A5', 'Total Uses:');
        $summarySheet->setCellValue('B5', $totalUses);
        $summarySheet->setCellValue('A6', 'Total Discount Given:');
        $summarySheet->setCellValue('B6', number_format($totalDiscountGiven, 2) . ' AED');
        $summarySheet->setCellValue('A7', 'Usage Limit:');
        $summarySheet->setCellValue('B7', $rule->usage_limit_total ?? 'Unlimited');
        $summarySheet->setCellValue('A8', 'Remaining Uses:');
        $summarySheet->setCellValue('B8', $rule->usage_limit_total ? max(0, $rule->usage_limit_total - $totalUses) : 'N/A');

        // Style labels
        $summarySheet->getStyle('A3:A8')->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E7E6E6']],
        ]);

        foreach (range('A', 'D') as $col) {
            $summarySheet->getColumnDimension($col)->setAutoSize(true);
        }

        // ========== TOP USERS SHEET ==========
        $usersSheet = $spreadsheet->createSheet();
        $usersSheet->setTitle('Top Users');

        $headers = [
            'A1' => 'Customer',
            'B1' => 'Email',
            'C1' => 'Phone',
            'D1' => 'Orders',
            'E1' => 'Uses',
            'F1' => 'Total Discount (AED)'
        ];
        foreach ($headers as $cell => $value) {
            $usersSheet->setCellValue($cell, $value);
        }

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1F4E78']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ];
        $usersSheet->getStyle('A1:F1')->applyFromArray($headerStyle);
        $usersSheet->getRowDimension(1)->setRowHeight(22);

        $rowNumber = 2;
        foreach ($topUsers as $user) {
            $usersSheet->setCellValue('A' . $rowNumber, $user->user?->name ?? 'Unknown');
            $usersSheet->setCellValue('B' . $rowNumber, $user->user?->email ?? '-');
            $usersSheet->setCellValue('C' . $rowNumber, $user->user_phone ?? '-');
            $usersSheet->setCellValue('D' . $rowNumber, implode(', ', $user->order_numbers ?? []));
            $usersSheet->setCellValue('E' . $rowNumber, $user->uses);
            $usersSheet->setCellValue('F' . $rowNumber, number_format($user->total_discount, 2));
            $rowNumber++;
        }

        if ($rowNumber > 2) {
            $usersSheet->getStyle('A2:F' . ($rowNumber - 1))->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
        }

        foreach (range('A', 'F') as $col) {
            $usersSheet->getColumnDimension($col)->setAutoSize(true);
        }

        // ========== ORDERS SHEET ==========
        $ordersSheet = $spreadsheet->createSheet();
        $ordersSheet->setTitle('Orders');

        $headers = [
            'A1' => 'Order #',
            'B1' => 'Customer',
            'C1' => 'Phone',
            'D1' => 'Email',
            'E1' => 'Discount Amount (AED)',
            'F1' => 'Order Total (AED)',
            'G1' => 'Date',
        ];
        foreach ($headers as $cell => $value) {
            $ordersSheet->setCellValue($cell, $value);
        }
        $ordersSheet->getStyle('A1:G1')->applyFromArray($headerStyle);
        $ordersSheet->getRowDimension(1)->setRowHeight(22);

        $rowNumber = 2;
        foreach ($recentOrders as $usage) {
            $order = $usage->order;
            $user = $usage->user ?? $order?->user;

            $customerName = trim(($order?->shipping_first_name ?? '') . ' ' . ($order?->shipping_last_name ?? ''));
            if (empty($customerName)) {
                $customerName = $user?->name ?? 'Guest';
            }

            $phone = $order?->shipping_phone ?? $user?->phone ?? '-';
            $orderNumber = $order?->order_number;
            if (empty($orderNumber) && $order?->id) {
                $orderNumber = 'ORD-' . str_pad($order->id, 5, '0', STR_PAD_LEFT);
            }

            $ordersSheet->setCellValue('A' . $rowNumber, $orderNumber ?? '-');
            $ordersSheet->setCellValue('B' . $rowNumber, $customerName);
            $ordersSheet->setCellValue('C' . $rowNumber, $phone);
            $ordersSheet->setCellValue('D' . $rowNumber, $user?->email ?? '-');
            $ordersSheet->setCellValue('E' . $rowNumber, number_format($usage->discount_amount, 2));
            $ordersSheet->setCellValue('F' . $rowNumber, $order?->total ? number_format($order->total, 2) : '-');
            $ordersSheet->setCellValue('G' . $rowNumber, $usage->created_at?->format('Y-m-d H:i'));
            $rowNumber++;
        }

        if ($rowNumber > 2) {
            $ordersSheet->getStyle('A2:G' . ($rowNumber - 1))->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
        }

        foreach (range('A', 'G') as $col) {
            $ordersSheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Set active sheet to summary
        $spreadsheet->setActiveSheetIndex(0);

        // Write file
        $writer = new Xlsx($spreadsheet);
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $rule->name);
        $filename = 'discount_rule_' . $safeName . '_' . date('Y-m-d_His') . '.xlsx';
        $tempPath = storage_path('app/temp/' . $filename);

        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $writer->save($tempPath);

        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Get all filter options for the discount rule form.
     */
    public function getFilterOptions()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'products' => \App\Models\Product::select('id', 'name')
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get()
                    ->map(fn($p) => ['value' => $p->id, 'label' => $p->name]),
                'categories' => \App\Models\Category::select('id', 'name')
                    ->orderBy('name')
                    ->get()
                    ->map(fn($c) => ['value' => $c->id, 'label' => $c->name]),
                'tags' => \App\Models\Tag::select('id', 'name')
                    ->orderBy('name')
                    ->get()
                    ->map(fn($t) => ['value' => $t->id, 'label' => $t->name]),
                'skus' => \App\Models\ProductVariant::select('id', 'sku', 'product_id')
                    ->whereNotNull('sku')
                    ->where('sku', '!=', '')
                    ->with('product:id,name')
                    ->orderBy('sku')
                    ->get()
                    ->map(fn($v) => [
                        'value' => $v->sku,
                        'label' => $v->sku . ' - ' . ($v->product?->name ?? 'Unknown'),
                    ]),
                'brands' => \App\Models\Brand::select('id', 'name')
                    ->orderBy('name')
                    ->get()
                    ->map(fn($b) => ['value' => $b->id, 'label' => $b->name]),
            ]
        ]);
    }

    /**
     * Validate discount rule request.
     */
    private function validateRule(Request $request, ?int $id = null): array
    {
        $ruleTypes = implode(',', array_column(DiscountRuleType::cases(), 'value'));
        $discountTypes = implode(',', array_column(DiscountType::cases(), 'value'));
        $conditionTypes = implode(',', array_column(ConditionType::cases(), 'value'));
        // Include both backend enum values and frontend aliases (sku, product, all)
        $filterTypes = implode(',', array_merge(
            array_column(FilterType::cases(), 'value'),
            ['sku', 'product', 'all'] // Frontend aliases
        ));
        $filterTargets = implode(',', array_column(FilterTarget::cases(), 'value'));
        $scheduleTypes = implode(',', array_column(ScheduleType::cases(), 'value'));
        $selectionStrategies = implode(',', array_column(SelectionStrategy::cases(), 'value'));
        $filterTypeAliases = [
            'sku' => FilterType::VARIANT_SKU->value,
            'product' => FilterType::PRODUCT_ID->value,
        ];

        $validated = $request->validate([
            // Main rule fields
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'internal_code' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('discount_rules', 'internal_code')->ignore($id),
            ],
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'rule_type' => "required|in:{$ruleTypes}",
            'discount_type' => "required|in:{$discountTypes}",
            'discount_value' => 'required|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'min_cart_total' => 'nullable|numeric|min:0',
            'max_cart_total' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'priority' => 'integer|min:0',
            'is_stackable' => 'boolean',
            'stacking_group' => 'nullable|string|max:100',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'usage_limit_total' => 'nullable|integer|min:1',
            'usage_limit_per_user' => 'nullable|integer|min:1',
            'offer_message' => 'nullable|string|max:500',
            'offer_message_ar' => 'required|string|max:500',

            // BOGO-specific fields
            'buy_qty' => 'nullable|integer|min:1',
            'get_qty' => 'nullable|integer|min:1',
            'max_applications' => 'nullable|integer|min:1',
            'selection_strategy' => "nullable|in:{$selectionStrategies}",

            // Bundle-specific fields
            'bundle_qty' => 'nullable|integer|min:2',
            'bundle_price' => 'nullable|numeric|min:0',

            // Recursive flag
            'is_recursive' => 'boolean',

            // Promo code fields
            'requires_promo_code' => 'boolean',
            'promo_code' => 'nullable|string|max:50',
            'show_as_coupon' => 'boolean',
            'quantity_count_method' => 'nullable|in:filter_products,individual_product,cart_total',
            'filter_conditions' => 'nullable|array',
            'filter_conditions.*.type' => 'sometimes|in:eligible_qty,eligible_subtotal',
            'filter_conditions.*.operator' => 'sometimes|in:>=,<=,>,<,==,!=',
            'filter_conditions.*.value' => 'sometimes|numeric|min:0',

            // BXGX-specific fields
            'recursive_step' => 'nullable|integer|min:1',
            'max_free_qty_per_order' => 'nullable|integer|min:1',
            'max_applications_per_order' => 'nullable|integer|min:1',

            // Promotion Message fields
            'promotion_subtotal_from' => 'nullable|numeric|min:0',
            'promotion_subtotal_source' => 'nullable|in:eligible_items_subtotal,entire_cart_subtotal',
            'promotion_message_template' => 'nullable|string|max:500',
            'promotion_message_template_ar' => 'nullable|string|max:500',
            'show_rule_preview' => 'boolean',

            // Discount Bar fields
            'show_discount_bar' => 'boolean',
            'bar_background_color' => 'nullable|string|max:7',
            'bar_text_color' => 'nullable|string|max:7',
            'bar_title' => 'nullable|string|max:255',
            'bar_title_ar' => 'nullable|string|max:255',
            'bar_content' => 'nullable|string',
            'bar_content_ar' => 'nullable|string',
            'bar_position' => 'nullable|in:above_title,below_title,above_price,below_price,above_add_to_cart,below_add_to_cart',
            'bar_style' => 'nullable|in:badge,banner,floating,inline,bar',

            // Conditions - accept condition_type from frontend (all fields optional for flexibility)
            'conditions' => 'sometimes|array',
            'conditions.*.condition_type' => "sometimes|nullable|in:{$conditionTypes}",
            'conditions.*.type' => "sometimes|nullable|in:{$conditionTypes}",
            'conditions.*.operator' => 'sometimes|nullable|in:eq,neq,gt,gte,lt,lte,in,not_in,>=,<=,==,!=,>,<',
            'conditions.*.value' => 'sometimes|nullable',

            // Filters (all fields nullable for flexibility)
            'filters' => 'sometimes|array',
            'filters.*.filter_type' => "sometimes|nullable|in:{$filterTypes}",
            'filters.*.filter_values' => 'sometimes|nullable|array',
            'filters.*.target' => "sometimes|nullable|in:{$filterTargets}",
            'filters.*.is_exclude' => 'sometimes|boolean',
            'filters.*.secondary_type' => 'sometimes|nullable|string|in:category,tag',
            'filters.*.secondary_values' => 'sometimes|nullable|array',

            // Ranges (for bulk/BOGO) - all fields nullable
            'ranges' => 'sometimes|array',
            'ranges.*.min_qty' => 'sometimes|nullable|integer|min:1',
            'ranges.*.max_qty' => 'sometimes|nullable|integer',
            'ranges.*.discount_type' => "sometimes|nullable|in:{$discountTypes}",
            'ranges.*.discount_value' => 'sometimes|nullable|numeric|min:0',

            // Schedules - all fields nullable
            'schedules' => 'sometimes|array',
            'schedules.*.schedule_type' => "sometimes|nullable|in:{$scheduleTypes}",
            'schedules.*.start_date' => 'nullable|date',
            'schedules.*.end_date' => 'nullable|date',
            'schedules.*.day_of_week' => 'nullable|integer|min:0|max:6',
            'schedules.*.start_time' => 'nullable',
            'schedules.*.end_time' => 'nullable',
        ]);

        // Transform conditions: condition_type -> type, gte -> >=
        // Filter out incomplete conditions
        if (isset($validated['conditions']) && is_array($validated['conditions'])) {
            $operatorMap = [
                'gte' => '>=',
                'lte' => '<=',
                'eq' => '==',
                'neq' => '!=',
                'gt' => '>',
                'lt' => '<',
                'in' => 'in',
                'not_in' => 'not_in',
            ];

            $validated['conditions'] = array_values(array_filter(
                array_map(function ($cond) use ($operatorMap) {
                    $type = $cond['condition_type'] ?? $cond['type'] ?? null;
                    $operator = $cond['operator'] ?? null;
                    $value = $cond['value'] ?? null;

                    // Skip incomplete conditions
                    if (empty($type) || empty($operator) || ($value === null || $value === '')) {
                        return null;
                    }

                    return [
                        'type' => $type,
                        'operator' => $operatorMap[$operator] ?? $operator,
                        'value' => $value,
                    ];
                }, $validated['conditions']),
                fn($c) => $c !== null
            ));
        }

        // Filter out incomplete filters
        if (isset($validated['filters']) && is_array($validated['filters'])) {
            $validated['filters'] = array_values(array_filter(
                array_map(function ($filter) use ($filterTypeAliases) {
                    $filterType = $filter['filter_type'] ?? null;
                    $target = $filter['target'] ?? null;

                    if (empty($filterType) || empty($target)) {
                        return null;
                    }

                    $filterType = $filterTypeAliases[$filterType] ?? $filterType;
                    $filterValues = array_values((array) ($filter['filter_values'] ?? []));
                    $isAllFilter = $filterType === 'all';

                    if (!$isAllFilter && empty($filterValues)) {
                        return null;
                    }

                    $normalized = [
                        'filter_type' => $filterType,
                        'filter_values' => $filterValues,
                        'target' => $target,
                        'is_exclude' => (bool) ($filter['is_exclude'] ?? false),
                        'secondary_type' => $filter['secondary_type'] ?? null,
                        'secondary_values' => array_values((array) ($filter['secondary_values'] ?? [])),
                    ];

                    // Keep promo_group_ids in sync when promo group filtering is used.
                    if ($filterType === FilterType::PROMO_GROUP->value) {
                        $normalized['promo_group_ids'] = $filterValues;
                    }

                    // Default the secondary type for combined filters.
                    if ($filterType === FilterType::SKU_CATEGORY->value && empty($normalized['secondary_type'])) {
                        $normalized['secondary_type'] = 'category';
                    }
                    if ($filterType === FilterType::SKU_TAG->value && empty($normalized['secondary_type'])) {
                        $normalized['secondary_type'] = 'tag';
                    }

                    return $normalized;
                }, $validated['filters']),
                fn($f) => $f !== null
            ));
        }

        // Filter out incomplete ranges
        if (isset($validated['ranges']) && is_array($validated['ranges'])) {
            $validated['ranges'] = array_values(array_filter(
                $validated['ranges'],
                fn($r) => !empty($r['min_qty']) && !empty($r['discount_type']) && isset($r['discount_value'])
            ));
        }

        // Filter out incomplete schedules
        if (isset($validated['schedules']) && is_array($validated['schedules'])) {
            $validated['schedules'] = array_values(array_filter(
                $validated['schedules'],
                fn($s) => !empty($s['schedule_type'])
            ));
        }

        return $validated;
    }
}
