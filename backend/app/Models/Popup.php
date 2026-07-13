<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Popup extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'title_ar',
        'description',
        'description_ar',
        'type',
        'image',
        'button_text',
        'button_text_ar',
        'button_link',
        'coupon_code',
        'discount_value',
        'discount_type',
        'display_frequency',
        'delay_seconds',
        'show_on_exit_intent',
        'show_on_pages',
        'start_date',
        'end_date',
        'is_active',
        'priority',
    ];

    protected $casts = [
        'show_on_pages' => 'array',
        'is_active' => 'boolean',
        'show_on_exit_intent' => 'boolean',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'discount_value' => 'decimal:2',
        'delay_seconds' => 'integer',
        'priority' => 'integer',
    ];

    protected $appends = ['image_url'];

    /**
     * Get the image URL
     */
    public function getImageUrlAttribute(): ?string
    {
        return MediaUrl::fromPath($this->image);
    }

    /**
     * Scope for active popups
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for currently scheduled popups
     */
    public function scopeScheduled($query)
    {
        $now = now();
        return $query->where(function ($q) use ($now) {
            $q->whereNull('start_date')
              ->orWhere('start_date', '<=', $now);
        })->where(function ($q) use ($now) {
            $q->whereNull('end_date')
              ->orWhere('end_date', '>=', $now);
        });
    }

    /**
     * Scope by type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Check if popup should show on a specific page
     */
    public function shouldShowOnPage(string $page): bool
    {
        if (empty($this->show_on_pages)) {
            return true; // Show on all pages if not specified
        }

        return in_array('all', $this->show_on_pages) || in_array($page, $this->show_on_pages);
    }
}
