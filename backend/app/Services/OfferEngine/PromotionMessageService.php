<?php

namespace App\Services\OfferEngine;

use App\Models\DiscountRule;
use Illuminate\Support\Facades\Log;

/**
 * PromotionMessageService - SIMPLIFIED VERSION
 *
 * Generates "spend more" / "add more" promotion messages for ALL discount types:
 * - Cart: "Spend 50 AED more and get 50 AED off!"
 * - BOGO: "Add 1 more item and get 1 FREE!"
 * - Bulk: "Buy 1 more and get 15% off!"
 * - Shipping: "Spend 50 AED more for FREE shipping!"
 */
class PromotionMessageService
{
    /**
     * Get promotion messages for current cart state
     *
     * @param array $cartItems Cart items array
     * @param float $cartSubtotal Total cart value
     * @param array $contextData Optional context (user_id, country, etc.)
     * @return array Array of promotion messages
     */
    public function getPromotionMessages(array $cartItems, float $cartSubtotal, array $contextData = []): array
    {
        Log::info('[PromotionMessageService] START', [
            'cartSubtotal' => $cartSubtotal,
            'cartItemsCount' => count($cartItems),
        ]);

        $messages = [];

        // Get all active rules directly - bypass complex checks
        $rules = DiscountRule::where('is_active', true)
            ->with(['conditions', 'ranges'])
            ->get();

        Log::info('[PromotionMessageService] Found active rules', [
            'count' => $rules->count(),
            'names' => $rules->pluck('name')->toArray(),
        ]);

        foreach ($rules as $rule) {
            $message = $this->processRule($rule, $cartItems, $cartSubtotal);
            if ($message) {
                $messages[] = $message;
                Log::info('[PromotionMessageService] Added message', [
                    'rule' => $rule->name,
                    'message' => $message['message'],
                ]);
            }
        }

        // Sort by progress (highest first - closest to unlocking)
        usort($messages, fn($a, $b) => ($b['progress_percent'] ?? 0) <=> ($a['progress_percent'] ?? 0));

        Log::info('[PromotionMessageService] END', [
            'messagesCount' => count($messages),
        ]);

        return $messages;
    }

    /**
     * Process a single rule and generate promotion message if applicable
     */
    private function processRule(DiscountRule $rule, array $cartItems, float $cartSubtotal): ?array
    {
        if ($rule->show_rule_preview === false) {
            return null;
        }

        // Get rule type as string
        $ruleType = $rule->rule_type;
        if ($ruleType instanceof \BackedEnum) {
            $ruleType = $ruleType->value;
        }
        $ruleType = (string) $ruleType;

        Log::info('[PromotionMessageService] Processing rule', [
            'id' => $rule->id,
            'name' => $rule->name,
            'type' => $ruleType,
            'min_cart_total' => $rule->min_cart_total,
        ]);

        return match ($ruleType) {
            'cart' => $this->processCartRule($rule, $cartSubtotal),
            'product' => $this->processProductRule($rule, $cartSubtotal),
            'bogo', 'bxgx' => $this->processBogoRule($rule, $cartItems),
            'bulk' => $this->processBulkRule($rule, $cartItems),
            'bundle' => $this->processBundleRule($rule, $cartItems),
            'shipping' => $this->processShippingRule($rule, $cartSubtotal),
            default => null,
        };
    }

    /**
     * Process CART discount rule
     * Shows: "Spend X more and get Y off!"
     */
    private function processCartRule(DiscountRule $rule, float $cartSubtotal): ?array
    {
        $minCartTotal = $this->extractMinCartTotal($rule);

        Log::info('[PromotionMessageService] Cart rule evaluation', [
            'rule' => $rule->name,
            'minCartTotal' => $minCartTotal,
            'cartSubtotal' => $cartSubtotal,
            'qualifies' => $cartSubtotal >= $minCartTotal,
        ]);

        if ($minCartTotal <= 0) {
            Log::info('[PromotionMessageService] Cart rule: No min_cart_total detected');
            return null;
        }

        // Already qualifies - no promotion message needed
        if ($cartSubtotal >= $minCartTotal) {
            Log::info('[PromotionMessageService] Cart rule: Already qualifies, no message needed');
            return null;
        }

        // Calculate difference
        $difference = $minCartTotal - $cartSubtotal;
        $progress = $minCartTotal > 0 ? round(($cartSubtotal / $minCartTotal) * 100) : 0;

        // Get discount description
        $discountText = $this->getDiscountText($rule);

        return [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'rule_type' => 'cart',
            'message' => "Spend " . number_format($difference, 2) . " AED more and get {$discountText}!",
            'message_ar' => "أنفق " . number_format($difference, 2) . " درهم إضافية واحصل على {$discountText}!",
            'difference_amount' => round($difference, 2),
            'current_subtotal' => round($cartSubtotal, 2),
            'required_subtotal' => round($minCartTotal, 2),
            'progress_percent' => min(100, max(0, $progress)),
            'icon' => '🛒',
            'discount_preview' => [
                'type' => $this->getDiscountTypeString($rule),
                'value' => $rule->discount_value ?? 0,
                'description' => $discountText,
            ],
        ];
    }

