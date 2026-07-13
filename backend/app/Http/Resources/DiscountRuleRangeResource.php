<?php

namespace App\Http\Resources;

use App\Enums\DiscountType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiscountRuleRangeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // Handle both string and enum values for discount_type
        $discountType = $this->discount_type;
        $discountTypeValue = $discountType instanceof DiscountType ? $discountType->value : $discountType;
        $discountTypeLabel = $discountType instanceof DiscountType ? $discountType->label() : ucfirst(str_replace('_', ' ', $discountTypeValue ?? ''));

        return [
            'id' => $this->id,
            'min_qty' => (int) $this->min_qty,
            'max_qty' => $this->max_qty ? (int) $this->max_qty : null,
            'discount_type' => $discountTypeValue,
            'discount_type_label' => $discountTypeLabel,
            'discount_value' => (float) $this->discount_value,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
