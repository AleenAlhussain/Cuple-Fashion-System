<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CacheService
{
    // Cache TTL constants (in seconds)
    const TTL_SHORT = 60;        // 1 minute - for frequently changing data
    const TTL_MEDIUM = 300;      // 5 minutes - for product listings
    const TTL_LONG = 600;        // 10 minutes - for product details
    const TTL_VERY_LONG = 3600;  // 1 hour - for rarely changing data (categories, settings)

    // Cache key prefixes
    const PREFIX_PRODUCT = 'product_';
    const PREFIX_PRODUCTS = 'products_';
    const PREFIX_CATEGORY = 'category_';
    const PREFIX_HOMEPAGE = 'homepage_';
    const PREFIX_SETTINGS = 'settings_';

    /**
     * Get or set cached value with automatic key generation
     */
    public static function remember(string $key, int $ttl, callable $callback)
    {
        try {
            return Cache::remember($key, $ttl, $callback);
        } catch (\Exception $e) {
            Log::warning("Cache error for key {$key}: " . $e->getMessage());
            // Fallback to direct execution if cache fails
            return $callback();
        }
    }

    /**
     * Clear all product-related caches
     */
    public static function clearProductCaches(): void
    {
        $patterns = [
            'homepage_*',
            'products_*',
            'product_*',
        ];

        foreach ($patterns as $pattern) {
            self::forgetByPattern($pattern);
        }

        // Clear known cache keys
        Cache::forget('homepage_data_v2');
    }

    /**
     * Clear specific product cache
     */
    public static function clearProductCache(int $productId): void
    {
        Cache::forget("product_detail_v2_{$productId}_default");
        Cache::forget("product_related_v2_{$productId}");
        Cache::forget("product_variants_{$productId}");
    }

    /**
     * Clear category-related caches
     */
    public static function clearCategoryCaches(): void
    {
        Cache::forget('homepage_data_v2');
        self::forgetByPattern('category_*');
    }

    /**
     * Clear all caches (use sparingly)
     */
    public static function clearAll(): void
    {
        Cache::flush();
    }

    /**
     * Forget cache keys by pattern (for Redis)
     */
    private static function forgetByPattern(string $pattern): void
    {
        try {
            $cacheDriver = config('cache.default');

            if ($cacheDriver === 'redis') {
                $redis = Cache::getRedis();
                $prefix = config('cache.prefix') . ':';
                $keys = $redis->keys($prefix . $pattern);

                foreach ($keys as $key) {
                    $redis->del($key);
                }
            }
            // For file driver, we rely on TTL expiration
        } catch (\Exception $e) {
            Log::warning("Failed to clear cache pattern {$pattern}: " . $e->getMessage());
        }
    }

    /**
     * Get cache statistics (for monitoring)
     */
    public static function getStats(): array
    {
        $cacheDriver = config('cache.default');

        return [
            'driver' => $cacheDriver,
            'prefix' => config('cache.prefix'),
            'ttl_settings' => [
                'short' => self::TTL_SHORT,
                'medium' => self::TTL_MEDIUM,
                'long' => self::TTL_LONG,
                'very_long' => self::TTL_VERY_LONG,
            ],
        ];
    }

    /**
     * Generate cache key for product list
     */
    public static function productListKey(array $params): string
    {
        return self::PREFIX_PRODUCTS . md5(json_encode($params));
    }

    /**
     * Generate cache key for single product
     */
    public static function productDetailKey($idOrSlug, ?string $countryId = null): string
    {
        return self::PREFIX_PRODUCT . "detail_v2_{$idOrSlug}_" . ($countryId ?: 'default');
    }
}
