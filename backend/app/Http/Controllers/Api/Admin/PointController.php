<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Point;
use App\Models\PointTransaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PointController extends BaseController
{
    /**
     * List all users with their point balances
     */
    public function index(Request $request)
    {
        $search = $request->get('search');
        $paginate = $request->get('paginate', 15);

        $users = User::with('point')
            ->when($search, function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            })
            ->paginate($paginate);

        $data = $users->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'balance' => $user->point?->balance ?? 0,
            ];
        });

        return $this->success([
            'data' => $data,
            'current_page' => $users->currentPage(),
            'last_page' => $users->lastPage(),
            'total' => $users->total(),
        ]);
    }

    /**
     * Get user's point details and transactions
     */
    public function show(Request $request, $userId)
    {
        $user = User::find($userId);

        if (!$user) {
            return $this->error('User not found', 404);
        }

        $point = Point::getOrCreate($user->id);
        $paginate = $request->get('paginate', 15);

        $transactions = PointTransaction::where('user_id', $user->id)
            ->with('order', 'createdByUser')
            ->orderBy('created_at', 'desc')
            ->paginate($paginate);

        return $this->success([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'balance' => (float) $point->balance,
            'transactions' => [
                'data' => $transactions->items(),
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    /**
     * Compatibility endpoint for admin points transactions by consumer_id.
     */
    public function consumerTransactions(Request $request)
    {
        $userId = $request->get('consumer_id') ?? $request->get('user_id');

        if (!$userId) {
            return $this->success([
                'user' => null,
                'balance' => 0,
                'transactions' => [
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'total' => 0,
                ],
            ]);
        }

        return $this->show($request, $userId);
    }

    /**
     * Credit points to a user
     */
    public function credit(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:1',
            'detail' => 'nullable|string|max:255',
        ]);

        $adminId = $request->user()?->id;

        DB::beginTransaction();
        try {
            $point = Point::where('user_id', $validated['user_id'])->lockForUpdate()->first();
            if (!$point) {
                $point = Point::create([
                    'user_id' => $validated['user_id'],
                    'balance' => 0,
                ]);
            }

            $point = Point::where('user_id', $validated['user_id'])->lockForUpdate()->first();
            $before = (float) $point->balance;
            $after = $before + (float) $validated['amount'];

            $point->balance = $after;
            $point->save();

            $transaction = PointTransaction::create([
                'user_id' => $point->user_id,
                'amount' => (float) $validated['amount'],
                'type' => 'credit',
                'balance_before' => $before,
                'balance_after' => $after,
                'detail' => $validated['detail'] ?? 'Admin credit',
                'created_by' => $adminId,
                'admin_id' => $adminId,
            ]);

            DB::commit();

            return $this->success([
                'message' => 'Points credited successfully',
                'new_balance' => $after,
                'transaction_id' => $transaction->id,
                'created_at' => $transaction->created_at,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Debit points from a user
     */
    public function debit(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:1',
            'detail' => 'nullable|string|max:255',
        ]);

        $adminId = $request->user()?->id;

        DB::beginTransaction();
        try {
            $point = Point::where('user_id', $validated['user_id'])->lockForUpdate()->first();
            if (!$point) {
                $point = Point::create([
                    'user_id' => $validated['user_id'],
                    'balance' => 0,
                ]);
            }

            $point = Point::where('user_id', $validated['user_id'])->lockForUpdate()->first();
            $before = (float) $point->balance;
            $amount = (float) $validated['amount'];

            if ($before < $amount) {
                DB::rollBack();
                return $this->error('User has insufficient points balance', 400);
            }

            $after = $before - $amount;
            $point->balance = $after;
            $point->save();

            $transaction = PointTransaction::create([
                'user_id' => $point->user_id,
                'amount' => -$amount,
                'type' => 'debit',
                'balance_before' => $before,
                'balance_after' => $after,
                'detail' => $validated['detail'] ?? 'Admin debit',
                'created_by' => $adminId,
                'admin_id' => $adminId,
            ]);

            DB::commit();

            return $this->success([
                'message' => 'Points debited successfully',
                'new_balance' => $after,
                'transaction_id' => $transaction->id,
                'created_at' => $transaction->created_at,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
