<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PromoGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'name_ar',
        'slug',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get variants (SKUs) in this promo group
     */
    public function variants(): BelongsToMany
    {
        return $this->belongsToMany(ProductVariant::class, 'promo_group_sku', 'promo_group_id', 'product_variant_id')
            ->withTimestamps();
    }

    /**
     * Get discount rules using this promo group
     */
    public function discountRules(): BelongsToMany
    {
        return $this->belongsToMany(DiscountRule::class, 'discount_rule_promo_group')
            ->withPivot('target')
            ->withTimestamps();
    }

    /**
     * Get SKU IDs in this group
     */
    public function getSkuIds(): array
    {
        return $this->variants()->pluck('product_variants.id')->toArray();
    }

    /**
     * Get SKU codes in this group
     */
    public function getSkuCodes(): array
    {
        return $this->variants()->pluck('sku')->toArray();
    }

    /**
     * Check if a variant ID is in this group
     */
    public function hasVariant(int $variantId): bool
    {
        return $this->variants()->where('product_variants.id', $variantId)->exists();
    }

    /**
     * Check if a SKU is in this group
     */
    public function hasSku(string $sku): bool
    {
        return $this->variants()->where('sku', $sku)->exists();
    }

    /**
     * Add variants to this group
     */
    public function addVariants(array $variantIds): void
    {
        $this->variants()->syncWithoutDetaching($variantIds);
    }

    /**
     * Remove variants from this group
     */
    public function removeVariants(array $variantIds): void
    {
        $this->variants()->detach($variantIds);
    }

    /**
     * Get count of variants in this group
     */
    public function getVariantCountAttribute(): int
    {
        return $this->variants()->count();
    }

    /**
     * Scope: Active promo groups
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Search by name
     */
    public function scopeSearch($query, ?string $search)
    {
        if (!$search) {
            return $query;
        }

        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('name_ar', 'like', "%{$search}%")
              ->orWhere('slug', 'like', "%{$search}%");
        });
    }
}
