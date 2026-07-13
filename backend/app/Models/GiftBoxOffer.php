<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class GiftBoxOffer extends Model
{
    protected $fillable = [
        'is_active',
        'start_at',
        'end_at',
        'only_logged_in',
        'selection_limit',
        'show_once_per_session',
        'reuse_policy',
        'discount_type',
        'discount_value',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'only_logged_in' => 'boolean',
        'show_once_per_session' => 'boolean',
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'discount_value' => 'decimal:2',
    ];

    public function categoryItems(): HasMany
    {
        return $this->hasMany(GiftBoxOfferCategoryItem::class);
    }

    public function selections(): HasMany
    {
        return $this->hasMany(GiftBoxSelection::class);
    }

    public function scopeActive($query)
    {
        $now = Carbon::now();

        return $query->where('is_active', true)
            ->where(function ($sub) use ($now) {
                $sub->whereNull('start_at')->orWhere('start_at', '<=', $now);
            })
            ->where(function ($sub) use ($now) {
                $sub->whereNull('end_at')->orWhere('end_at', '>=', $now);
            });
    }

    public function isCurrentlyActive(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = Carbon::now();
        if ($this->start_at && $this->start_at->gt($now)) {
            return false;
        }

        if ($this->end_at && $this->end_at->lt($now)) {
            return false;
        }

        return true;
    }
}
