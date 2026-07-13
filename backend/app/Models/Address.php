<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'title',
        'first_name',
        'last_name',
        'phone',
        'country_code',
        'ip_address',
        'email',
        'address_line',
        'formatted_address',
        'latitude',
        'longitude',
        'street',
        'apartment',
        'city',
        'city_id',
        'state_id',
        'state',
        'postal_code',
        'country_id',
        'is_default_shipping',
        'is_default_billing',
    ];

    protected $casts = [
        'is_default_shipping' => 'boolean',
        'is_default_billing' => 'boolean',
    ];

    protected $appends = ['pincode', 'state_object', 'city_object'];

    // Alias for postal_code to match frontend expectations
    public function getPincodeAttribute()
    {
        return $this->postal_code;
    }

    // Return state as object with name property for frontend
    public function getStateObjectAttribute()
    {
        if ($this->state_id && $this->stateRelation) {
            return ['name' => $this->stateRelation->name, 'id' => $this->stateRelation->id];
        }

        return $this->state ? ['name' => $this->state, 'id' => $this->state] : null;
    }

    public function getCityObjectAttribute()
    {
        if ($this->city_id && $this->city) {
            return ['name' => $this->city, 'id' => $this->city_id];
        }

        return null;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function getFullNameAttribute()
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    public function getFullAddressAttribute()
    {
        $addressLine = $this->address_line ?: $this->street;

            $parts = array_filter([
                $addressLine,
                $this->apartment,
                $this->city,
                $this->state,
                $this->postal_code,
                $this->country?->name,
            ]);
        return implode(', ', $parts);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function stateRelation(): BelongsTo
    {
        return $this->belongsTo(State::class, 'state_id');
    }
}
