<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Traits\ShippingTransforms;
use App\Models\ShippingZone;
use App\Services\GeneralSettingService;
use App\Services\ShippingCalculator;
use Illuminate\Http\Request;

class ShippingController extends BaseController
{
    use ShippingTransforms;

    public function __construct(private readonly ShippingCalculator $calculator, private readonly GeneralSettingService $settings)
    {
    }

    public function calculate(Request $request)
    {
        $validated = $request->validate([
            'country_id' => 'required|exists:countries,id',
            'subtotal' => 'required|numeric|min:0',
            'items_quantity' => 'nullable|integer|min:1',
            'payment_method' => 'nullable|string',
        ]);

        $result = $this->calculator->calculateForCountry(
            (int) $validated['country_id'],
            (float) $validated['subtotal'],
            isset($validated['items_quantity']) ? (int) $validated['items_quantity'] : null
        );
        $paymentFee = $this->settings->getPaymentFee($validated['payment_method'] ?? null);

        return $this->success([
            'shipping_amount' => $result['shipping_amount'],
            'rule' => $result['rate'] ? $this->transformRate($result['rate']) : null,
            'zone' => $result['zone'] ? $this->transformZone($result['zone']) : null,
            'payment_fee' => $paymentFee,
        ]);
    }

    public function availableCountries()
    {
        $zones = ShippingZone::active()->with('country:id,name')->get();
        $countries = $zones->map(fn (ShippingZone $zone) => $zone->country ? $zone->country->only(['id', 'name']) : null)
            ->filter()
            ->unique('id')
            ->values()
            ->all();

        return $this->success($countries);
    }
}
