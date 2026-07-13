<?php

namespace App\Http\Resources;

use App\Enums\ConditionType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiscountRuleConditionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // Handle both string and enum values for type (DB column is 'type', API uses 'condition_type')
        $conditionType = $this->type;
        $conditionTypeValue = $conditionType instanceof ConditionType ? $conditionType->value : $conditionType;
        $conditionTypeLabel = $conditionType instanceof ConditionType ? $conditionType->label() : ucfirst(str_replace('_', ' ', $conditionTypeValue ?? ''));

        // Map DB operators to API format
        $operatorMap = [
            '>=' => 'gte',
            '<=' => 'lte',
            '==' => 'eq',
            '!=' => 'neq',
            '>' => 'gt',
            '<' => 'lt',
            'in' => 'in',
            'not_in' => 'not_in',
        ];
        $operator = $operatorMap[$this->operator] ?? $this->operator;

        return [
            'id' => $this->id,
            'condition_type' => $conditionTypeValue,
            'condition_type_label' => $conditionTypeLabel,
            'operator' => $operator,
            'value' => $this->value,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
