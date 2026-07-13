<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'name',
        'sku',
        'price',
        'sale_price',
        'stock_quantity',
        'image',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $appends = ['final_price', 'variant_name', 'image_url', 'variation_image', 'status'];

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

    public function attributeValues(): BelongsToMany
    {
        return $this->belongsToMany(AttributeValue::class, 'attribute_value_product_variant');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInStock($query)
    {
        return $query->where('stock_quantity', '>', 0);
    }

    public function getFinalPriceAttribute()
    {
        // Use sale_price only if it's greater than 0, otherwise use regular price
        if ($this->sale_price && $this->sale_price > 0) {
            return $this->sale_price;
        }
        return $this->price ?? $this->product?->final_price ?? 0;
    }

    public function getStatusAttribute()
    {
        return (int) $this->is_active;
    }

    public function getVariantNameAttribute()
    {
        // Use stored name if available, otherwise generate from attribute values
        if ($this->name) {
            return $this->name;
        }
        return $this->attributeValues->pluck('value')->implode('/');
    }

    public function getImageAttribute($value)
    {
        return $this->normalizeMediaPath($value);
    }

    public function setImageAttribute($value): void
    {
        $this->attributes['image'] = $this->normalizeMediaPath($value);
    }

    public function getImageUrlAttribute()
    {
        return MediaUrl::fromPath($this->image);
    }

    /**
     * Get variation_image in the format the frontend expects
     * Returns object with original_url property
     */
    public function getVariationImageAttribute()
    {
        $imageUrl = $this->image_url;
        if ($imageUrl) {
            return ['original_url' => $imageUrl];
        }
        return null;
    }
}
