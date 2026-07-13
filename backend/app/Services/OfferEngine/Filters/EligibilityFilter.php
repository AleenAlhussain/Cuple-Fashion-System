<?php

namespace App\Services\OfferEngine\Filters;

use App\Models\DiscountRule;
use App\Services\OfferEngine\DTOs\CartItemDTO;

class EligibilityFilter
{
    public function __construct(
        private readonly FilterMatcher $filterMatcher
    ) {}

    /**
     * Get eligible items for a rule.
     *
     * @param CartItemDTO[] $items
     * @param DiscountRule $rule
     * @return CartItemDTO[]
     */
    public function getEligibleItems(array $items, DiscountRule $rule): array
    {
        // Ensure filters are loaded
        if (!$rule->relationLoaded('filters')) {
            $rule->load('filters');
        }

        // For non-BOGO rules, use filters with target = 'both'
        $filters = $rule->filters->filter(fn($f) => $f->target === 'both' || $f->target === 'buy');

        return $this->filterMatcher->filterItems($items, $filters);
    }

    /**
     * Get buy-eligible items for BOGO rules.
     *
     * @param CartItemDTO[] $items
     * @param DiscountRule $rule
     * @return CartItemDTO[]
     */
    public function getBuyEligibleItems(array $items, DiscountRule $rule): array
    {
        if (!$rule->relationLoaded('filters')) {
            $rule->load('filters');
        }

        return $this->filterMatcher->getBuyEligibleItems($items, $rule->filters);
    }

    /**
     * Get get-eligible items for BOGO rules.
     *
     * @param CartItemDTO[] $items
     * @param DiscountRule $rule
     * @return CartItemDTO[]
     */
    public function getGetEligibleItems(array $items, DiscountRule $rule): array
    {
        if (!$rule->relationLoaded('filters')) {
            $rule->load('filters');
        }

        return $this->filterMatcher->getGetEligibleItems($items, $rule->filters);
    }

    /**
     * Get items eligible for BXGX rules (same items for buy AND get).
     * Looks for filters with target = 'both' specifically.
     *
     * @param CartItemDTO[] $items
     * @param DiscountRule $rule
     * @return CartItemDTO[]
     */
    public function getBothEligibleItems(array $items, DiscountRule $rule): array
    {
        if (!$rule->relationLoaded('filters')) {
            $rule->load('filters');
        }

        // Get filters explicitly marked as 'both' for BXGX
        $bothFilters = $rule->filters->filter(fn($f) => $f->target === 'both');

        if ($bothFilters->isEmpty()) {
            // If no 'both' filters, this rule might not be properly configured for BXGX
            // Fall back to all non-exclude filters
            $bothFilters = $rule->filters->filter(fn($f) => !$f->is_exclude);
        }

        return $this->filterMatcher->filterItems($items, $bothFilters);
    }

    /**
     * Calculate total quantity of eligible items.
     *
     * @param CartItemDTO[] $items
     * @return int
     */
    public function getTotalQuantity(array $items): int
    {
        return array_sum(array_map(fn($item) => $item->qty, $items));
    }

    /**
     * Calculate total subtotal of eligible items.
     *
     * @param CartItemDTO[] $items
     * @return float
     */
    public function getTotalSubtotal(array $items): float
    {
        return array_sum(array_map(fn($item) => $item->getSubtotal(), $items));
    }

    /**
     * Sort items by price (cheapest first or most expensive first).
     *
     * @param CartItemDTO[] $items
     * @param string $strategy 'cheapest_first' or 'most_expensive_first'
     * @return CartItemDTO[]
     */
    public function sortByStrategy(array $items, string $strategy): array
    {
        $sorted = $items;

        usort($sorted, function (CartItemDTO $a, CartItemDTO $b) use ($strategy) {
            if ($strategy === 'most_expensive_first') {
                return $b->price <=> $a->price;
            }
            return $a->price <=> $b->price; // cheapest_first (default)
        });

        return $sorted;
    }

    /**
     * Expand items by quantity for per-unit processing.
     * E.g., item with qty=3 becomes 3 items with qty=1.
     *
     * @param CartItemDTO[] $items
     * @return CartItemDTO[]
     */
    public function expandItems(array $items): array
    {
        $expanded = [];

        foreach ($items as $item) {
            for ($i = 0; $i < $item->qty; $i++) {
                $expanded[] = new CartItemDTO(
                    variant_id: $item->variant_id,
                    variant_sku: $item->variant_sku,
                    price: $item->price,
                    qty: 1,
                    product_id: $item->product_id,
                    category_ids: $item->category_ids,
                    tag_ids: $item->tag_ids,
                    attributes: $item->attributes,
                    line_id: $item->line_id . "_unit_{$i}",
                );
            }
        }

        return $expanded;
    }

    /**
     * Collapse expanded items back to grouped items by variant_id.
     *
     * @param CartItemDTO[] $items
     * @return CartItemDTO[]
     */
    public function collapseItems(array $items): array
    {
        $grouped = [];

        foreach ($items as $item) {
            $key = $item->variant_id;

            if (!isset($grouped[$key])) {
                $grouped[$key] = new CartItemDTO(
                    variant_id: $item->variant_id,
                    variant_sku: $item->variant_sku,
                    price: $item->price,
                    qty: 0,
                    product_id: $item->product_id,
                    category_ids: $item->category_ids,
                    tag_ids: $item->tag_ids,
                    attributes: $item->attributes,
                    line_id: null,
                );
            }

            $grouped[$key] = new CartItemDTO(
                variant_id: $grouped[$key]->variant_id,
                variant_sku: $grouped[$key]->variant_sku,
                price: $grouped[$key]->price,
                qty: $grouped[$key]->qty + $item->qty,
                product_id: $grouped[$key]->product_id,
                category_ids: $grouped[$key]->category_ids,
                tag_ids: $grouped[$key]->tag_ids,
                attributes: $grouped[$key]->attributes,
                line_id: null,
            );
        }

        return array_values($grouped);
    }
}
