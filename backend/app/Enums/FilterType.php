<?php

namespace App\Enums;

enum FilterType: string
{
    case VARIANT_SKU = 'variant_sku';
    case VARIANT_ID = 'variant_id';
    case PRODUCT_ID = 'product_id';
    case CATEGORY = 'category';
    case TAG = 'tag';
    case ATTRIBUTE = 'attribute';
    case BRAND = 'brand';
    case PROMO_GROUP = 'promo_group';
    case SKU_CATEGORY = 'sku_category';
    case SKU_TAG = 'sku_tag';

    public function label(): string
    {
        return match($this) {
            self::VARIANT_SKU => 'Variant SKU',
            self::VARIANT_ID => 'Variant ID',
            self::PRODUCT_ID => 'Product ID',
            self::CATEGORY => 'Category',
            self::TAG => 'Tag',
            self::ATTRIBUTE => 'Attribute',
            self::BRAND => 'Brand',
            self::PROMO_GROUP => 'Promo Group',
            self::SKU_CATEGORY => 'SKU + Category',
            self::SKU_TAG => 'SKU + Tag',
        };
    }

    /**
     * Check if this filter type is a combined filter (requires secondary values).
     */
    public function isCombined(): bool
    {
        return in_array($this, [self::SKU_CATEGORY, self::SKU_TAG]);
    }

    /**
     * Get the secondary type for combined filters.
     */
    public function getSecondaryType(): ?string
    {
        return match($this) {
            self::SKU_CATEGORY => 'category',
            self::SKU_TAG => 'tag',
            default => null,
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
