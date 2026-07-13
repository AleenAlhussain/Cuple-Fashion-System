<?php

namespace App\Services\OfferEngine\Calculators;

use App\Models\DiscountRule;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use App\Services\OfferEngine\DTOs\ContextDTO;
use App\Services\OfferEngine\DTOs\DiscountResultDTO;

/**
 * BXGX (Buy X Get X) Discount Calculator
 *
 * Special case of BOGO where Buy and Get targets are the SAME variants.
 * Example: Buy 2 of Product A, Get 1 of Product A free (same product pool)
 */
class BxgxDiscountCalculator
{
    /**
     * Calculate BXGX discount
     *
     * @param DiscountRule $rule
     * @param array<CartItemDTO> $eligibleItems Items eligible for both buy AND get
     * @param ContextDTO $context
     * @return DiscountResultDTO
     */
    public function calculate(
        DiscountRule $rule,
        array $eligibleItems,
        ContextDTO $context
    ): DiscountResultDTO {
        $result = new DiscountResultDTO();

        if (empty($eligibleItems)) {
            return $result;
        }

        // Get rule parameters
        $buyQty = $rule->buy_qty ?? $rule->min_qty ?? 2;
        $freeQty = $rule->free_qty ?? $rule->get_qty ?? 1;
        $isRecursive = $rule->is_recursive ?? false;
        $recursiveStep = $rule->recursive_step ?? ($buyQty + $freeQty);
        $maxFreeQtyPerOrder = $rule->max_free_qty_per_order;
        $maxApplicationsPerOrder = $rule->max_applications_per_order;
        $selectionStrategy = $rule->selection_strategy ?? 'cheapest_first';
        // Handle both enum and string values
        if ($selectionStrategy instanceof \BackedEnum) {
            $selectionStrategy = $selectionStrategy->value;
        }
        $discountType = $rule->discount_type ?? 'percentage';
        // Handle both enum and string values
        if ($discountType instanceof \BackedEnum) {
            $discountType = $discountType->value;
        }
        $discountValue = $rule->discount_value ?? 100; // Default 100% = free

        // Calculate total eligible quantity
        $totalQty = $this->getTotalQuantity($eligibleItems);

        // BXGX requires buyQty + freeQty items minimum
        $minRequiredQty = $buyQty + $freeQty;
        if ($totalQty < $minRequiredQty) {
            \Log::info("[BxgxCalculator] Not enough items", [
                'totalQty' => $totalQty,
                'minRequired' => $minRequiredQty,
            ]);
            return $result;
        }

        // Calculate number of applications
        $applications = 1;
        if ($isRecursive) {
            // How many complete sets can we make?
            $applications = floor($totalQty / $recursiveStep);
        }

        // Apply max applications limit
        if ($maxApplicationsPerOrder !== null && $applications > $maxApplicationsPerOrder) {
            $applications = $maxApplicationsPerOrder;
        }

        // Calculate total free quantity
        $totalFreeQty = $applications * $freeQty;

        // Apply max free quantity limit
        if ($maxFreeQtyPerOrder !== null && $totalFreeQty > $maxFreeQtyPerOrder) {
            $totalFreeQty = $maxFreeQtyPerOrder;
        }

        // Sort items by price based on selection strategy
        $sortedItems = $this->sortItemsByStrategy($eligibleItems, $selectionStrategy);

        // Calculate discount amount
        $discountAmount = $this->calculateFreeItemsDiscount(
            $sortedItems,
            $totalFreeQty,
            $discountType,
            $discountValue
        );

        if ($discountAmount <= 0) {
            return $result;
        }

        // Build result
        $result->addAppliedRule(
            rule_id: $rule->id,
            rule_name: $rule->name,
            rule_type: 'bxgx',
            discount_amount: round($discountAmount, 2),
            affected_variants: []
        );

        // Track free items for display
        $freeItemsApplied = $this->getFreeItemsDetails($sortedItems, $totalFreeQty, $discountType, $discountValue);
        foreach ($freeItemsApplied as $freeItem) {
            $result->addFreeItem(
                variant_id: $freeItem['variant_id'],
                unit_price: $freeItem['original_price'],
                free_qty: $freeItem['qty'],
                discount_amount: $freeItem['discount_amount'],
                rule_id: $rule->id,
                rule_name: $rule->name
            );
        }

        \Log::info("[BxgxCalculator] Applied BXGX discount", [
            'rule' => $rule->name,
            'totalQty' => $totalQty,
            'applications' => $applications,
            'totalFreeQty' => $totalFreeQty,
            'discountAmount' => $discountAmount,
        ]);

        return $result;
    }

