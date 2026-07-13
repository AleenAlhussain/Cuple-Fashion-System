<?php

namespace App\Services\OfferEngine\Filters;

use App\Models\DiscountRuleFilter;
use App\Services\OfferEngine\DTOs\CartItemDTO;
use Illuminate\Support\Collection;

class FilterMatcher
{
    /**
     * Check if a cart item matches a single filter.
     */
    public function matchesFilter(CartItemDTO $item, DiscountRuleFilter $filter): bool
    {
        return $filter->matches($item->toArray());
    }

    /**
     * Check if a cart item matches all filters in a collection.
     * Include filters: item must match at least one
     * Exclude filters: item must not match any
     */
    public function matchesFilters(CartItemDTO $item, Collection $filters): bool
    {
        if ($filters->isEmpty()) {
            return true; // No filters = match all
        }

        $includeFilters = $filters->filter(fn($f) => !$f->is_exclude);
        $excludeFilters = $filters->filter(fn($f) => $f->is_exclude);

        // Check exclude filters first - if item matches any exclude, it's not eligible
        foreach ($excludeFilters as $filter) {
            if ($this->matchesFilter($item, $filter)) {
                return false; // Item is excluded
            }
        }

        // If no include filters, item passes (only excludes were checked)
        if ($includeFilters->isEmpty()) {
            return true;
        }

        // Item must match at least one include filter
        foreach ($includeFilters as $filter) {
            if ($this->matchesFilter($item, $filter)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Filter cart items by a collection of filters.
     *
     * @param CartItemDTO[] $items
     * @param Collection $filters
     * @return CartItemDTO[]
     */
    public function filterItems(array $items, Collection $filters): array
    {
        if ($filters->isEmpty()) {
            return $items;
        }

        return array_filter($items, fn($item) => $this->matchesFilters($item, $filters));
    }

    /**
     * Get items that match buy filters (for BOGO).
     *
     * @param CartItemDTO[] $items
     * @param Collection $filters
     * @return CartItemDTO[]
     */
    public function getBuyEligibleItems(array $items, Collection $filters): array
    {
        $buyFilters = $filters->filter(fn($f) => $f->isBuyFilter());
        return $this->filterItems($items, $buyFilters);
    }

    /**
     * Get items that match get filters (for BOGO).
     *
     * @param CartItemDTO[] $items
     * @param Collection $filters
     * @return CartItemDTO[]
     */
    public function getGetEligibleItems(array $items, Collection $filters): array
    {
        $getFilters = $filters->filter(fn($f) => $f->isGetFilter());
        return $this->filterItems($items, $getFilters);
    }
}
