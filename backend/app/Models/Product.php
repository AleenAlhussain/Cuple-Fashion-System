<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'name_ar',
        'slug',
        'type',
        'sku',
        'short_description',
        'short_description_ar',
        'description',
        'description_ar',
        'price',
        'sale_price',
        'min_price',
        'max_price',
        'min_sale_price',
        'max_sale_price',
        'has_variants',
        'is_sale_enable',
        'sale_starts_at',
        'sale_expired_at',
        'cost_price',
        'stock_quantity',
        'min_stock_alert',
        'weight',
        'weight_unit',
        'unit',
        'brand_id',
        'store_id',
        'is_active',
        'is_featured',
        'is_random_related_products',
        'is_digital',
        'is_free_shipping',
        'estimated_delivery_text',
        'is_return',
        'return_policy_text',
        'manage_stock',
        'stock_status',
        'meta_title',
        'meta_description',
        'meta_image',
        'size_chart_image_id',
        'product_thumbnail_id',
        'product_galleries_id',
        'sort_order',
        'safe_checkout',
        'secure_checkout',
        'social_share',
        'encourage_order',
        'encourage_view',
        'is_trending',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'min_price' => 'decimal:2',
        'max_price' => 'decimal:2',
        'min_sale_price' => 'decimal:2',
        'max_sale_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'weight' => 'decimal:2',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'is_digital' => 'boolean',
        'manage_stock' => 'boolean',
        'is_sale_enable' => 'boolean',
        'sale_starts_at' => 'datetime',
        'sale_expired_at' => 'datetime',
        'is_random_related_products' => 'boolean',
        'is_free_shipping' => 'boolean',
        'is_return' => 'boolean',
        'safe_checkout' => 'boolean',
        'secure_checkout' => 'boolean',
        'social_share' => 'boolean',
        'encourage_order' => 'boolean',
        'encourage_view' => 'boolean',
        'is_trending' => 'boolean',
        'has_variants' => 'boolean',
        'product_thumbnail_id' => 'integer',
        'store_id' => 'integer',
        'product_galleries_id' => 'array',
    ];

    protected $appends = ['primary_image', 'final_price', 'product_thumbnail', 'product_galleries', 'attributes', 'status'];

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_product');
    }

    public function countries(): BelongsToMany
    {
        return $this->belongsToMany(Country::class, 'country_product')
            ->withPivot(['price', 'sale_price']);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * Alias for variants - frontend compatibility
     * Only returns data if variants are already eager loaded to avoid N+1 queries
     */
    public function getVariationsAttribute()
    {
        // Only return variants if they're already loaded
        if ($this->relationLoaded('variants')) {
            return $this->variants;
        }
        return null;
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function primaryImage()
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'product_tag');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function relatedProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_relations', 'product_id', 'related_product_id')
            ->wherePivot('type', 'related')
            ->withTimestamps();
    }

    public function crossSellProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_relations', 'product_id', 'related_product_id')
            ->wherePivot('type', 'cross_sell')
            ->withTimestamps();
    }

    public function upsellProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_relations', 'product_id', 'related_product_id')
            ->wherePivot('type', 'upsell')
            ->withTimestamps();
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeInStock($query)
    {
        return $query->where('stock_status', 'in_stock');
    }

    public function scopeForCountry($query, $countryId)
    {
        return $query->whereHas('countries', function ($q) use ($countryId) {
            $q->where('countries.id', $countryId);
        });
    }

    // Helper to get proper image URL (handles both external URLs and local storage)
    protected function getImageUrl($path)
    {
        return MediaUrl::fromPath($path);
    }

    // Accessors
    public function getPrimaryImageAttribute()
    {
        // Use already-loaded relationship to avoid N+1 query
        // Check if images are loaded first
        if ($this->relationLoaded('images')) {
            $image = $this->images->firstWhere('is_primary', true)
                ?? $this->images->first();
            return $image ? $this->getImageUrl($image->image) : null;
        }

        // Fallback to query only if images not eager loaded
        $image = $this->images()->where('is_primary', true)->first()
            ?? $this->images()->first();
        return $image ? $this->getImageUrl($image->image) : null;
    }

    public function getProductThumbnailAttribute()
    {
        $url = $this->primary_image;
        if (!$url) return null;

        $thumbnailId = $this->product_thumbnail_id;
        if (!$thumbnailId && $this->relationLoaded('images')) {
            $primaryImage = $this->images->firstWhere('is_primary', true) ?? $this->images->first();
            $thumbnailId = $primaryImage?->id;
        }

        return [
            'id' => $thumbnailId,
            'original_url' => $url,
        ];
    }

    public function getProductGalleriesAttribute()
    {
        $images = $this->relationLoaded('images') ? $this->images : $this->images()->get();
        $galleryIds = $this->normalizeLinkedGalleryIds($this->product_galleries_id);

        return $images->values()->map(function ($image, $index) use ($galleryIds) {
            $linkedId = $galleryIds[$index] ?? null;

            return [
                'id' => $linkedId ?: $image->id,
                'original_url' => $this->getImageUrl($image->image),
            ];
        });
    }

    /**
     * @return array<int, int|string>
     */
    protected function normalizeLinkedGalleryIds($value): array
    {
        if (is_array($value)) {
            $raw = $value;
        } elseif (is_string($value)) {
            $decoded = json_decode($value, true);
            $raw = is_array($decoded) ? $decoded : [];
        } else {
            $raw = [];
        }

        $normalized = [];
        foreach ($raw as $id) {
            if (is_numeric($id)) {
                $normalized[] = (int) $id;
            } elseif (is_string($id) && trim($id) !== '') {
                $normalized[] = trim($id);
            }
        }

        return array_values(array_unique($normalized, SORT_REGULAR));
    }

    public function getStatusAttribute()
    {
        return (int) $this->is_active;
    }

    public function getFinalPriceAttribute()
    {
        // Use sale_price only if it's greater than 0, otherwise use regular price
        if ($this->sale_price && $this->sale_price > 0) {
            return $this->sale_price;
        }
        return $this->price ?? 0;
    }

    public function getDiscountPercentageAttribute()
    {
        if ($this->sale_price && $this->price > 0) {
            return round((($this->price - $this->sale_price) / $this->price) * 100);
        }
        return 0;
    }

    public function getPriceForCountry($countryId)
    {
        $countryPrice = $this->countries()->where('countries.id', $countryId)->first();
        if ($countryPrice) {
            return [
                'price' => $countryPrice->pivot->price ?? $this->price,
                'sale_price' => $countryPrice->pivot->sale_price ?? $this->sale_price,
            ];
        }
        return [
            'price' => $this->price,
            'sale_price' => $this->sale_price,
        ];
    }

    public function getAverageRatingAttribute()
    {
        // Use loaded relationship if available to avoid N+1
        if ($this->relationLoaded('reviews')) {
            $approved = $this->reviews->where('is_approved', true);
            return $approved->avg('rating') ?? 0;
        }
        return $this->reviews()->where('is_approved', true)->avg('rating') ?? 0;
    }

    public function getReviewCountAttribute()
    {
        // Use loaded relationship if available to avoid N+1
        if ($this->relationLoaded('reviews')) {
            return $this->reviews->where('is_approved', true)->count();
        }
        return $this->reviews()->where('is_approved', true)->count();
    }

    /**
     * Get unique attributes used by this product's variants.
     * Returns only the attribute values that THIS product's variants actually use.
     */
    public function getAttributesAttribute()
    {
        // If variants are loaded with attributeValues.attribute, extract unique attributes
        if ($this->relationLoaded('variants')) {
            $attributesMap = [];

            foreach ($this->variants as $variant) {
                if ($variant->relationLoaded('attributeValues')) {
                    foreach ($variant->attributeValues as $attrValue) {
                        if ($attrValue->relationLoaded('attribute')) {
                            $attr = $attrValue->attribute;
                            if (!$attr) continue;

                            // Initialize attribute if not exists
                            if (!isset($attributesMap[$attr->id])) {
                                $attributesMap[$attr->id] = [
                                    'id' => $attr->id,
                                    'name' => $attr->name,
                                    'slug' => $attr->slug,
                                    'style' => $attr->style,
                                    'attribute_values' => [],
                                ];
                            }

                            // Add this attribute value if not already added
                            $valueExists = collect($attributesMap[$attr->id]['attribute_values'])
                                ->contains('id', $attrValue->id);

                            if (!$valueExists) {
                                $attributesMap[$attr->id]['attribute_values'][] = [
                                    'id' => $attrValue->id,
                                    'attribute_id' => $attrValue->attribute_id,
                                    'value' => $attrValue->value,
                                    'hex_color' => $attrValue->color_code,
                                ];
                            }
                        }
                    }
                }
            }

            return array_values($attributesMap);
        }

        // Fallback: query for attributes if not eager loaded
        // Only get attribute values that this product's variants use
        $attributeValueIds = \DB::table('attribute_value_product_variant')
            ->join('product_variants', 'product_variants.id', '=', 'attribute_value_product_variant.product_variant_id')
            ->where('product_variants.product_id', $this->id)
            ->where('product_variants.is_active', true)
            ->distinct()
            ->pluck('attribute_value_product_variant.attribute_value_id');

        $attributeValues = AttributeValue::with('attribute')
            ->whereIn('id', $attributeValueIds)
            ->get();

        $attributesMap = [];
        foreach ($attributeValues as $attrValue) {
            $attr = $attrValue->attribute;
            if (!$attr) continue;

            if (!isset($attributesMap[$attr->id])) {
                $attributesMap[$attr->id] = [
                    'id' => $attr->id,
                    'name' => $attr->name,
                    'slug' => $attr->slug,
                    'style' => $attr->style,
                    'attribute_values' => [],
                ];
            }

            $attributesMap[$attr->id]['attribute_values'][] = [
                'id' => $attrValue->id,
                'attribute_id' => $attrValue->attribute_id,
                'value' => $attrValue->value,
                'hex_color' => $attrValue->color_code,
            ];
        }

        return array_values($attributesMap);
    }
}
