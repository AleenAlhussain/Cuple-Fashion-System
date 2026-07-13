<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountRuleFilter extends Model
{
    use HasFactory;
    protected $fillable = [
        'discount_rule_id',
        'target',
        'filter_type',
        'filter_values',
        'secondary_type',
        'secondary_values',
        'is_exclude',
        'variant_ids',
        'promo_group_ids',
    ];

    protected $casts = [
        'filter_values' => 'array',
        'secondary_values' => 'array',
        'variant_ids' => 'array',
        'promo_group_ids' => 'array',
        'is_exclude' => 'boolean',
    ];

    /**
     * Get the discount rule this filter belongs to.
     */
    public function discountRule(): BelongsTo
    {
        return $this->belongsTo(DiscountRule::class);
    }

    /**
     * Check if a cart item matches this filter.
     */
    public function matches(array $cartItem): bool
    {
        // If filter_values is empty, consider it as "match all"
        if (empty($this->filter_values)) {
            return !$this->is_exclude; // If include filter with no values = match all; exclude with no values = exclude nothing
        }

        // Handle combined filters (sku_category, sku_tag)
        if (in_array($this->filter_type, ['sku_category', 'sku_tag'])) {
            return $this->matchesCombinedFilter($cartItem);
        }

        $matched = match($this->filter_type) {
            'all' => true, // 'all' filter matches all products
            'variant_sku', 'sku' => $this->matchesSku($cartItem['variant_sku'] ?? ''),
            'variant_id' => $this->matchesId($cartItem['variant_id'] ?? 0),
            'product_id', 'product' => $this->matchesId($cartItem['product_id'] ?? 0),
            'category' => $this->matchesCategories($cartItem['category_ids'] ?? []),
            'tag' => $this->matchesTags($cartItem['tag_ids'] ?? []),
            'attribute' => $this->matchesAttributes($cartItem['attributes'] ?? []),
            'brand' => $this->matchesBrand($cartItem['brand_id'] ?? 0),
            'promo_group' => $this->matchesPromoGroups($cartItem['promo_group_ids'] ?? []),
            default => false,
        };

        // Return whether item matches filter criteria
        // Note: FilterMatcher handles the exclude logic (items matching exclude filters get filtered out)
        return $matched;
    }

    /**
     * Check if a cart item matches a combined filter (SKU + Category or SKU + Tag).
     * Both the SKU AND the secondary condition must match.
     */
    private function matchesCombinedFilter(array $cartItem): bool
    {
        // First check if SKU matches
        $skuMatched = $this->matchesSku($cartItem['variant_sku'] ?? '');

        if (!$skuMatched) {
            return false;
        }

        // If no secondary values, just return SKU match result
        if (empty($this->secondary_values)) {
            return true;
        }

        // Check secondary condition
        return match($this->filter_type) {
            'sku_category' => $this->matchesCategoriesSecondary($cartItem['category_ids'] ?? []),
            'sku_tag' => $this->matchesTagsSecondary($cartItem['tag_ids'] ?? []),
            default => true,
        };
    }

    /**
     * Check if cart item categories match secondary filter values.
     */
    private function matchesCategoriesSecondary(array $categoryIds): bool
    {
        if (empty($categoryIds) || empty($this->secondary_values)) {
            return false;
        }

        $categoryIds = array_map('intval', $categoryIds);
        $filterCategories = array_map('intval', $this->secondary_values);

        return !empty(array_intersect($categoryIds, $filterCategories));
    }

    /**
     * Check if cart item tags match secondary filter values.
     */
    private function matchesTagsSecondary(array $tagIds): bool
    {
        if (empty($tagIds) || empty($this->secondary_values)) {
            return false;
        }

        $tagIds = array_map('intval', $tagIds);
        $filterTags = array_map('intval', $this->secondary_values);

        return !empty(array_intersect($tagIds, $filterTags));
    }

    /**
     * Check if SKU matches filter values (case-insensitive).
     */
    private function matchesSku(string $sku): bool
    {
        if (empty($sku) || empty($this->filter_values)) {
            return false;
        }

        $sku = strtolower(trim($sku));
        $filterSkus = array_map(fn($v) => strtolower(trim((string) $v)), $this->filter_values);

        return in_array($sku, $filterSkus, true);
    }

    /**
     * Check if ID matches filter values (type-safe comparison).
     */
    private function matchesId(int|string $id): bool
    {
        if (empty($this->filter_values)) {
            return false;
        }

        $id = (int) $id;
        $filterIds = array_map('intval', $this->filter_values);

        return in_array($id, $filterIds, true);
    }

    /**
     * Check if cart item categories match filter values.
     */
    private function matchesCategories(array $categoryIds): bool
    {
        if (empty($categoryIds) || empty($this->filter_values)) {
            return false;
        }

        // Convert both to integers for proper comparison
        $categoryIds = array_map('intval', $categoryIds);
        $filterCategories = array_map('intval', $this->filter_values);

        return !empty(array_intersect($categoryIds, $filterCategories));
    }

    /**
     * Check if cart item tags match filter values.
     */
    private function matchesTags(array $tagIds): bool
    {
        if (empty($tagIds) || empty($this->filter_values)) {
            return false;
        }

        // Convert both to integers for proper comparison
        $tagIds = array_map('intval', $tagIds);
        $filterTags = array_map('intval', $this->filter_values);

        return !empty(array_intersect($tagIds, $filterTags));
    }

    /**
     * Check if cart item brand matches filter values.
     */
    private function matchesBrand(int|string $brandId): bool
    {
        if (empty($this->filter_values)) {
            return false;
        }

        $brandId = (int) $brandId;
        $filterBrands = array_map('intval', $this->filter_values);

        return in_array($brandId, $filterBrands, true);
    }

    /**
     * Check if cart item promo groups match filter values.
     */
    private function matchesPromoGroups(array $promoGroupIds): bool
    {
        // Use promo_group_ids column if available, otherwise fallback to filter_values
        $filterPromoGroups = $this->promo_group_ids ?? $this->filter_values ?? [];

        if (empty($promoGroupIds) || empty($filterPromoGroups)) {
            return false;
        }

        // Convert both to integers for proper comparison
        $promoGroupIds = array_map('intval', $promoGroupIds);
        $filterPromoGroups = array_map('intval', $filterPromoGroups);

        return !empty(array_intersect($promoGroupIds, $filterPromoGroups));
    }

    /**
     * Check if cart item attributes match filter values.
     * Filter values format: ["color:Red", "size:M"]
     * Matching is case-insensitive for both attribute name and value.
     */
    private function matchesAttributes(array $attributes): bool
    {
        if (empty($attributes) || empty($this->filter_values)) {
            return false;
        }

        // Normalize attribute keys to lowercase
        $normalizedAttributes = [];
        foreach ($attributes as $key => $value) {
            $normalizedAttributes[strtolower(trim($key))] = strtolower(trim((string) $value));
        }

        foreach ($this->filter_values as $filterValue) {
            $parts = explode(':', (string) $filterValue, 2);
            if (count($parts) !== 2) {
                continue;
            }

            [$attrName, $attrValue] = $parts;
            $attrName = strtolower(trim($attrName));
            $attrValue = strtolower(trim($attrValue));

            if (isset($normalizedAttributes[$attrName]) && $normalizedAttributes[$attrName] === $attrValue) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if this filter is for buy items (BOGO).
     */
    public function isBuyFilter(): bool
    {
        return in_array($this->target, ['buy', 'both']);
    }

    /**
     * Check if this filter is for get items (BOGO).
     */
    public function isGetFilter(): bool
    {
        return in_array($this->target, ['get', 'both']);
    }

    /**
     * Get a human-readable description of this filter.
     */
    public function getDescriptionAttribute(): string
    {
        $action = $this->is_exclude ? 'Exclude' : 'Include';
        $type = ucfirst(str_replace('_', ' ', $this->filter_type));
        $values = implode(', ', array_slice($this->filter_values, 0, 3));

        if (count($this->filter_values) > 3) {
            $values .= ' (+' . (count($this->filter_values) - 3) . ' more)';
        }

        return "{$action} {$type}: {$values}";
    }
}
