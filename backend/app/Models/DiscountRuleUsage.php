<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountRuleUsage extends Model
{
    protected $fillable = [
        'discount_rule_id',
        'user_id',
        'order_id',
        'discount_amount',
        'items_affected',
    ];

    protected $casts = [
        'discount_amount' => 'decimal:2',
        'items_affected' => 'array',
    ];

    /**
     * Get the discount rule this usage belongs to.
     */
    public function discountRule(): BelongsTo
    {
        return $this->belongsTo(DiscountRule::class);
    }

    /**
     * Get the user who used the discount.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the order where discount was applied.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    // =========================================================================
    // SCOPES
    // =========================================================================

    /**
     * Scope: Filter by date range.
     */
    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope: Filter by user.
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope: Filter by rule.
     */
    public function scopeForRule($query, int $ruleId)
    {
        return $query->where('discount_rule_id', $ruleId);
    }

    /**
     * Scope: Filter by this month.
     */
    public function scopeThisMonth($query)
    {
        return $query->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year);
    }

    /**
     * Scope: Filter by today.
     */
    public function scopeToday($query)
    {
        return $query->whereDate('created_at', now()->toDateString());
    }

    /**
     * Scope: Filter by this week.
     */
    public function scopeThisWeek($query)
    {
        return $query->whereBetween('created_at', [
            now()->startOfWeek(),
            now()->endOfWeek(),
        ]);
    }

    // =========================================================================
    // STATIC METHODS
    // =========================================================================

    /**
     * Record a discount usage (prevents double-recording).
     */
    public static function recordUsage(
        int $discountRuleId,
        int $orderId,
        float $discountAmount,
        ?int $userId = null,
        ?array $itemsAffected = null
    ): self {
        // Prevent double-recording using updateOrCreate
        return self::updateOrCreate(
            [
                'discount_rule_id' => $discountRuleId,
                'order_id' => $orderId,
            ],
            [
                'discount_amount' => $discountAmount,
                'user_id' => $userId,
                'items_affected' => $itemsAffected,
            ]
        );
    }

    /**
     * Record multiple rule usages from an order.
     */
    public static function recordOrderUsages(
        int $orderId,
        array $appliedRules,
        ?int $userId = null
    ): void {
        foreach ($appliedRules as $ruleData) {
            self::recordUsage(
                discountRuleId: $ruleData['rule_id'],
                orderId: $orderId,
                discountAmount: $ruleData['discount_amount'] ?? 0,
                userId: $userId,
                itemsAffected: $ruleData['affected_variants'] ?? null
            );
        }
    }

    /**
     * Get total discount amount for a rule.
     */
    public static function getTotalDiscountForRule(int $ruleId): float
    {
        return self::forRule($ruleId)->sum('discount_amount');
    }

    /**
     * Get total discount amount for a user.
     */
    public static function getTotalDiscountForUser(int $userId): float
    {
        return self::forUser($userId)->sum('discount_amount');
    }

    /**
     * Get usage statistics for reporting.
     */
    public static function getStatistics(array $filters = []): array
    {
        $query = self::query();

        if (!empty($filters['rule_id'])) {
            $query->forRule($filters['rule_id']);
        }

        if (!empty($filters['user_id'])) {
            $query->forUser($filters['user_id']);
        }

        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {
            $query->inDateRange($filters['start_date'], $filters['end_date']);
        }

        return [
            'total_uses' => $query->count(),
            'total_discount' => $query->sum('discount_amount'),
            'unique_users' => $query->distinct('user_id')->count('user_id'),
            'average_discount' => $query->avg('discount_amount') ?? 0,
        ];
    }
}
