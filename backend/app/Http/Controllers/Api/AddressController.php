<?php

namespace App\Http\Controllers\Api;

use App\Models\Address;
use App\Models\City;
use App\Models\State;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;

class AddressController extends BaseController
{
    public function index(Request $request)
    {
        $addresses = $request->user()->addresses()->with('country')->get();

        return $this->success($addresses);
    }

    public function store(Request $request)
    {
        $payload = $request->all();
        $state = State::find($payload['state_id'] ?? null);
        $cityId = $payload['city_id'] ?? null;
        $cityName = trim((string) ($payload['city'] ?? ''));

        if (!$cityId && $cityName && $state) {
            $city = City::firstOrCreate(
                ['state_id' => $state->id, 'name' => $cityName],
                ['is_active' => true]
            );
            $payload['city_id'] = $city->id;
        }

        if (empty($payload['city']) && !empty($payload['city_id'])) {
            $city = City::find($payload['city_id']);
            if ($city) {
                $payload['city'] = $city->name;
            }
        }

        if (empty($payload['state']) && $state) {
            $payload['state'] = $state->name;
        }

        if (!empty($payload['phone_code'])) {
            $payload['country_code'] = $payload['phone_code'];
        } elseif (empty($payload['country_code']) && $state?->country?->phone_code) {
            $payload['country_code'] = $state->country->phone_code;
        }

        $request->merge($payload);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
            'phone_code' => 'required|string|max:10',
            'phone' => 'required|string|max:20',
            'country_code' => 'required|string|max:10',
            'email' => 'required|email|max:255',
            'address_line' => 'required_without_all:latitude,longitude|string|max:500',
            'formatted_address' => 'nullable|string|max:500',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'apartment' => 'nullable|string|max:255',
            'city' => 'required|string|max:255',
            'city_id' => 'required|integer|exists:cities,id',
            'state' => 'nullable|string|max:255',
            'state_id' => 'required|integer|exists:states,id',
            'postal_code' => 'nullable|string|max:20',
            'pincode' => 'nullable|string|max:20',
            'country_id' => 'required|integer|exists:countries,id',
            'is_default_shipping' => 'nullable|boolean',
            'is_default_billing' => 'nullable|boolean',
            'type' => 'nullable|string|in:shipping,billing',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $name = trim($validated['name']);
        $parts = preg_split('/\s+/', $name, 2, PREG_SPLIT_NO_EMPTY);
        $validated['first_name'] = $parts[0] ?? $name;
        $validated['last_name'] = $parts[1] ?? null;
        $validated['address_line'] = $validated['address_line'] ?? $validated['formatted_address'] ?? null;
        $validated['street'] = $validated['address_line'] ?? $validated['street'] ?? '';
        if (empty($validated['state']) && $state) {
            $validated['state'] = $state->name;
        }
        $validated['country_code'] = $validated['phone_code'];
        unset($validated['phone_code']);

        if (!empty($validated['pincode']) && empty($validated['postal_code'])) {
            $validated['postal_code'] = $validated['pincode'];
        }
        unset($validated['pincode']);
        $validated['ip_address'] = $this->resolveClientIp($request);

        $user = $request->user();
        if (
            $request->filled('user_id')
            && $user
            && ($user->isAdmin() || $user->isShopManager())
        ) {
            $user = User::findOrFail($validated['user_id']);
        }

        if (empty($validated['phone'])) {
            $validated['phone'] = $user?->phone ?? '';
        }
        $type = $validated['type'] ?? null;
        unset($validated['type'], $validated['user_id']);

        if ($type === 'shipping' || $request->boolean('is_default_shipping')) {
            $user->addresses()->update(['is_default_shipping' => false]);
            $validated['is_default_shipping'] = true;
        }
        if ($type === 'billing' || $request->boolean('is_default_billing')) {
            $user->addresses()->update(['is_default_billing' => false]);
            $validated['is_default_billing'] = true;
        }

        $address = $user->addresses()->create($validated);

        $this->syncUserLocation($request, $user, $validated);

        UserNotification::create([
            'user_id' => $user->id,
            'type' => 'address_added',
            'data' => [
                'title' => 'Address added',
                'message' => 'Your address has been added successfully.',
                'status' => 'address',
                'link' => '/account/addresses',
            ],
        ]);

        return $this->success($address->load('country'), 'Address added successfully', 201);
    }

    public function show(Request $request, $id)
    {
        $address = $request->user()->addresses()->with('country')->findOrFail($id);

        return $this->success($address);
    }

    public function update(Request $request, $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);

        $payload = $request->all();
        $stateId = $payload['state_id'] ?? $address->state_id;
        $state = $stateId ? State::find($stateId) : null;
        $cityId = $payload['city_id'] ?? null;
        $cityName = trim((string) ($payload['city'] ?? ''));

