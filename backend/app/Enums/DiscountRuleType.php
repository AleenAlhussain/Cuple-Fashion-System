<?php

namespace App\Enums;

enum DiscountRuleType: string
{
    case PRODUCT = 'product';
    case CART = 'cart';
    case BULK = 'bulk';
    case BUNDLE = 'bundle';
    case BOGO = 'bogo';
    case BXGX = 'bxgx';

    public function label(): string
    {
        return match($this) {
            self::PRODUCT => 'Product Discount',
            self::CART => 'Cart Discount',
            self::BULK => 'Bulk Discount',
            self::BUNDLE => 'Bundle/Set Discount',
            self::BOGO => 'Buy X Get Y',
            self::BXGX => 'Buy X Get X (Same Product)',
        };
    }

    public function description(): string
    {
        return match($this) {
            self::PRODUCT => 'Discount on specific products',
            self::CART => 'Discount on entire cart when conditions are met',
            self::BULK => 'Tiered discount based on quantity',
            self::BUNDLE => 'Fixed price for a set of items',
            self::BOGO => 'Buy X items, Get Y different items free/discounted',
            self::BXGX => 'Buy X items, Get X items free from the same product pool',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
