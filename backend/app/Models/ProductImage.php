<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImage extends Model
{
    protected $fillable = [
        'product_id',
        'product_variant_id',
        'image',
        'thumbnail',
        'alt_text',
        'is_primary',
        'sort_order',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    protected $appends = ['image_url', 'thumbnail_url'];

    protected function normalizeMediaPath($value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (!is_string($value)) {
            if (!is_scalar($value)) {
                return null;
            }
            $value = (string) $value;
        }

        $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $normalizedExt = preg_replace_callback(
            '/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(?=($|[?#]))/i',
            static fn ($matches) => '.' . strtolower($matches[1]),
            $decoded
        );
        $trimmed = trim($normalizedExt);

        return $trimmed === '' ? null : $trimmed;
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function getImageAttribute($value)
    {
        return $this->normalizeMediaPath($value);
    }

    public function setImageAttribute($value): void
    {
        $this->attributes['image'] = $this->normalizeMediaPath($value);
    }

    public function getThumbnailAttribute($value)
    {
        return $this->normalizeMediaPath($value);
    }

    public function setThumbnailAttribute($value): void
    {
        $this->attributes['thumbnail'] = $this->normalizeMediaPath($value);
    }

    // Helper to get proper URL (handles both external URLs and local storage)
    protected function getProperUrl($path)
    {
        return MediaUrl::fromPath($path);
    }

    public function getImageUrlAttribute()
    {
        return $this->getProperUrl($this->image);
    }

    public function getThumbnailUrlAttribute()
    {
        return $this->thumbnail ? $this->getProperUrl($this->thumbnail) : $this->image_url;
    }
}