        if (!$cityId && $cityName && $state) {
            $city = City::firstOrCreate(
                ['state_id' => $state->id, 'name' => $cityName],
                ['is_active' => true]
            );
            $payload['city_id'] = $city->id;
            $cityId = $city->id;
        }

        if (empty($payload['city']) && !empty($payload['city_id'])) {
            $city = City::find($payload['city_id']);
            if ($city) {
                $payload['city'] = $payload['city'] ?? $city->name;
            }
        }

        if (empty($payload['state']) && $state) {
            $payload['state'] = $state->name;
        }

        if (!empty($payload['phone_code'])) {
            $payload['country_code'] = $payload['phone_code'];
        }

        $request->merge($payload);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'title' => 'nullable|string|max:255',
            'phone_code' => 'sometimes|string|max:10',
            'phone' => 'sometimes|string|max:20',
            'country_code' => 'nullable|string|max:10',
            'email' => 'nullable|email|max:255',
            'address_line' => 'nullable|string|max:500',
            'formatted_address' => 'nullable|string|max:500',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'apartment' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'city_id' => 'sometimes|integer|exists:cities,id',
            'state' => 'nullable|string|max:255',
            'state_id' => 'sometimes|integer|exists:states,id',
            'postal_code' => 'nullable|string|max:20',
            'pincode' => 'nullable|string|max:20',
            'country_id' => 'sometimes|integer|exists:countries,id',
            'is_default_shipping' => 'nullable|boolean',
            'is_default_billing' => 'nullable|boolean',
            'type' => 'nullable|string|in:shipping,billing',
        ]);

        if (array_key_exists('name', $validated)) {
            $name = trim($validated['name']);
            $parts = preg_split('/\s+/', $name, 2, PREG_SPLIT_NO_EMPTY);
            $validated['first_name'] = $parts[0] ?? $name;
            $validated['last_name'] = $parts[1] ?? null;
        }

        if (!empty($validated['address_line'])) {
            $validated['street'] = $validated['address_line'];
        } elseif (!empty($validated['formatted_address']) && empty($validated['address_line'])) {
            $validated['address_line'] = $validated['formatted_address'];
            $validated['street'] = $validated['formatted_address'];
        }

        if (!empty($validated['phone_code'])) {
            $validated['country_code'] = $validated['phone_code'];
            unset($validated['phone_code']);
        }

        if (!empty($validated['pincode']) && empty($validated['postal_code'])) {
            $validated['postal_code'] = $validated['pincode'];
        }
        $type = $validated['type'] ?? null;
        unset($validated['pincode'], $validated['type']);
        $validated['ip_address'] = $this->resolveClientIp($request);

        $user = $request->user();

        if ($type === 'shipping' || $request->boolean('is_default_shipping')) {
            $user->addresses()->where('id', '!=', $id)->update(['is_default_shipping' => false]);
        }
        if ($type === 'billing' || $request->boolean('is_default_billing')) {
            $user->addresses()->where('id', '!=', $id)->update(['is_default_billing' => false]);
        }

        $address->update($validated);

        $this->syncUserLocation($request, $user, $validated);

        UserNotification::create([
            'user_id' => $user->id,
            'type' => 'address_updated',
            'data' => [
                'title' => 'Address updated',
                'message' => 'Your address has been updated successfully.',
                'status' => 'address',
                'link' => '/account/addresses',
            ],
        ]);

        return $this->success($address->fresh()->load('country'), 'Address updated successfully');
    }

    public function destroy(Request $request, $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);
        $address->delete();

        return $this->success(null, 'Address deleted successfully');
    }

    public function setDefault(Request $request, $id)
    {
        $validated = $request->validate([
            'type' => 'required|in:shipping,billing',
        ]);

        $user = $request->user();
        $address = $user->addresses()->findOrFail($id);

        $field = $validated['type'] === 'shipping' ? 'is_default_shipping' : 'is_default_billing';

        $user->addresses()->update([$field => false]);
        $address->update([$field => true]);

        return $this->success($address->fresh()->load('country'), 'Default address set successfully');
    }

    private function syncUserLocation(Request $request, User $user, array $data): void
    {
        $updates = [
            'last_ip' => $request->ip(),
        ];

        $hasGeo = array_key_exists('latitude', $data)
            && array_key_exists('longitude', $data)
            && $data['latitude'] !== null
            && $data['longitude'] !== null;

        if ($hasGeo) {
            $updates['last_latitude'] = $data['latitude'];
            $updates['last_longitude'] = $data['longitude'];
            $updates['last_location_address'] = $data['formatted_address'] ?? $data['address_line'] ?? null;
            $updates['last_location_at'] = now();
        }

        $user->update($updates);
    }
}
