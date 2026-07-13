<?php

namespace App\Http\Controllers\Api\Website;

use App\Http\Controllers\Controller;
use App\Models\Point;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $wallet = Wallet::getOrCreate($user->id);
        $balance = (float) $wallet->balance;
        $paginate = max(1, (int) $request->input('paginate', 10));
        $page = max(1, (int) $request->input('page', 1));

        $transactions = WalletTransaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate($paginate, ['*'], 'page', $page);

        return response()->json([
            'balance' => $balance,
            'transactions' => [
                'data' => $transactions->items(),
                'current_page' => $transactions->currentPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    public function pointsValue(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $point = Point::getOrCreate($user->id);
        $balance = (float) $point->balance;
        $ratio = Point::getCurrencyRatio();
        $availableValue = $ratio > 0 ? round($balance * $ratio, 2) : 0.0;

        return response()->json([
            'success' => true,
            'message' => 'Success',
            'data' => [
                'points_balance' => $balance,
                'available_value_aed' => $availableValue,
                'display_label' => 'Available to use during checkout',
                'notes' => 'Subject to loyalty program rules',
            ],
        ]);
    }
}
