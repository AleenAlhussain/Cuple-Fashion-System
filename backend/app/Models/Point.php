<?php

namespace App\Models;

use Illuminate\Support\Facades\DB;
use App\Models\Setting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Point extends Model
{
    protected $fillable = [
        'user_id',
        'balance',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
    ];

    // Default points settings (used if DB settings are missing)
    const SIGNUP_POINTS = 100;
    const POINTS_PER_AED = 0.05;         // Points earned per 1 AED spent
    const POINT_CURRENCY_RATIO = 20;     // 20 points = 1 AED
    const MAX_REDEEM_PERCENT = 100;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class, 'user_id', 'user_id');
    }

    /**
     * Credit points to user
     */
    public function credit(float $amount, string $detail, ?int $orderId = null, ?int $createdBy = null, ?string $remark = null): PointTransaction
    {
        return DB::transaction(function () use ($amount, $detail, $orderId, $createdBy, $remark) {
            $point = self::where('user_id', $this->user_id)->lockForUpdate()->first();
            if (!$point) {
                $point = self::create([
                    'user_id' => $this->user_id,
                    'balance' => 0,
                ]);
                $point = self::where('user_id', $this->user_id)->lockForUpdate()->first();
            }

            $before = (float) $point->balance;
            $after = $before + $amount;
            $point->balance = $after;
            $point->save();

            return PointTransaction::create([
                'user_id' => $point->user_id,
                'order_id' => $orderId,
                'amount' => $amount,
                'type' => 'credit',
                'balance_before' => $before,
                'balance_after' => $after,
                'detail' => $detail,
                'remark' => $remark,
                'created_by' => $createdBy,
                'admin_id' => $createdBy,
            ]);
        });
    }

    /**
     * Debit points from user
     */
    public function debit(float $amount, string $detail, ?int $orderId = null, ?int $createdBy = null, ?string $remark = null): ?PointTransaction
    {
        return DB::transaction(function () use ($amount, $detail, $orderId, $createdBy, $remark) {
            $point = self::where('user_id', $this->user_id)->lockForUpdate()->first();
            if (!$point) {
                $point = self::create([
                    'user_id' => $this->user_id,
                    'balance' => 0,
                ]);
                $point = self::where('user_id', $this->user_id)->lockForUpdate()->first();
            }

            $before = (float) $point->balance;
            if ($before < $amount) {
                return null;
            }

            $after = $before - $amount;
            $point->balance = $after;
            $point->save();

            return PointTransaction::create([
                'user_id' => $point->user_id,
                'order_id' => $orderId,
                'amount' => -$amount,
                'type' => 'debit',
                'balance_before' => $before,
                'balance_after' => $after,
                'detail' => $detail,
                'remark' => $remark,
                'created_by' => $createdBy,
                'admin_id' => $createdBy,
            ]);
        });
    }

    /**
     * Calculate points earned from order amount
     * Formula: orderAmount × 0.05 points per AED
     * Example: 100 AED = 5 points, 500 AED = 25 points
     */
    public static function calculatePointsFromOrder(float $orderAmount): float
    {
        $rewardRate = (float) Setting::get('points.reward_per_order_amount', self::POINTS_PER_AED);
        if ($orderAmount <= 0 || $rewardRate <= 0) {
            return 0;
        }

        return (float) floor($orderAmount * $rewardRate);
    }

    /**
     * Convert points to currency value
     */
    public static function pointsToCurrency(float $points, ?float $ratio = null): float
    {
        $ratio = $ratio ?? (float) Setting::get('points.currency_ratio', (1 / self::POINT_CURRENCY_RATIO));
        return $points * $ratio;
    }

    /**
     * Convert currency to points
     */
    public static function currencyToPoints(float $currency, ?float $ratio = null): float
    {
        $ratio = $ratio ?? (float) Setting::get('points.currency_ratio', (1 / self::POINT_CURRENCY_RATIO));
        if ($ratio <= 0) {
            return 0;
        }
        return $currency / $ratio;
    }

    public static function getCurrencyRatio(): float
    {
        return (float) Setting::get('points.currency_ratio', (1 / self::POINT_CURRENCY_RATIO));
    }

    public static function getMaxRedeemPercent(): float
    {
        return (float) Setting::get('points.max_redeem_percent', self::MAX_REDEEM_PERCENT);
    }

    public static function getSignupPoints(): int
    {
        return (int) Setting::get('points.signup_points', self::SIGNUP_POINTS);
    }

    /**
     * Get or create points record for user
     */
    public static function getOrCreate(int $userId): self
    {
        return self::firstOrCreate(
            ['user_id' => $userId],
            ['balance' => 0]
        );
    }
}
