<?php

namespace App\Enums;

enum SelectionStrategy: string
{
    case CHEAPEST_FIRST = 'cheapest_first';
    case MOST_EXPENSIVE_FIRST = 'most_expensive_first';

    public function label(): string
    {
        return match($this) {
            self::CHEAPEST_FIRST => 'Cheapest First',
            self::MOST_EXPENSIVE_FIRST => 'Most Expensive First',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
