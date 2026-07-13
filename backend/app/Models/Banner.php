<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Banner extends Model
{
    protected $fillable = [
        'title',
        'title_ar',
        'description',
        'description_ar',
        'image',
        'image_mobile',
        'link',
        'button_text',
        'country_id',
        'position',
        'sort_order',
        'start_date',
        'end_date',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    protected $appends = ['image_url', 'image_mobile_url'];

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('start_date')
                    ->orWhere('start_date', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            });
    }

    public function scopeForCountry($query, $countryId)
    {
        return $query->where(function ($q) use ($countryId) {
            $q->whereNull('country_id')
                ->orWhere('country_id', $countryId);
        });
    }

    public function scopePosition($query, $position)
    {
        return $query->where('position', $position);
    }

    public function getImageUrlAttribute()
    {
        return MediaUrl::fromPath($this->image);
    }

    public function getImageMobileUrlAttribute()
    {
        return $this->image_mobile ? MediaUrl::fromPath($this->image_mobile) : $this->image_url;
    }
}
