<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class DiscountRule extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Stacking type constants
     */
    const STACK_EXCLUSIVE = 'exclusive';
    const STACK_WITH_BOGO = 'stackable_with_bogo';
    const STACK_WITH_PRODUCT = 'stackable_with_product';
    const STACK_ALL = 'stackable_all';

    /**
     * Type weights for priority resolution (higher = processed first within same priority)
     */
    const TYPE_WEIGHTS = [
        'product' => 100,
        'bulk' => 90,
        'bundle' => 85,
        'bogo' => 80,
        'bxgx' => 80,
        'cart' => 50,
        'shipping' => 10,
    ];

    protected $appends = ['discount_display', 'current_usage'];

    protected $fillable = [
        'name',
        'name_ar',
        'internal_code',
        'description',
        'description_ar',
        'rule_type',
        'discount_type',
        'discount_value',
        'is_active',
        'priority',
        'stop_other_rules',
        'stacking_group',
        'is_stackable',
        'max_discount_amount',
        'max_affected_items',
        'max_applications',
        'min_qty',
        'is_recursive',
        'recursive_step',
        'selection_strategy',
        'condition_match_type',
        'count_quantities_by',
        'timezone',
        'usage_limit_per_user',
        'usage_limit_total',
        'offer_message',
        'offer_message_ar',
        'starts_at',
        'ends_at',
        'buy_qty',
        'get_qty',
        'max_free_qty_per_order',
        'max_applications_per_order',
        'bundle_qty',
        'bundle_price',
        // Promotion Message fields
        'promotion_subtotal_from',
        'promotion_subtotal_source',
        'promotion_message_template',
        'promotion_message_template_ar',
        'show_rule_preview',
        'min_cart_total',
        'max_cart_total',
        // Discount Bar fields
        'show_discount_bar',
        'bar_background_color',
        'bar_text_color',
        'bar_title',
        'bar_title_ar',
        'bar_content',
        'bar_content_ar',
        'bar_position',
        'bar_style',
        // SKU-based targeting fields
        'target_level',
        'stacking_type',
        'type_weight',
        'applies_to_shipping',
        'conflict_group',
        // Promo code fields
        'requires_promo_code',
        'promo_code',
        'show_as_coupon',
        'quantity_count_method',
        'filter_conditions',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'show_discount_bar' => 'boolean',
        'stop_other_rules' => 'boolean',
        'is_stackable' => 'boolean',
        'is_recursive' => 'boolean',
        'discount_value' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
        'bundle_price' => 'decimal:2',
        'min_cart_total' => 'decimal:2',
        'max_cart_total' => 'decimal:2',
        'promotion_subtotal_from' => 'decimal:2',
        'priority' => 'integer',
        'max_affected_items' => 'integer',
        'max_applications' => 'integer',
        'max_applications_per_order' => 'integer',
        'min_qty' => 'integer',
        'recursive_step' => 'integer',
        'usage_limit_per_user' => 'integer',
        'usage_limit_total' => 'integer',
        'buy_qty' => 'integer',
        'get_qty' => 'integer',
        'max_free_qty_per_order' => 'integer',
        'bundle_qty' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'rule_type' => \App\Enums\DiscountRuleType::class,
        'discount_type' => \App\Enums\DiscountType::class,
        'selection_strategy' => \App\Enums\SelectionStrategy::class,
        'applies_to_shipping' => 'boolean',
        'type_weight' => 'integer',
        'requires_promo_code' => 'boolean',
        'show_as_coupon' => 'boolean',
        'filter_conditions' => 'array',
    ];

    /**
     * Get the conditions for this rule.
     */
    public function conditions(): HasMany
    {
        return $this->hasMany(DiscountRuleCondition::class);
    }

    /**
     * Get the filters for this rule.
     */
    public function filters(): HasMany
    {
        return $this->hasMany(DiscountRuleFilter::class);
    }

    public function getShowRulePreviewAttribute($value): bool
    {
        return $value === null ? true : (bool) $value;
    }

    /**
     * Get the ranges for this rule (for Bulk/BOGO).
     */
    public function ranges(): HasMany
    {
        return $this->hasMany(DiscountRuleRange::class)->orderBy('min_qty');
    }

    /**
     * Get the schedules for this rule.
     */
    public function schedules(): HasMany
    {
        return $this->hasMany(DiscountRuleSchedule::class);
    }

    /**
     * Get the usage records for this rule.
     */
    public function usages(): HasMany
    {
        return $this->hasMany(DiscountRuleUsage::class);
    }

    /**
     * Get the promo groups for this rule.
     */
    public function promoGroups(): BelongsToMany
    {
        return $this->belongsToMany(PromoGroup::class, 'discount_rule_promo_group')
            ->withPivot('target')
            ->withTimestamps();
    }

    // =========================================================================
    // STACKING & PRIORITY
    // =========================================================================

    /**
     * Get type weight for priority resolution
     */
    public function getTypeWeight(): int
    {
        $type = $this->getRuleTypeValue();
        return self::TYPE_WEIGHTS[$type] ?? 0;
    }

    /**
     * Get the rule type as a string value
     */
    public function getRuleTypeValue(): string
    {
        return $this->rule_type instanceof \BackedEnum
            ? $this->rule_type->value
            : (string) $this->rule_type;
    }

    /**
     * Check if this rule can stack with another rule
     */
    public function canStackWith(DiscountRule $other): bool
    {
        // Same rule cannot stack with itself
        if ($this->id === $other->id) {
            return false;
        }

        // Check conflict groups - rules in same group cannot stack
        if ($this->conflict_group && $this->conflict_group === $other->conflict_group) {
            return false;
        }

        $thisType = $this->getRuleTypeValue();
        $otherType = $other->getRuleTypeValue();

        // Free shipping always stacks with everything
        if ($thisType === 'shipping' || $otherType === 'shipping') {
            return true;
        }

        // Product Adjustment + BOGO/BXGX can stack (special exception)
        if (($thisType === 'product' && in_array($otherType, ['bogo', 'bxgx'])) ||
            ($otherType === 'product' && in_array($thisType, ['bogo', 'bxgx']))) {
            return true;
        }

        // Check explicit stacking configuration
        $thisStacking = $this->stacking_type ?? self::STACK_EXCLUSIVE;
        $otherStacking = $other->stacking_type ?? self::STACK_EXCLUSIVE;

        // Both must be stackable_all to stack
        if ($thisStacking === self::STACK_ALL && $otherStacking === self::STACK_ALL) {
            return true;
        }

        // All other combinations are exclusive by default
        return false;
    }

    /**
     * Check if this is a line-level (SKU) discount
     */
    public function isLineLevel(): bool
    {
        $type = $this->getRuleTypeValue();
        return in_array($type, ['product', 'bulk', 'bundle', 'bogo', 'bxgx']);
    }

    /**
     * Check if this is a cart-level discount
     */
    public function isCartLevel(): bool
    {
        return $this->getRuleTypeValue() === 'cart';
    }

    /**
     * Check if this is a shipping discount
     */
    public function isShippingDiscount(): bool
    {
        return $this->getRuleTypeValue() === 'shipping' || $this->applies_to_shipping;
    }

    /**
     * Boot method to set type weight automatically
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($rule) {
            // Auto-calculate type weight if not set
            if (!$rule->type_weight) {
                $rule->type_weight = $rule->getTypeWeight();
            }
        });
    }

    // =========================================================================
    // SCOPES
    // =========================================================================

    /**
     * Scope: Only active rules.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Order by priority (highest first).
     */
    public function scopeByPriority($query)
    {
        return $query->orderBy('priority', 'desc');
    }

    /**
     * Scope: Filter by rule type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('rule_type', $type);
    }

    /**
     * Scope: Filter by stacking group.
     */
    public function scopeInStackingGroup($query, string $group)
    {
        return $query->where('stacking_group', $group);
    }

    /**
     * Scope: With all relationships for calculation.
     */
    public function scopeWithAllRelations($query)
    {
        return $query->with(['conditions', 'filters', 'ranges', 'schedules']);
    }

    // =========================================================================
    // TYPE CHECKS
    // =========================================================================

    /**
     * Check if this is a product discount rule.
     */
    public function isProduct(): bool
    {
        $type = $this->rule_type instanceof \App\Enums\DiscountRuleType
            ? $this->rule_type->value
            : $this->rule_type;
        return $type === 'product';
    }

    /**
     * Check if this is a cart discount rule.
     */
    public function isCart(): bool
    {
        $type = $this->rule_type instanceof \App\Enums\DiscountRuleType
            ? $this->rule_type->value
            : $this->rule_type;
        return $type === 'cart';
    }

    /**
     * Check if this is a BOGO rule.
     */
    public function isBogo(): bool
    {
        $type = $this->rule_type instanceof \App\Enums\DiscountRuleType
            ? $this->rule_type->value
            : $this->rule_type;
        return $type === 'bogo';
    }

    /**
     * Check if this is a bulk rule.
     */
    public function isBulk(): bool
    {
        $type = $this->rule_type instanceof \App\Enums\DiscountRuleType
            ? $this->rule_type->value
            : $this->rule_type;
        return $type === 'bulk';
    }

    /**
     * Check if this is a bundle rule.
     */
    public function isBundle(): bool
    {
        $type = $this->rule_type instanceof \App\Enums\DiscountRuleType
            ? $this->rule_type->value
            : $this->rule_type;
        return $type === 'bundle';
    }

    /**
     * Check if this is a BXGX (Buy X Get X) rule.
     * BXGX is a special BOGO where buy and get targets are the same.
     */
    public function isBxgx(): bool
    {
        $type = $this->rule_type instanceof \App\Enums\DiscountRuleType
            ? $this->rule_type->value
            : $this->rule_type;
        return $type === 'bxgx';
    }

    /**
     * Check if this rule has a promotion message configured.
     */
    public function hasPromotionMessage(): bool
    {
        return !empty($this->promotion_message_template)
            && $this->promotion_subtotal_from !== null;
    }

    // =========================================================================
    // FILTER HELPERS
    // =========================================================================

    /**
     * Get buy filters (for BOGO rules).
     * Ensures filters are loaded to prevent N+1 issues.
     */
    public function getBuyFilters(): Collection
    {
        if (!$this->relationLoaded('filters')) {
            $this->load('filters');
        }

        return $this->filters->filter(fn($f) => $f->isBuyFilter());
    }

    /**
     * Get get filters (for BOGO rules).
     * Ensures filters are loaded to prevent N+1 issues.
     */
    public function getGetFilters(): Collection
    {
        if (!$this->relationLoaded('filters')) {
            $this->load('filters');
        }

        return $this->filters->filter(fn($f) => $f->isGetFilter());
    }

    /**
     * Get all include filters (non-exclude).
     */
    public function getIncludeFilters(): Collection
    {
        if (!$this->relationLoaded('filters')) {
            $this->load('filters');
        }

        return $this->filters->filter(fn($f) => !$f->is_exclude);
    }

    /**
     * Get all exclude filters.
     */
    public function getExcludeFilters(): Collection
    {
        if (!$this->relationLoaded('filters')) {
            $this->load('filters');
        }

        return $this->filters->filter(fn($f) => $f->is_exclude);
    }

    // =========================================================================
    // USAGE TRACKING
    // =========================================================================

    /**
     * Get total usage count.
     * Uses cached count if available.
     */
    public function getTotalUsageCount(): int
    {
        // Use usages_count if loaded via withCount
        if (isset($this->attributes['usages_count'])) {
            return (int) $this->attributes['usages_count'];
        }

        return $this->usages()->count();
    }

    /**
     * Get usage count for a specific user.
     */
    public function getUserUsageCount(?int $userId): int
    {
        if (!$userId) {
            return 0;
        }

        return $this->usages()->where('user_id', $userId)->count();
    }

    /**
     * Check if the total usage limit has been reached.
     */
    public function hasTotalUsageLimitReached(): bool
    {
        if ($this->usage_limit_total === null) {
            return false;
        }

        return $this->getTotalUsageCount() >= $this->usage_limit_total;
    }

    /**
     * Check if the per-user usage limit has been reached.
     */
    public function hasUserUsageLimitReached(?int $userId): bool
    {
        if ($this->usage_limit_per_user === null || !$userId) {
            return false;
        }

        return $this->getUserUsageCount($userId) >= $this->usage_limit_per_user;
    }

    /**
     * Check if any usage limit has been reached.
     */
    public function hasUsageLimitReached(?int $userId = null): bool
    {
        if ($this->hasTotalUsageLimitReached()) {
            return true;
        }

        if ($this->hasUserUsageLimitReached($userId)) {
            return true;
        }

        return false;
    }

    /**
     * Get remaining uses for total limit.
     */
    public function getRemainingTotalUses(): ?int
    {
        if ($this->usage_limit_total === null) {
            return null; // Unlimited
        }

        return max(0, $this->usage_limit_total - $this->getTotalUsageCount());
    }

    /**
     * Get remaining uses for a specific user.
     */
    public function getRemainingUserUses(?int $userId): ?int
    {
        if ($this->usage_limit_per_user === null || !$userId) {
            return null; // Unlimited
        }

        return max(0, $this->usage_limit_per_user - $this->getUserUsageCount($userId));
    }

    // =========================================================================
    // SCHEDULE & ACTIVATION
    // =========================================================================

    /**
     * Check if this rule is currently active based on status and schedules.
     */
    public function isCurrentlyActive(?Carbon $now = null): bool
    {
        $now = $now ?? Carbon::now();

        // Check basic active status
        if (!$this->is_active) {
            return false;
        }

        // If no schedules, rule is always active when is_active = true
        if (!$this->relationLoaded('schedules')) {
            $this->load('schedules');
        }

        if ($this->schedules->isEmpty()) {
            return true;
        }

        return $this->isWithinSchedule($now);
    }

    /**
     * Check if the current time is within the rule's schedule.
     */
    public function isWithinSchedule(Carbon $now): bool
    {
        // First, check the simple date range on the model itself (starts_at / ends_at)
        if ($this->starts_at !== null && $now->lt($this->starts_at)) {
            return false; // Not started yet
        }
        if ($this->ends_at !== null && $now->gt($this->ends_at)) {
            return false; // Already expired
        }

        if (!$this->relationLoaded('schedules')) {
            $this->load('schedules');
        }

        $timezone = $this->timezone ?? 'Asia/Dubai';

        // Check for blackouts - if in blackout, rule is NOT active
        $blackouts = $this->schedules->filter(fn($s) => $s->isBlackout());
        foreach ($blackouts as $blackout) {
            if ($blackout->isActiveAt($now, $timezone)) {
                return false; // In blackout period
            }
        }

        // Get non-blackout schedules
        $activeSchedules = $this->schedules->filter(fn($s) => !$s->isBlackout());

        // If no active schedules defined, rule is active (outside blackouts)
        if ($activeSchedules->isEmpty()) {
            return true;
        }

        // Check if ANY active schedule matches (date_range OR weekly_window)
        foreach ($activeSchedules as $schedule) {
            if ($schedule->isActiveAt($now, $timezone)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if this rule can be applied (active + within schedule + within usage limits).
     */
    public function canBeApplied(?int $userId = null, ?Carbon $now = null): bool
    {
        if (!$this->isCurrentlyActive($now)) {
            return false;
        }

        if ($this->hasUsageLimitReached($userId)) {
            return false;
        }

        return true;
    }

    // =========================================================================
    // CONDITION EVALUATION
    // =========================================================================

    /**
     * Evaluate all conditions against the given data.
     */
    public function evaluateConditions(array $data): bool
    {
        if (!$this->relationLoaded('conditions')) {
            $this->load('conditions');
        }

        // No conditions = always passes
        if ($this->conditions->isEmpty()) {
            return true;
        }

        $results = $this->conditions->map(fn($condition) => $condition->evaluate($data));

        return match($this->condition_match_type) {
            'match_all' => $results->every(fn($r) => $r === true),
            'match_any' => $results->contains(true),
            default => true,
        };
    }

    // =========================================================================
    // RANGE HELPERS
    // =========================================================================

    /**
     * Find the matching range for a given quantity.
     */
    public function findMatchingRange(int $quantity): ?DiscountRuleRange
    {
        if (!$this->relationLoaded('ranges')) {
            $this->load('ranges');
        }

        // Ranges are ordered by min_qty, find the best matching range
        // (highest min_qty that the quantity meets)
        return $this->ranges
            ->filter(fn($range) => $range->matchesQuantity($quantity))
            ->last(); // Get the range with highest min_qty that matches
    }

    // =========================================================================
    // PROMO CODE & FILTER CONDITIONS
    // =========================================================================

    /**
     * Check if the given promo code matches this rule's promo code (case-insensitive).
     */
    public function matchesPromoCode(?string $code): bool
    {
        if (!$this->requires_promo_code) {
            return true; // No promo code required
        }

        if (empty($code) || empty($this->promo_code)) {
            return false;
        }

        return strtoupper(trim($code)) === strtoupper(trim($this->promo_code));
    }

    /**
     * Evaluate filter-level conditions against eligible items.
     * Filter conditions check things like minimum eligible quantity or subtotal.
     */
    public function evaluateFilterConditions(array $eligibleItems): bool
    {
        $conditions = $this->filter_conditions;

        if (empty($conditions)) {
            return true; // No filter conditions = always passes
        }

        $eligibleQty = array_sum(array_map(fn($item) => $item->qty ?? $item['qty'] ?? 0, $eligibleItems));
        $eligibleSubtotal = array_sum(array_map(function ($item) {
            $qty = $item->qty ?? $item['qty'] ?? 0;
            $price = $item->price ?? $item['price'] ?? 0;
            return $qty * $price;
        }, $eligibleItems));

        foreach ($conditions as $condition) {
            $type = $condition['type'] ?? null;
            $operator = $condition['operator'] ?? '>=';
            $value = (float) ($condition['value'] ?? 0);

            $actual = match ($type) {
                'eligible_qty' => $eligibleQty,
                'eligible_subtotal' => $eligibleSubtotal,
                default => 0,
            };

            $passed = match ($operator) {
                '>=' => $actual >= $value,
                '<=' => $actual <= $value,
                '>' => $actual > $value,
                '<' => $actual < $value,
                '==' => $actual == $value,
                '!=' => $actual != $value,
                default => true,
            };

            if (!$passed) {
                return false;
            }
        }

        return true;
    }

    // =========================================================================
    // ACCESSORS
    // =========================================================================

    /**
     * Get the type label for display.
     */
    public function getTypeLabelAttribute(): string
    {
        if ($this->rule_type instanceof \App\Enums\DiscountRuleType) {
            return $this->rule_type->label();
        }
        return ucfirst($this->rule_type ?? '');
    }

    /**
     * Get the discount type label for display.
     */
    public function getDiscountTypeLabelAttribute(): string
    {
        if ($this->discount_type instanceof \App\Enums\DiscountType) {
            return $this->discount_type->label();
        }
        return ucfirst($this->discount_type ?? '');
    }

    /**
     * Get a display string for the discount (e.g., "20%" or "50 AED").
     */
    public function getDiscountDisplayAttribute(): string
    {
        $value = $this->discount_value ?? 0;
        $type = $this->discount_type instanceof \App\Enums\DiscountType
            ? $this->discount_type->value
            : $this->discount_type;

        return match($type) {
            'percentage' => "{$value}%",
            'fixed_amount', 'fixed_price' => "{$value} AED",
            default => (string) $value,
        };
    }

    /**
     * Get current usage count for display.
     */
    public function getCurrentUsageAttribute(): string
    {
        $count = $this->getTotalUsageCount();
        $limit = $this->usage_limit_total;

        return $limit ? "{$count}/{$limit}" : "{$count}";
    }
}
