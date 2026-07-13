<?php

namespace App\Services\OfferEngine\Checkers;

use App\Models\DiscountRule;
use App\Services\OfferEngine\DTOs\ContextDTO;
use Carbon\Carbon;

class ScheduleChecker
{
    /**
     * Check if a rule is within its active schedule.
     */
    public function isWithinSchedule(DiscountRule $rule, ContextDTO $context): bool
    {
        return $rule->isWithinSchedule($context->getCurrentTime());
    }

    /**
     * Check if a rule is currently in a blackout period.
     */
    public function isInBlackout(DiscountRule $rule, ContextDTO $context): bool
    {
        $now = $context->getCurrentTime();
        $timezone = $rule->timezone ?? $context->timezone;

        // Ensure schedules are loaded
        if (!$rule->relationLoaded('schedules')) {
            $rule->load('schedules');
        }

        $blackouts = $rule->schedules->filter(fn($s) => $s->isBlackout());

        foreach ($blackouts as $blackout) {
            if ($blackout->isActiveAt($now, $timezone)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the next activation time for a rule.
     */
    public function getNextActivationTime(DiscountRule $rule, Carbon $from): ?Carbon
    {
        if (!$rule->relationLoaded('schedules')) {
            $rule->load('schedules');
        }

        $dateRanges = $rule->schedules->filter(fn($s) => $s->type === 'date_range');

        foreach ($dateRanges as $schedule) {
            if ($schedule->start_date && $schedule->start_date->gt($from)) {
                return $schedule->start_date;
            }
        }

        return null;
    }

    /**
     * Get the expiration time for a rule.
     */
    public function getExpirationTime(DiscountRule $rule): ?Carbon
    {
        if (!$rule->relationLoaded('schedules')) {
            $rule->load('schedules');
        }

        $dateRanges = $rule->schedules->filter(fn($s) => $s->type === 'date_range');

        $latestEnd = null;
        foreach ($dateRanges as $schedule) {
            if ($schedule->end_date) {
                if (!$latestEnd || $schedule->end_date->gt($latestEnd)) {
                    $latestEnd = $schedule->end_date;
                }
            }
        }

        return $latestEnd;
    }
}
