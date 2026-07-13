<?php

namespace App\Http\Controllers\Api;

use App\Models\Point;
use App\Models\PointTransaction;
use Illuminate\Http\Request;

class PointController extends BaseController
{
    /**
     * Get user's points balance and transactions
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return $this->error('Unauthorized', 401);
        }

        $paginate = $request->input('paginate', 10);
        $page = $request->input('page', 1);

        $point = Point::getOrCreate($user->id);

        $transactions = PointTransaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate($paginate);

        return $this->success([
            'balance' => (float) $point->balance,
            'transactions' => [
                'data' => $transactions->items(),
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
            'settings' => [
                'signup_points' => Point::getSignupPoints(),
                'reward_per_order_amount' => (float) \App\Models\Setting::get('points.reward_per_order_amount', Point::POINTS_PER_AED),
                'currency_ratio' => Point::getCurrencyRatio(),
                'max_redeem_percent' => Point::getMaxRedeemPercent(),
            ],
        ]);
    }

    /**
     * Calculate how much discount the user can get with their points
     */
    public function calculate(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return $this->error('Unauthorized', 401);
        }

        $validated = $request->validate([
            'points_to_use' => 'required|numeric|min:0',
            'order_total' => 'required|numeric|min:0',
        ]);

        $point = Point::getOrCreate($user->id);

        $requestedPoints = (float) $validated['points_to_use'];
        $orderBaseAmount = (float) $validated['order_total'];
        $ratio = Point::getCurrencyRatio();
        $maxPercent = Point::getMaxRedeemPercent();

        $requestedValue = $requestedPoints * $ratio;
        $maxDiscountValue = $orderBaseAmount * ($maxPercent / 100);
        $allowedValue = min($requestedValue, $maxDiscountValue);
        $allowedPoints = $ratio > 0 ? floor($allowedValue / $ratio) : 0;
        $allowedPoints = min($allowedPoints, floor((float) $point->balance));
        $allowedDiscountValue = round($allowedPoints * $ratio, 2);

        return $this->success([
            'available_balance' => (float) $point->balance,
            'requested_points' => $requestedPoints,
            'allowed_points' => $allowedPoints,
            'applied_points' => $allowedPoints,
            'allowed_discount_value' => $allowedDiscountValue,
            'currency_ratio' => $ratio,
            'max_redeem_percent' => $maxPercent,
        ]);
    }

    /**
     * Redeem points (called during checkout)
     */
    public function redeem(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return $this->error('Unauthorized', 401);
        }

        $validated = $request->validate([
            'points' => 'required|numeric|min:1',
            'order_id' => 'nullable|exists:orders,id',
            'order_total' => 'nullable|numeric|min:0',
        ]);

        $point = Point::getOrCreate($user->id);
        $requestedPoints = (float) $validated['points'];
        $ratio = Point::getCurrencyRatio();
        $maxPercent = Point::getMaxRedeemPercent();

        $orderBaseAmount = 0.0;
        if (!empty($validated['order_total'])) {
            $orderBaseAmount = (float) $validated['order_total'];
        } elseif (!empty($validated['order_id'])) {
            $order = \App\Models\Order::find($validated['order_id']);
            $orderBaseAmount = (float) ($order?->total ?? 0);
        }

        $requestedValue = $requestedPoints * $ratio;
        $maxDiscountValue = $orderBaseAmount * ($maxPercent / 100);
        $allowedValue = min($requestedValue, $maxDiscountValue);
        $allowedPoints = $ratio > 0 ? floor($allowedValue / $ratio) : 0;
        $allowedPoints = min($allowedPoints, floor((float) $point->balance));
        $allowedDiscountValue = round($allowedPoints * $ratio, 2);

        if ($allowedPoints <= 0) {
            return $this->success([
                'new_balance' => (float) $point->balance,
                'requested_points' => $requestedPoints,
                'allowed_points' => 0,
                'applied_points' => 0,
                'allowed_discount_value' => 0,
                'currency_ratio' => $ratio,
                'max_redeem_percent' => $maxPercent,
            ]);
        }

        $transaction = $point->debit(
            $allowedPoints,
            'points_redeem',
            $validated['order_id'] ?? null,
            null,
            $validated['order_id'] ? 'order:' . $validated['order_id'] : null
        );

        if (!$transaction) {
            return $this->error('Failed to redeem points', 500);
        }

        return $this->success([
            'new_balance' => (float) $point->balance,
            'requested_points' => $requestedPoints,
            'allowed_points' => $allowedPoints,
            'applied_points' => $allowedPoints,
            'allowed_discount_value' => $allowedDiscountValue,
            'currency_ratio' => $ratio,
            'max_redeem_percent' => $maxPercent,
            'transaction_id' => $transaction->id,
            'created_at' => $transaction->created_at,
        ]);
    }
}