    /**
     * Get total quantity from cart items
     */
    private function getTotalQuantity(array $items): int
    {
        return array_reduce($items, fn($sum, $item) => $sum + ($item->qty ?? $item->quantity ?? 1), 0);
    }

    /**
     * Sort items by selection strategy
     */
    private function sortItemsByStrategy(array $items, string $strategy): array
    {
        $sorted = [...$items];

        usort($sorted, function ($a, $b) use ($strategy) {
            $priceA = $a->price ?? 0;
            $priceB = $b->price ?? 0;

            return match ($strategy) {
                'cheapest_first' => $priceA <=> $priceB,
                'most_expensive_first' => $priceB <=> $priceA,
                default => $priceA <=> $priceB,
            };
        });

        return $sorted;
    }

    /**
     * Calculate discount for free items
     */
    private function calculateFreeItemsDiscount(
        array $sortedItems,
        int $freeQty,
        string $discountType,
        float $discountValue
    ): float {
        $totalDiscount = 0;
        $remainingFreeQty = $freeQty;

        foreach ($sortedItems as $item) {
            if ($remainingFreeQty <= 0) {
                break;
            }

            $itemQty = $item->qty ?? $item->quantity ?? 1;
            $itemPrice = $item->price ?? 0;

            // How many of this item can be made free?
            $freeFromThisItem = min($itemQty, $remainingFreeQty);

            // Calculate discount for these items
            $itemDiscount = match ($discountType) {
                'percentage' => ($itemPrice * $freeFromThisItem) * ($discountValue / 100),
                'fixed' => min($discountValue * $freeFromThisItem, $itemPrice * $freeFromThisItem),
                'fixed_price' => max(0, ($itemPrice - $discountValue) * $freeFromThisItem),
                default => $itemPrice * $freeFromThisItem, // Full price = free
            };

            $totalDiscount += $itemDiscount;
            $remainingFreeQty -= $freeFromThisItem;
        }

        return $totalDiscount;
    }

    /**
     * Get details of free items for display
     */
    private function getFreeItemsDetails(
        array $sortedItems,
        int $freeQty,
        string $discountType,
        float $discountValue
    ): array {
        $freeItems = [];
        $remainingFreeQty = $freeQty;

        foreach ($sortedItems as $item) {
            if ($remainingFreeQty <= 0) {
                break;
            }

            $itemQty = $item->qty ?? $item->quantity ?? 1;
            $itemPrice = $item->price ?? 0;
            $freeFromThisItem = min($itemQty, $remainingFreeQty);

            $itemDiscount = match ($discountType) {
                'percentage' => ($itemPrice * $freeFromThisItem) * ($discountValue / 100),
                'fixed' => min($discountValue * $freeFromThisItem, $itemPrice * $freeFromThisItem),
                'fixed_price' => max(0, ($itemPrice - $discountValue) * $freeFromThisItem),
                default => $itemPrice * $freeFromThisItem,
            };

            $freeItems[] = [
                'variant_id' => $item->variant_id,
                'product_id' => $item->product_id,
                'sku' => $item->variant_sku ?? '',
                'qty' => $freeFromThisItem,
                'original_price' => $itemPrice,
                'discount_amount' => round($itemDiscount, 2),
                'discount_type' => $discountType,
                'discount_value' => $discountValue,
            ];

            $remainingFreeQty -= $freeFromThisItem;
        }

        return $freeItems;
    }
}
