<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountRuleSchedule extends Model
{
    use HasFactory;
    protected $fillable = [
        'discount_rule_id',
        'type',
        'start_date',
        'end_date',
        'day_of_week',
        'start_time',
        'end_time',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'day_of_week' => 'integer',
    ];

    /**
     * Get the discount rule this schedule belongs to.
     */
    public function discountRule(): BelongsTo
    {
        return $this->belongsTo(DiscountRule::class);
    }

    /**
     * Check if this schedule is active at the given time.
     *
     * @param Carbon $now The current time (will be converted to rule's timezone)
     * @param string|null $timezone The timezone to use (from the parent rule)
     */
    public function isActiveAt(Carbon $now, ?string $timezone = null): bool
    {
        // Convert to the rule's timezone for accurate comparison
        $localNow = $this->convertToTimezone($now, $timezone);

        return match($this->type) {
            'date_range' => $this->isWithinDateRange($localNow),
            'weekly_window' => $this->isWithinWeeklyWindow($localNow),
            'blackout' => $this->isWithinBlackout($localNow),
            default => false,
        };
    }

    /**
     * Convert a Carbon instance to the specified timezone.
     */
    private function convertToTimezone(Carbon $datetime, ?string $timezone): Carbon
    {
        if (!$timezone) {
            return $datetime->copy();
        }

        try {
            return $datetime->copy()->setTimezone($timezone);
        } catch (\Exception $e) {
            // If timezone is invalid, use the original datetime
            return $datetime->copy();
        }
    }

    /**
     * Check if date is within date range.
     */
    private function isWithinDateRange(Carbon $now): bool
    {
        $date = $now->copy()->startOfDay();

        if ($this->start_date && $date->lt($this->start_date->startOfDay())) {
            return false;
        }

        if ($this->end_date && $date->gt($this->end_date->startOfDay())) {
            return false;
        }

        return true;
    }

    /**
     * Check if time is within weekly window.
     */
    private function isWithinWeeklyWindow(Carbon $now): bool
    {
        // Check day of week (0 = Sunday, 6 = Saturday)
        if ($this->day_of_week !== null && $now->dayOfWeek !== $this->day_of_week) {
            return false;
        }

        // Check time window if both start and end times are specified
        if ($this->start_time !== null && $this->end_time !== null) {
            return $this->isWithinTimeWindow($now);
        }

        // If only start_time is set, check if current time is after it
        if ($this->start_time !== null) {
            return $this->compareTime($now, $this->start_time) >= 0;
        }

        // If only end_time is set, check if current time is before it
        if ($this->end_time !== null) {
            return $this->compareTime($now, $this->end_time) <= 0;
        }

        return true;
    }

    /**
     * Check if current time is within the start and end time window.
     */
    private function isWithinTimeWindow(Carbon $now): bool
    {
        $currentSeconds = $this->timeToSeconds($now->format('H:i:s'));
        $startSeconds = $this->timeToSeconds($this->normalizeTime($this->start_time));
        $endSeconds = $this->timeToSeconds($this->normalizeTime($this->end_time));

        // Handle overnight windows (e.g., 22:00 to 06:00)
        if ($startSeconds > $endSeconds) {
            // We're in an overnight window
            return $currentSeconds >= $startSeconds || $currentSeconds <= $endSeconds;
        }

        return $currentSeconds >= $startSeconds && $currentSeconds <= $endSeconds;
    }

    /**
     * Compare current time with a time string.
     * Returns: -1 if current < time, 0 if equal, 1 if current > time
     */
    private function compareTime(Carbon $now, string $time): int
    {
        $currentSeconds = $this->timeToSeconds($now->format('H:i:s'));
        $compareSeconds = $this->timeToSeconds($this->normalizeTime($time));

        return $currentSeconds <=> $compareSeconds;
    }

    /**
     * Normalize time string to H:i:s format.
     * Handles cases like "9:00" -> "09:00:00"
     */
    private function normalizeTime(string $time): string
    {
        // Parse the time and reformat it
        $parts = explode(':', $time);

        $hours = str_pad($parts[0] ?? '00', 2, '0', STR_PAD_LEFT);
        $minutes = str_pad($parts[1] ?? '00', 2, '0', STR_PAD_LEFT);
        $seconds = str_pad($parts[2] ?? '00', 2, '0', STR_PAD_LEFT);

        return "{$hours}:{$minutes}:{$seconds}";
    }

    /**
     * Convert time string to seconds since midnight.
     */
    private function timeToSeconds(string $time): int
    {
        $parts = explode(':', $time);

        $hours = (int) ($parts[0] ?? 0);
        $minutes = (int) ($parts[1] ?? 0);
        $seconds = (int) ($parts[2] ?? 0);

        return ($hours * 3600) + ($minutes * 60) + $seconds;
    }

    /**
     * Check if date is within blackout period.
     */
    private function isWithinBlackout(Carbon $now): bool
    {
        // Check date range first
        if (!$this->isWithinDateRange($now)) {
            return false;
        }

        // If time window is specified, also check time
        if ($this->start_time !== null && $this->end_time !== null) {
            return $this->isWithinTimeWindow($now);
        }

        return true;
    }

    /**
     * Check if this is a blackout schedule.
     */
    public function isBlackout(): bool
    {
        return $this->type === 'blackout';
    }

    /**
     * Get the day name for display.
     */
    public function getDayNameAttribute(): ?string
    {
        if ($this->day_of_week === null) {
            return null;
        }

        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return $days[$this->day_of_week] ?? null;
    }
}
