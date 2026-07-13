<?php

namespace Database\Factories;

use App\Models\DiscountRule;
use App\Models\DiscountRuleSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DiscountRuleSchedule>
 */
class DiscountRuleScheduleFactory extends Factory
{
    protected $model = DiscountRuleSchedule::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'discount_rule_id' => DiscountRule::factory(),
            'type' => 'date_range',
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'day_of_week' => null,
            'start_time' => null,
            'end_time' => null,
        ];
    }

    /**
     * Date range schedule.
     */
    public function dateRange(?\DateTime $start = null, ?\DateTime $end = null): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'date_range',
            'start_date' => $start ?? now(),
            'end_date' => $end ?? now()->addMonth(),
        ]);
    }

    /**
     * Weekly window schedule.
     */
    public function weeklyWindow(int $dayOfWeek, ?string $startTime = null, ?string $endTime = null): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'weekly_window',
            'start_date' => null,
            'end_date' => null,
            'day_of_week' => $dayOfWeek,
            'start_time' => $startTime,
            'end_time' => $endTime,
        ]);
    }

    /**
     * Blackout period schedule.
     */
    public function blackout(\DateTime $start, \DateTime $end): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'blackout',
            'start_date' => $start,
            'end_date' => $end,
        ]);
    }

    /**
     * Weekend only (Saturday + Sunday).
     */
    public function weekendOnly(): static
    {
        return $this->weeklyWindow(0); // Sunday - would need multiple schedules for full weekend
    }

    /**
     * Friday sale window (common in UAE).
     */
    public function fridaySale(string $startTime = '09:00', string $endTime = '23:59'): static
    {
        return $this->weeklyWindow(5, $startTime, $endTime); // Friday = 5
    }

    /**
     * Happy hour window.
     */
    public function happyHour(string $startTime = '14:00', string $endTime = '18:00'): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'weekly_window',
            'start_date' => null,
            'end_date' => null,
            'day_of_week' => null, // Any day
            'start_time' => $startTime,
            'end_time' => $endTime,
        ]);
    }

    /**
     * Campaign period (e.g., Ramadan, Eid).
     */
    public function campaign(?string $name = null): static
    {
        // Example: 30 day campaign
        return $this->state(fn(array $attributes) => [
            'type' => 'date_range',
            'start_date' => now(),
            'end_date' => now()->addDays(30),
        ]);
    }

    /**
     * Expired schedule.
     */
    public function expired(): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'date_range',
            'start_date' => now()->subMonths(2),
            'end_date' => now()->subMonth(),
        ]);
    }

    /**
     * Future schedule.
     */
    public function future(): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'date_range',
            'start_date' => now()->addWeek(),
            'end_date' => now()->addMonth(),
        ]);
    }
}