    /**
     * Process PRODUCT discount rule (if it has cart-based conditions)
     */
    private function processProductRule(DiscountRule $rule, float $cartSubtotal): ?array
    {
        $minCartTotal = $this->extractMinCartTotal($rule);

        if ($minCartTotal <= 0) {
            return null;
        }

        // Delegate to cart rule processing
        return $this->processCartRule($rule, $cartSubtotal);
    }

    /**
     * Process BOGO (Buy X Get Y) rule
     * Shows: "Add X more item(s) and get Y FREE!"
     */
    private function processBogoRule(DiscountRule $rule, array $cartItems): ?array
    {
        $totalQty = $this->getTotalQuantity($cartItems);
        $buyQty = $rule->buy_qty ?? 2;
        $getQty = $rule->get_qty ?? 1;
        $requiredQty = $buyQty + $getQty;

        Log::info('[PromotionMessageService] BOGO rule evaluation', [
            'rule' => $rule->name,
            'totalQty' => $totalQty,
            'buyQty' => $buyQty,
            'getQty' => $getQty,
            'requiredQty' => $requiredQty,
        ]);

        // Already qualifies
        if ($totalQty >= $requiredQty) {
            return null;
        }

        // Need at least 1 item to show message
        if ($totalQty < 1) {
            return null;
        }

        $itemsNeeded = $requiredQty - $totalQty;
        $progress = round(($totalQty / $requiredQty) * 100);
        $itemText = $itemsNeeded === 1 ? 'item' : 'items';

        return [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'rule_type' => 'bogo',
            'message' => "Add {$itemsNeeded} more {$itemText} and get {$getQty} FREE!",
            'message_ar' => "أضف {$itemsNeeded} منتج آخر واحصل على {$getQty} مجاناً!",
            'items_needed' => $itemsNeeded,
            'current_qty' => $totalQty,
            'required_qty' => $requiredQty,
            'progress_percent' => min(100, max(0, $progress)),
            'icon' => '🎁',
            'discount_preview' => [
                'type' => 'free_item',
                'value' => $getQty,
                'description' => "Get {$getQty} item(s) FREE",
            ],
        ];
    }

    /**
     * Process BULK discount rule
     * Shows: "Buy X more and get Y% off!"
     */
    private function processBulkRule(DiscountRule $rule, array $cartItems): ?array
    {
        $totalQty = $this->getTotalQuantity($cartItems);
        $minQty = $rule->min_qty ?? 3;

        // Check ranges for the first tier
        if ($rule->ranges && $rule->ranges->count() > 0) {
            $firstRange = $rule->ranges->first();
            $minQty = $firstRange->min_qty ?? $minQty;
        }

        // Already qualifies
        if ($totalQty >= $minQty) {
            return null;
        }

        // Need at least 1 item
        if ($totalQty < 1) {
            return null;
        }

        $itemsNeeded = $minQty - $totalQty;
        $progress = round(($totalQty / $minQty) * 100);
        $itemText = $itemsNeeded === 1 ? 'item' : 'items';
        $discountText = $this->getDiscountText($rule);

        return [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'rule_type' => 'bulk',
            'message' => "Buy {$itemsNeeded} more {$itemText} and get {$discountText}!",
            'message_ar' => "اشترِ {$itemsNeeded} إضافية واحصل على {$discountText}!",
            'items_needed' => $itemsNeeded,
            'current_qty' => $totalQty,
            'required_qty' => $minQty,
            'progress_percent' => min(100, max(0, $progress)),
            'icon' => '📦',
            'discount_preview' => [
                'type' => $this->getDiscountTypeString($rule),
                'value' => $rule->discount_value ?? 0,
                'description' => $discountText,
            ],
        ];
    }

