<?php

namespace App\Http\Resources;

use App\Enums\DiscountRuleType;
use App\Enums\DiscountType;
use App\Enums\SelectionStrategy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiscountRuleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // Handle both string and enum values for rule_type
        $ruleType = $this->rule_type;
        $ruleTypeValue = $ruleType instanceof DiscountRuleType ? $ruleType->value : $ruleType;
        $ruleTypeLabel = $ruleType instanceof DiscountRuleType ? $ruleType->label() : ucfirst(str_replace('_', ' ', $ruleTypeValue ?? ''));

        // Handle both string and enum values for discount_type
        $discountType = $this->discount_type;
        $discountTypeValue = $discountType instanceof DiscountType ? $discountType->value : $discountType;
        $discountTypeLabel = $discountType instanceof DiscountType ? $discountType->label() : ucfirst(str_replace('_', ' ', $discountTypeValue ?? ''));

        // Handle both string and enum values for selection_strategy
        $selectionStrategy = $this->selection_strategy;
        $selectionStrategyValue = $selectionStrategy instanceof SelectionStrategy ? $selectionStrategy->value : $selectionStrategy;
        $selectionStrategyLabel = $selectionStrategy instanceof SelectionStrategy ? $selectionStrategy->label() : ucfirst(str_replace('_', ' ', $selectionStrategyValue ?? ''));

        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_ar' => $this->name_ar,
            'internal_code' => $this->internal_code,
            'description' => $this->description,
            'description_ar' => $this->description_ar,
            'rule_type' => $ruleTypeValue,
            'rule_type_label' => $ruleTypeLabel,
            'discount_type' => $discountTypeValue,
            'discount_type_label' => $discountTypeLabel,
            'discount_value' => (float) $this->discount_value,
            'max_discount_amount' => $this->max_discount_amount ? (float) $this->max_discount_amount : null,
            'min_cart_total' => $this->min_cart_total ? (float) $this->min_cart_total : null,
            'max_cart_total' => $this->max_cart_total ? (float) $this->max_cart_total : null,
            'is_active' => (bool) $this->is_active,
            'priority' => (int) $this->priority,
            'is_stackable' => (bool) $this->is_stackable,
            'stacking_group' => $this->stacking_group,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'usage_limit_total' => $this->usage_limit_total,
            'usage_limit_per_user' => $this->usage_limit_per_user,
            'offer_message' => $this->offer_message,
            'offer_message_ar' => $this->offer_message_ar,

            // BOGO-specific
            'buy_qty' => $this->buy_qty,
            'get_qty' => $this->get_qty,
            'max_applications' => $this->max_applications,
            'selection_strategy' => $selectionStrategyValue,
            'selection_strategy_label' => $selectionStrategyLabel,

            // Bundle-specific
            'bundle_qty' => $this->bundle_qty,
            'bundle_price' => $this->bundle_price ? (float) $this->bundle_price : null,

            // Recursive
            'is_recursive' => (bool) $this->is_recursive,

            // BXGX-specific
            'recursive_step' => $this->recursive_step,
            'max_free_qty_per_order' => $this->max_free_qty_per_order,
            'max_applications_per_order' => $this->max_applications_per_order,

            // Promotion Message
            'promotion_subtotal_from' => $this->promotion_subtotal_from ? (float) $this->promotion_subtotal_from : null,
            'promotion_subtotal_source' => $this->promotion_subtotal_source,
            'promotion_message_template' => $this->promotion_message_template,
            'promotion_message_template_ar' => $this->promotion_message_template_ar,
            'show_rule_preview' => (bool) $this->show_rule_preview,

            // Discount Bar
            'show_discount_bar' => (bool) $this->show_discount_bar,
            'bar_background_color' => $this->bar_background_color,
            'bar_text_color' => $this->bar_text_color,
            'bar_title' => $this->bar_title,
            'bar_title_ar' => $this->bar_title_ar,
            'bar_content' => $this->bar_content,
            'bar_content_ar' => $this->bar_content_ar,
            'bar_position' => $this->bar_position,
            'bar_style' => $this->bar_style,

            // Promo code
            'requires_promo_code' => (bool) $this->requires_promo_code,
            'promo_code' => $this->promo_code,
            'show_as_coupon' => (bool) $this->show_as_coupon,
            'quantity_count_method' => $this->quantity_count_method,
            'filter_conditions' => $this->filter_conditions,

            // Related data
            'conditions' => DiscountRuleConditionResource::collection($this->whenLoaded('conditions')),
            'filters' => DiscountRuleFilterResource::collection($this->whenLoaded('filters')),
            'ranges' => DiscountRuleRangeResource::collection($this->whenLoaded('ranges')),
            'schedules' => DiscountRuleScheduleResource::collection($this->whenLoaded('schedules')),

            // Computed display values
            'discount_display' => $this->discount_display,
            'current_usage' => $this->current_usage,

            // Counts
            'usages_count' => $this->when(isset($this->usages_count), $this->usages_count),

            // Timestamps
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
