<?php

namespace App\Enums;

enum ConditionType: string
{
    case CART_QTY = 'cart_qty';
    case CART_SUBTOTAL = 'cart_subtotal';
    case USER_ROLE = 'user_role';
    case COUNTRY = 'country';
    case USER_ID = 'user_id';
    case FIRST_ORDER = 'first_order';

    public function label(): string
    {
        return match($this) {
            self::CART_QTY => 'Cart Quantity',
            self::CART_SUBTOTAL => 'Cart Subtotal',
            self::USER_ROLE => 'User Role',
            self::COUNTRY => 'Country',
            self::USER_ID => 'Specific User',
            self::FIRST_ORDER => 'First Order',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
