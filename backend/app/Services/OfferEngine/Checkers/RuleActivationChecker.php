<?php

namespace App\Services\OfferEngine\Checkers;

use App\Models\DiscountRule;
use App\Services\OfferEngine\DTOs\ContextDTO;

class RuleActivationChecker
{
    public function __construct(
        private readonly ScheduleChecker $scheduleChecker
    ) {}

    /**
     * Check if a rule is active and can be applied.
     */
    public function isActive(DiscountRule $rule, ContextDTO $context): bool
    {
        // Check basic status
        if (!$rule->is_active) {
            return false;
        }

        // Check promo code requirement
        if ($rule->requires_promo_code && !$rule->matchesPromoCode($context->promo_code)) {
            return false;
        }

        // Check schedule
        if (!$this->scheduleChecker->isWithinSchedule($rule, $context)) {
            return false;
        }

        // Check usage limits
        if ($rule->hasUsageLimitReached($context->user_id)) {
            return false;
        }

        return true;
    }

    /**
     * Get the reason why a rule is not active.
     */
    public function getInactiveReason(DiscountRule $rule, ContextDTO $context): ?string
    {
        if (!$rule->is_active) {
            return 'Rule is disabled';
        }

        if ($rule->requires_promo_code && !$rule->matchesPromoCode($context->promo_code)) {
            return 'Promo code required or does not match';
        }

        if (!$this->scheduleChecker->isWithinSchedule($rule, $context)) {
            if ($this->scheduleChecker->isInBlackout($rule, $context)) {
                return 'Rule is in blackout period';
            }
            return 'Rule is outside scheduled time';
        }

        if ($rule->hasTotalUsageLimitReached()) {
            return 'Total usage limit reached';
        }

        if ($rule->hasUserUsageLimitReached($context->user_id)) {
            return 'Per-user usage limit reached';
        }

        return null;
    }

    /**
     * Filter a collection of rules to only active ones.
     */
    public function filterActiveRules(iterable $rules, ContextDTO $context): array
    {
        $activeRules = [];

        foreach ($rules as $rule) {
            if ($this->isActive($rule, $context)) {
                $activeRules[] = $rule;
            }
        }

        return $activeRules;
    }
}
