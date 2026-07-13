<?php

namespace App\Http\Resources;

use App\Enums\FilterType;
use App\Enums\FilterTarget;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiscountRuleFilterResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // Handle both string and enum values for filter_type
        $filterType = $this->filter_type;
        $filterTypeValue = $filterType instanceof FilterType ? $filterType->value : $filterType;
        $filterTypeLabel = $filterType instanceof FilterType ? $filterType->label() : ucfirst(str_replace('_', ' ', $filterTypeValue ?? ''));

        // Handle both string and enum values for target
        $target = $this->target;
        $targetValue = $target instanceof FilterTarget ? $target->value : $target;
        $targetLabel = $target instanceof FilterTarget ? $target->label() : ucfirst($targetValue ?? 'Both');

        return [
            'id' => $this->id,
            'filter_type' => $filterTypeValue,
            'filter_type_label' => $filterTypeLabel,
            'filter_values' => $this->filter_values,
            'secondary_type' => $this->secondary_type,
            'secondary_values' => $this->secondary_values,
            'target' => $targetValue,
            'target_label' => $targetLabel,
            'is_exclude' => (bool) $this->is_exclude,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