    /**
     * Process BUNDLE discount rule
     */
    private function processBundleRule(DiscountRule $rule, array $cartItems): ?array
    {
        $totalQty = $this->getTotalQuantity($cartItems);
        $bundleQty = $rule->bundle_qty ?? 0;

        if ($bundleQty <= 0 || $totalQty >= $bundleQty || $totalQty < 1) {
            return null;
        }

        $itemsNeeded = $bundleQty - $totalQty;
        $progress = round(($totalQty / $bundleQty) * 100);
        $itemText = $itemsNeeded === 1 ? 'item' : 'items';
        $bundlePrice = $rule->bundle_price ?? 0;
        $priceText = $bundlePrice > 0 ? number_format($bundlePrice, 2) . " AED" : "special price";

        return [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'rule_type' => 'bundle',
            'message' => "Add {$itemsNeeded} more {$itemText} to get all for {$priceText}!",
            'message_ar' => "أضف {$itemsNeeded} منتج آخر للحصول على الكل بـ {$priceText}!",
            'items_needed' => $itemsNeeded,
            'current_qty' => $totalQty,
            'required_qty' => $bundleQty,
            'progress_percent' => min(100, max(0, $progress)),
            'icon' => '🎯',
        ];
    }

    /**
     * Process SHIPPING discount rule
     */
    private function processShippingRule(DiscountRule $rule, float $cartSubtotal): ?array
    {
        $minCartTotal = $this->extractMinCartTotal($rule);

        if ($minCartTotal <= 0 || $cartSubtotal >= $minCartTotal) {
            return null;
        }

        $difference = $minCartTotal - $cartSubtotal;
        $progress = round(($cartSubtotal / $minCartTotal) * 100);

        return [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'rule_type' => 'shipping',
            'message' => "Spend " . number_format($difference, 2) . " AED more for FREE shipping!",
            'message_ar' => "أنفق " . number_format($difference, 2) . " درهم إضافية للشحن المجاني!",
            'difference_amount' => round($difference, 2),
            'current_subtotal' => round($cartSubtotal, 2),
            'required_subtotal' => round($minCartTotal, 2),
            'progress_percent' => min(100, max(0, $progress)),
            'icon' => '🚚',
        ];
    }

    /**
     * Extract minimum cart total from multiple sources
     */
    private function extractMinCartTotal(DiscountRule $rule): float
    {
        // Method 1: Direct field
        if (!empty($rule->min_cart_total) && $rule->min_cart_total > 0) {
            Log::debug('[PromotionMessageService] extractMinCartTotal: Using min_cart_total field', [
                'value' => $rule->min_cart_total,
            ]);
            return (float) $rule->min_cart_total;
        }

        // Method 2: From conditions
        if ($rule->conditions) {
            foreach ($rule->conditions as $condition) {
                if ($condition->type === 'cart_subtotal' && in_array($condition->operator, ['>=', '>'])) {
                    Log::debug('[PromotionMessageService] extractMinCartTotal: Using condition', [
                        'value' => $condition->value,
                    ]);
                    return (float) $condition->value;
                }
            }
        }

        // Method 3: Parse from name (e.g., "50 AED Off Orders Over 300")
        if (preg_match('/over\s*(\d+(?:\.\d+)?)/i', $rule->name, $matches)) {
            Log::debug('[PromotionMessageService] extractMinCartTotal: Parsed from name', [
                'value' => $matches[1],
            ]);
            return (float) $matches[1];
        }

        return 0;
    }

    /**
     * Get total quantity from cart items
     */
    private function getTotalQuantity(array $cartItems): int
    {
        $total = 0;
        foreach ($cartItems as $item) {
            if (is_object($item)) {
                $total += $item->qty ?? $item->quantity ?? 1;
            } else {
                $total += $item['qty'] ?? $item['quantity'] ?? 1;
            }
        }
        return $total;
    }

    /**
     * Get discount text for display
     */
    private function getDiscountText(DiscountRule $rule): string
    {
        $value = $rule->discount_value ?? 0;
        $discountType = $rule->discount_type;

        if ($discountType instanceof \BackedEnum) {
            $discountType = $discountType->value;
        }

        return match ((string) $discountType) {
            'percentage' => "{$value}% off",
            'fixed_amount' => "{$value} AED off",
            'fixed_price' => "Fixed price {$value} AED",
            default => "{$value} off",
        };
    }

    /**
     * Get discount type as string
     */
    private function getDiscountTypeString(DiscountRule $rule): string
    {
        $discountType = $rule->discount_type;
        if ($discountType instanceof \BackedEnum) {
            return $discountType->value;
        }
        return (string) $discountType;
    }
}
