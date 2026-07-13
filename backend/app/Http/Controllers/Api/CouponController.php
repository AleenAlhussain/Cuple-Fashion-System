<?php

namespace App\Http\Controllers\Api;

use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CouponController extends BaseController
{
    /**
     * Get active coupons for display (cached for 5 minutes)
     */
    public function index()
    {
        $coupons = Cache::remember('coupons_list', 300, function () {
            return Coupon::valid()
                ->select('id', 'code', 'description', 'type', 'value', 'min_order_amount')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();
        });

        return $this->success($coupons);
    }

    /**
     * Validate and apply a coupon code
     */
    public function validate(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'country_id' => 'nullable|exists:countries,id',
            'subtotal' => 'required|numeric|min:0',
        ]);

        $coupon = Coupon::where('code', $validated['code'])->valid()->first();

        if (!$coupon) {
            return $this->error('Invalid or expired coupon code.', 400);
        }

        // Only check country restriction if country_id is provided
        if (isset($validated['country_id']) && !$coupon->isValidForCountry($validated['country_id'])) {
            return $this->error('This coupon is not available in your country.', 400);
        }

        if ($coupon->min_order_amount && $validated['subtotal'] < $coupon->min_order_amount) {
            return $this->error(
                "Minimum order amount for this coupon is {$coupon->min_order_amount}.",
                400
            );
        }

        $discount = $coupon->calculateDiscount($validated['subtotal']);

        return $this->success([
            'coupon' => [
                'id' => $coupon->id,
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => $coupon->value,
                'description' => $coupon->description,
            ],
            'discount' => round($discount, 2),
            'message' => "Coupon applied! You save " . round($discount, 2),
        ]);
    }
}
