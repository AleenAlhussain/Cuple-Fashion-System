<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Coupon;
use Illuminate\Http\Request;

class CouponController extends BaseController
{
    public function index(Request $request)
    {
        $query = Coupon::query();

        if ($request->has('status')) {
            $query->where('is_active', $request->status);
        }

        if ($request->has('search')) {
            $query->where('code', 'like', '%' . $request->search . '%');
        }

        $coupons = $query->orderBy('created_at', 'desc')->paginate($request->get('paginate', 15));

        return response()->json([
            'success' => true,
            'data' => $coupons->items(),
            'total' => $coupons->total(),
            'current_page' => $coupons->currentPage(),
            'last_page' => $coupons->lastPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:coupons,code',
            'type' => 'required|in:percentage,fixed',
            'value' => 'required|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_per_user' => 'nullable|integer|min:1',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'boolean',
        ]);

        $coupon = Coupon::create($validated);

        return $this->success($coupon, 'Coupon created successfully.');
    }

    public function show($id)
    {
        $coupon = Coupon::findOrFail($id);
        return $this->success($coupon);
    }

    public function update(Request $request, $id)
    {
        $coupon = Coupon::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|unique:coupons,code,' . $id,
            'type' => 'sometimes|in:percentage,fixed',
            'value' => 'sometimes|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_per_user' => 'nullable|integer|min:1',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'boolean',
        ]);

        $coupon->update($validated);

        return $this->success($coupon, 'Coupon updated successfully.');
    }

    public function destroy($id)
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->delete();

        return $this->success(null, 'Coupon deleted successfully.');
    }
}
