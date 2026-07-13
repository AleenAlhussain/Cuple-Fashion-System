<?php

namespace App\Http\Resources;

use App\Enums\ScheduleType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiscountRuleScheduleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // Handle both string and enum values for schedule_type
        $scheduleType = $this->schedule_type;
        $scheduleTypeValue = $scheduleType instanceof ScheduleType ? $scheduleType->value : $scheduleType;
        $scheduleTypeLabel = $scheduleType instanceof ScheduleType ? $scheduleType->label() : ucfirst(str_replace('_', ' ', $scheduleTypeValue ?? ''));

        return [
            'id' => $this->id,
            'schedule_type' => $scheduleTypeValue,
            'schedule_type_label' => $scheduleTypeLabel,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'day_of_week' => $this->day_of_week,
            'day_of_week_name' => $this->getDayName(),
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * Get day name from day_of_week.
     */
    private function getDayName(): ?string
    {
        if ($this->day_of_week === null) {
            return null;
        }

        $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return $days[$this->day_of_week] ?? null;
    }
}
