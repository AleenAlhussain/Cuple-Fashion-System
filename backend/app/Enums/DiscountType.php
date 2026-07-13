<?php

namespace App\Enums;

enum DiscountType: string
{
    case PERCENTAGE = 'percentage';
    case FIXED_AMOUNT = 'fixed_amount';
    case FIXED_PRICE = 'fixed_price';

    public function label(): string
    {
        return match($this) {
            self::PERCENTAGE => 'Percentage (%)',
            self::FIXED_AMOUNT => 'Fixed Amount',
            self::FIXED_PRICE => 'Fixed Price',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
