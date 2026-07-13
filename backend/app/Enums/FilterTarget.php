<?php

namespace App\Enums;

enum FilterTarget: string
{
    case BUY = 'buy';
    case GET = 'get';
    case BOTH = 'both';

    public function label(): string
    {
        return match($this) {
            self::BUY => 'Buy Items',
            self::GET => 'Get Items (Free/Discounted)',
            self::BOTH => 'All Items',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
