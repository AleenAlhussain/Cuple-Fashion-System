<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalletController extends BaseController
{
    public function consumerTransactions(Request $request)
    {
        $userId = $request->get('consumer_id') ?? $request->get('user_id');
        return $this->transactionsForUser($request, $userId);
    }

    public function vendorTransactions(Request $request)
    {
        $userId = $request->get('vendor_id') ?? $request->get('user_id');
        return $this->transactionsForUser($request, $userId);
    }

    private function transactionsForUser(Request $request, $userId)
    {
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

        $user = User::find($userId);

        if (!$user) {
            return $this->error('User not found', 404);
        }

        $wallet = Wallet::getOrCreate($user->id);
        $paginate = $request->get('paginate', 15);

        $transactions = WalletTransaction::where('user_id', $user->id)
            ->with('order', 'createdByUser')
            ->orderBy('created_at', 'desc')
            ->paginate($paginate);

        return $this->success([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'balance' => (float) $wallet->balance,
            'transactions' => [
                'data' => $transactions->items(),
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

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
            $wallet = Wallet::where('user_id', $validated['user_id'])->lockForUpdate()->first();
            if (!$wallet) {
                $wallet = Wallet::create([
                    'user_id' => $validated['user_id'],
                    'balance' => 0,
                ]);
            }

            $wallet = Wallet::where('user_id', $validated['user_id'])->lockForUpdate()->first();
            $before = (float) $wallet->balance;
            $after = $before + (float) $validated['amount'];

            $wallet->balance = $after;
            $wallet->save();

            $transaction = WalletTransaction::create([
                'user_id' => $wallet->user_id,
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
                'message' => 'Wallet credited successfully',
                'new_balance' => $after,
                'transaction_id' => $transaction->id,
                'created_at' => $transaction->created_at,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

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
            $wallet = Wallet::where('user_id', $validated['user_id'])->lockForUpdate()->first();
            if (!$wallet) {
                $wallet = Wallet::create([
                    'user_id' => $validated['user_id'],
                    'balance' => 0,
                ]);
            }

            $wallet = Wallet::where('user_id', $validated['user_id'])->lockForUpdate()->first();
            $before = (float) $wallet->balance;
            $amount = (float) $validated['amount'];

            if ($before < $amount) {
                DB::rollBack();
                return $this->error('User has insufficient wallet balance', 400);
            }

            $after = $before - $amount;
            $wallet->balance = $after;
            $wallet->save();

            $transaction = WalletTransaction::create([
                'user_id' => $wallet->user_id,
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
                'message' => 'Wallet debited successfully',
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
