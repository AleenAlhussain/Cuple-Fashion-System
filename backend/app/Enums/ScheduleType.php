<?php

namespace App\Enums;

enum ScheduleType: string
{
    case DATE_RANGE = 'date_range';
    case WEEKLY_WINDOW = 'weekly_window';
    case BLACKOUT = 'blackout';

    public function label(): string
    {
        return match($this) {
            self::DATE_RANGE => 'Date Range',
            self::WEEKLY_WINDOW => 'Weekly Window',
            self::BLACKOUT => 'Blackout Period',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
