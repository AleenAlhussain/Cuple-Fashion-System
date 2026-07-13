<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Story extends Model
{
    protected $fillable = [
        'title',
        'title_ar',
        'media_type',
        'media_path',
        'thumbnail',
        'creator_type',
        'user_id',
        'product_id',
        'button_text',
        'button_text_ar',
        'custom_link',
        'duration_seconds',
        'sort_order',
        'is_active',
        'expires_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
        'duration_seconds' => 'integer',
        'sort_order' => 'integer',
    ];

    protected $appends = ['media_url', 'thumbnail_url', 'is_expired', 'time_remaining'];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($story) {
            // Auto-set expires_at to 24 hours from now if not set
            if (!$story->expires_at) {
                $story->expires_at = Carbon::now()->addHours(24);
            }
        });
    }

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where('expires_at', '>', Carbon::now());
    }

    public function scopeByCreator($query, $creatorType)
    {
        return $query->where('creator_type', $creatorType);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    // Helper to get proper URL
    protected function getProperUrl($path)
    {
        return MediaUrl::fromPath($path);
    }

    // Accessors
    public function getMediaUrlAttribute()
    {
        return $this->getProperUrl($this->media_path);
    }

    public function getThumbnailUrlAttribute()
    {
        // Use thumbnail if available, otherwise use media_path for images
        if ($this->thumbnail) {
            return $this->getProperUrl($this->thumbnail);
        }

        // For images, use the media_path as thumbnail
        if ($this->media_type === 'image') {
            return $this->getProperUrl($this->media_path);
        }

        return null;
    }

    public function getIsExpiredAttribute()
    {
        return $this->expires_at && Carbon::now()->greaterThan($this->expires_at);
    }

    public function getTimeRemainingAttribute()
    {
        if ($this->is_expired) {
            return 'Expired';
        }

        return $this->expires_at ? $this->expires_at->diffForHumans() : null;
    }

    // Get link URL (product or custom)
    public function getLinkUrl()
    {
        if ($this->custom_link) {
            return $this->custom_link;
        }

        if ($this->product) {
            return '/product/' . $this->product->slug;
        }

        return null;
    }
}
