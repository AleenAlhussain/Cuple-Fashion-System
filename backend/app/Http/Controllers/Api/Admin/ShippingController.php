<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Traits\ShippingTransforms;
use App\Models\Country;
use App\Models\ShippingZone;
use Illuminate\Http\Request;

class ShippingController extends BaseController
{
    use ShippingTransforms;
    /**
     * Return all shipping zones with their country and rates.
     */
    public function index()
    {
        $zones = ShippingZone::with(['country:id,name', 'rates'])->get();
        $data = $zones->map(function (ShippingZone $zone) {
            return $this->transformZone($zone);
        });
        return $this->success($data->values()->all());
    }

    /**
     * Return the shipping zone for the given ID along with its rates.
     */
    public function show($id)
    {
        $zone = ShippingZone::with(['country:id,name', 'rates'])->findOrFail($id);
        return $this->success($this->transformZone($zone));
    }

    public function store(Request $request)
    {
        $countryIds = collect($request->input('country_id', []))->filter()->unique();

        if ($countryIds->isEmpty()) {
            return $this->error('Select at least one country', 422);
        }

        $status = $request->boolean('status', true);

        $zones = [];
        foreach ($countryIds as $countryId) {
            $country = Country::find($countryId);
            if (!$country) {
                continue;
            }

            $zone = ShippingZone::updateOrCreate(
                ['country_id' => $countryId],
                [
                    'name' => $country->name,
                    'is_active' => $status,
                ]
            );

            $zones[] = $zone->load(['country:id,name', 'rates']);
        }

        if (empty($zones)) {
            return $this->error('No valid countries selected', 422);
        }

        $data = collect($zones)->map(function (ShippingZone $zone) {
            return $this->transformZone($zone);
        })->values()->all();

        return $this->success($data, 'Shipping zone saved successfully');
    }

}
