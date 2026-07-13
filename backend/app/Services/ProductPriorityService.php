<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;

class ProductPriorityService
{
    public function applyPriority(Builder $query, array $prioritySettings, array $sortSettings): Builder
    {
        if (!($prioritySettings['enabled'] ?? false)) {
            return $this->applyDefaultSort($query, $sortSettings);
        }

        $type = $prioritySettings['type'] ?? 'pinned';

        switch ($type) {
            case 'pinned':
                return $this->applyPinnedPriority($query, $prioritySettings, $sortSettings);

            case 'featured':
                $query->orderByRaw('products.is_featured DESC');
                return $this->applyDefaultSort($query, $sortSettings);

            case 'in_stock':
                $query->orderByRaw("(CASE WHEN products.stock_status = 'in_stock' THEN 0 ELSE 1 END)");
                return $this->applyDefaultSort($query, $sortSettings);

            case 'new_arrivals':
                $days = (int) ($prioritySettings['new_arrivals_days'] ?? 14);
                $cutoff = now()->subDays($days)->toDateTimeString();
                $query->orderByRaw("(CASE WHEN products.created_at >= ? THEN 0 ELSE 1 END)", [$cutoff]);
                return $this->applyDefaultSort($query, $sortSettings);

            case 'custom':
                $field = $prioritySettings['custom_field'] ?? 'created_at';
                $dir = strtoupper($prioritySettings['custom_direction'] ?? 'DESC');
                $allowed = ['price', 'created_at', 'total_sold'];
                $allowedDir = ['ASC', 'DESC'];
                if (in_array($field, $allowed, true) && in_array($dir, $allowedDir, true)) {
                    return $query->orderBy('products.' . $field, $dir);
                }
                return $this->applyDefaultSort($query, $sortSettings);

            default:
                return $this->applyDefaultSort($query, $sortSettings);
        }
    }

    private function applyPinnedPriority(Builder $query, array $prioritySettings, array $sortSettings): Builder
    {
        $pinnedIds = $prioritySettings['pinned_product_ids'] ?? [];
        if (empty($pinnedIds)) {
            return $this->applyDefaultSort($query, $sortSettings);
        }

        $pinnedIds = array_map('intval', $pinnedIds);
        $idsString = implode(',', $pinnedIds);

        if ($prioritySettings['keep_pinned_order'] ?? true) {
            $query->orderByRaw("FIELD(products.id, {$idsString}) DESC")
                  ->orderByRaw("products.id IN ({$idsString}) DESC");
        } else {
            $query->orderByRaw("products.id IN ({$idsString}) DESC");
        }

        return $this->applyDefaultSort($query, $sortSettings);
    }

    public function applyDefaultSort(Builder $query, array $sortSettings): Builder
    {
        $sort = $sortSettings['default_sort'] ?? 'newest';

        switch ($sort) {
            case 'oldest':
                $query->orderBy('products.created_at', 'ASC');
                break;
            case 'price_low':
            case 'price_asc':
            case 'low_to_high':
                $query->orderBy('products.price', 'ASC');
                break;
            case 'price_high':
            case 'price_desc':
            case 'high_to_low':
                $query->orderBy('products.price', 'DESC');
                break;
            case 'best_selling':
            case 'top_selling':
                $query->orderBy('products.total_sold', 'DESC');
                break;
            case 'name_asc':
                $query->orderBy('products.name', 'ASC');
                break;
            case 'name_desc':
                $query->orderBy('products.name', 'DESC');
                break;
            default: // 'newest'
                $query->orderBy('products.created_at', 'DESC');
                break;
        }

        return $query;
    }
}
