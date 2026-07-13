<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class ShopLayoutSetting extends Model
{
    protected $fillable = ['scope', 'scope_id', 'settings'];

    protected $casts = [
        'settings' => 'array',
        'scope_id' => 'integer',
    ];

    public const DEFAULT_SETTINGS = [
        'use_same_for_all' => true,
        'grid' => [
            'columns_desktop' => 4,
            'columns_tablet' => 2,
            'columns_mobile' => 1,
            'grid_gap' => 16,
            'row_gap' => 24,
            'products_per_page' => 12,
            'pagination_type' => 'normal',
        ],
        'card_image' => [
            'aspect_ratio' => '4:5',
            'image_fit' => 'cover',
            'height_mode' => 'ratio',
            'fixed_height' => null,
        ],
        'card_content' => [
            'show_category' => true,
            'show_title' => true,
            'show_price' => true,
            'show_sale_badge' => true,
            'show_rating' => false,
            'show_short_description' => false,
            'show_add_to_cart' => true,
            'show_wishlist' => true,
            'show_quick_view' => true,
        ],
        'card_order' => [
            'category', 'title', 'price', 'rating',
            'description', 'add_to_cart', 'wishlist', 'quick_view',
        ],
        'text' => [
            'title_max_lines' => 2,
            'description_max_lines' => 2,
            'title_font_size' => 'medium',
            'price_font_size' => 'medium',
        ],
        'sorting' => [
            'default_sort' => 'newest',
        ],
        'priority' => [
            'enabled' => false,
            'type' => 'pinned',
            'pinned_product_ids' => [],
            'keep_pinned_order' => true,
            'new_arrivals_days' => 14,
            'custom_field' => 'created_at',
            'custom_direction' => 'DESC',
        ],
    ];

    private static function cacheKey(string $scope, ?int $scopeId): string
    {
        return 'shop_layout_' . $scope . '_' . ($scopeId ?? 'null');
    }

    public static function getSettings(string $scope, ?int $scopeId = null): array
    {
        $key = self::cacheKey($scope, $scopeId);

        return Cache::remember($key, 3600, function () use ($scope, $scopeId) {
            $record = self::where('scope', $scope)
                ->where('scope_id', $scopeId)
                ->first();

            if ($record) {
                return array_replace_recursive(self::DEFAULT_SETTINGS, $record->settings);
            }

            return self::DEFAULT_SETTINGS;
        });
    }

    public static function saveSettings(string $scope, array $settings, ?int $scopeId = null): self
    {
        $record = self::updateOrCreate(
            ['scope' => $scope, 'scope_id' => $scopeId],
            ['settings' => $settings]
        );

        Cache::forget(self::cacheKey($scope, $scopeId));

        return $record;
    }

    /**
     * Resolve settings for a website request with cascade logic:
     * 1. If global use_same_for_all is true → return global
     * 2. If false, look for scope-specific settings
     * 3. If scope-specific not found, fallback to global
     * 4. If nothing found, return defaults
     */
    public static function resolveForWebsite(string $scope = 'shop', ?int $scopeId = null): array
    {
        $global = self::getSettings('global');

        if ($global['use_same_for_all'] ?? true) {
            return $global;
        }

        if ($scope !== 'global' && $scope !== 'shop') {
            $scoped = self::where('scope', $scope)
                ->where('scope_id', $scopeId)
                ->first();

            if ($scoped) {
                return array_replace_recursive(self::DEFAULT_SETTINGS, $scoped->settings);
            }
        }

        return $global;
    }
}
