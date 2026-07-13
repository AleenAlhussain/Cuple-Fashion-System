<?php

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Category extends Model
{
    protected $fillable = [
        'name',
        'name_ar',
        'slug',
        'description',
        'description_ar',
        'image',
        'banner_image',
        'parent_id',
        'sort_order',
        'is_active',
        'meta_title',
        'meta_description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
    ];

    protected $appends = ['image_url', 'banner_image_url', 'type', 'category_image', 'category_icon'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    public function subcategories(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'category_product');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeParents($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Categories visible on customer-facing storefront.
     * Hides internal default Uncategorized category.
     */
    public function scopeStorefrontVisible($query)
    {
        return $query
            ->where(function ($q) {
                $q->whereNull('is_default')->orWhere('is_default', false);
            })
            ->where(function ($q) {
                $q->whereNull('slug')->orWhere('slug', '!=', 'uncategorized');
            });
    }

    /**
     * Keep only categories that can actually surface products in storefront.
     * Uses direct active product assignment on the category itself.
     */
    public function scopeHasStorefrontProducts($query)
    {
        return $query->whereHas('products', fn($productQuery) => $productQuery->where('products.is_active', true));
    }

    /**
     * Keep categories that can surface products either directly
     * or through at least one direct child category.
     */
    public function scopeHasStorefrontProductsOrChildProducts($query)
    {
        return $query->where(function ($q) {
            $q->hasStorefrontProducts()
                ->orWhereHas('children', function ($childQuery) {
                    $childQuery
                        ->active()
                        ->storefrontVisible()
                        ->hasStorefrontProducts();
                });
        });
    }

    public function getImageUrlAttribute(): ?string
    {
        return MediaUrl::fromPath($this->image);
    }

    public function getBannerImageUrlAttribute(): ?string
    {
        return MediaUrl::fromPath($this->banner_image);
    }

    public function getTypeAttribute(): string
    {
        return 'product';
    }

    public function getCategoryImageAttribute(): ?array
    {
        if (!$this->image) {
            return null;
        }

        return [
            'id' => 'cat_img_' . $this->id,
            'original_url' => MediaUrl::fromPath($this->image),
            'name' => basename($this->image),
        ];
    }

    public function getCategoryIconAttribute(): ?array
    {
        if (!$this->image) {
            return null;
        }

        return [
            'id' => 'cat_icon_' . $this->id,
            'original_url' => MediaUrl::fromPath($this->image),
            'name' => basename($this->image),
        ];
    }
}
