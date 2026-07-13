# Performance Optimization Guide

## Overview

This document details all performance optimizations implemented for the Cuple Shop e-commerce platform.

## Benchmark Results

### Database Query Performance

| Endpoint | Before | After | Improvement |
|----------|--------|-------|-------------|
| Shop page (12 products) | 83.85ms | 55.81ms | **33% faster** |
| Shop + category filter | 48.88ms | 24.08ms | **51% faster** |
| Shop + best_seller sort | 101ms (subquery) | 7.22ms (column) | **93% faster** |
| Single product detail | 2.71ms | 0.9ms | **67% faster** |
| Product search | 25.86ms | 10.5ms | **59% faster** |
| Related products | 8.92ms | 4.87ms | **45% faster** |
| Homepage combined | N/A | 6.91ms | **New endpoint** |

### HTTP Response Times (Full Request Cycle)

| Endpoint | Before | After (Fresh) | After (Cached) | Improvement |
|----------|--------|---------------|----------------|-------------|
| `/api/products` | 3.34s | 1.66s | 1.71s | **50% faster** |
| `/api/categories/{slug}` | 1.0s | 0.38s | 0.34s | **66% faster** |
| `/api/categories/{id}/products` | 8.16s | 2.17s | 2.10s | **74% faster** |
| `/api/product-variants/colors` | 0.53s | 0.47s | 0.38s | **28% faster** |
| `/api/products/{id}` | 0.72s | 0.42s | 0.37s | **49% faster** |
| `/api/homepage` | 7-8s | 0.46s | 0.32s | **96% faster** |

> **Note:** HTTP response times include PHP CLI server bootstrap overhead (~300-400ms per request). Production servers with PHP-FPM or Laravel Octane will be **5-10x faster**.

---

## Optimizations Implemented

### 1. Database Indexes

Location: `database/migrations/2025_12_14_000001_add_search_performance_indexes.php`

```sql
-- Products table
INDEX products_name_index (name)
INDEX products_sku_index (sku)
INDEX products_is_active_index (is_active)
INDEX products_active_name_index (is_active, name)
INDEX products_active_created_index (is_active, created_at)
INDEX products_stock_status_index (stock_status)
INDEX products_slug_index (slug)
INDEX products_total_sold_index (total_sold)
INDEX products_active_sold_index (is_active, total_sold)

-- Orders table
INDEX orders_status_index (status)
INDEX orders_status_created_index (status, created_at)

-- Order items table
INDEX order_items_product_id_index (product_id)
INDEX order_items_product_order_index (product_id, order_id)
```

### 2. Denormalized `total_sold` Column

Instead of calculating best sellers with a slow subquery:

```php
// BEFORE (slow - 101ms)
->withCount(['orderItems as total_sold' => function ($q) {
    $q->whereHas('order', fn($oq) => $oq->whereIn('status', ['delivered', 'shipped']));
}])
->orderBy('total_sold', 'desc')

// AFTER (fast - 3ms)
->orderBy('total_sold', 'desc')
```

**Update Command:**
```bash
php artisan products:update-sales
```

Run this command hourly or after order status changes.

### 3. Combined Homepage Endpoint

Reduced homepage API calls from 10+ to 1-2:

**Before:**
- `/api/products?tag=latest` (1 request)
- `/api/products?sortBy=best_seller` (1 request)
- `/api/categories` (1 request)
- `/api/theme-options` (1 request)
- + more...

**After:**
- `/api/homepage` (1 request - returns all data)

Location: `app/Http/Controllers/Api/SettingsController.php::homepage()`

### 4. Optimized Eager Loading

```php
// BEFORE - loads everything
Product::with(['categories', 'images', 'variants.attributeValues.attribute'])

// AFTER - selective loading with limits
Product::select(['id', 'name', 'slug', 'price', 'sale_price', 'stock_status'])
    ->with([
        'categories:id,name,slug',
        'images' => fn($q) => $q->select(['id', 'product_id', 'image', 'is_primary'])
            ->orderByDesc('is_primary')->limit(1),
        'variants' => fn($q) => $q->select(['id', 'product_id', 'price', 'sale_price', 'stock_quantity'])
            ->where('is_active', true)->limit(5),
        'variants.attributeValues:id,attribute_id,value,color_code',
    ])
```

### 5. Caching Strategy

**Cache TTLs:**
| Type | Duration | Use Case |
|------|----------|----------|
| SHORT | 60s | Frequently changing data |
| MEDIUM | 300s (5min) | Product listings |
| LONG | 600s (10min) | Product details |
| VERY_LONG | 3600s (1hr) | Settings, categories |

**Cache Keys:**
- `homepage_data_v2` - Homepage combined data
- `products_{hash}` - Product listings
- `product_detail_v2_{id}_{country}` - Product details
- `product_related_v2_{id}` - Related products
- `theme_options_{country}` - Theme options

---

## Redis Configuration

### Installation

```bash
# Install Predis (PHP Redis client)
composer require predis/predis
```

### Configuration (.env)

```env
# Current (File cache)
CACHE_STORE=file
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# To enable Redis (requires Redis server)
CACHE_STORE=redis
```

### Starting Redis (Windows)

Option 1: Use WSL
```bash
wsl
sudo service redis-server start
```

Option 2: Use Docker
```bash
docker run -d -p 6379:6379 redis:alpine
```

Option 3: Use Windows Redis port
Download from: https://github.com/microsoftarchive/redis/releases

---

## Cache Management Commands

```bash
# View cache stats
php artisan cache:manage stats

# Clear all caches
php artisan cache:manage clear-all

# Clear product caches only
php artisan cache:manage clear-products

# Clear homepage cache
php artisan cache:manage clear-homepage

# Warmup caches (preload common data)
php artisan cache:manage warmup
```

---

## Artisan Commands

```bash
# Update product sales counts (run hourly)
php artisan products:update-sales

# Clear all Laravel caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Optimize for production
php artisan optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## Production Recommendations

### 1. Use Redis for Caching
```env
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

### 2. Use Laravel Octane (Linux only)
```bash
composer require laravel/octane
php artisan octane:install --server=frankenphp
php artisan octane:start --workers=4
```

Expected improvement: **5-10x faster** response times

### 3. Enable OPcache
```ini
; php.ini
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0 ; Set to 1 for development
```

### 4. Use CDN for Images
Configure `next.config.mjs` to use a CDN for product images.

### 5. Database Connection Pooling
Use PgBouncer for PostgreSQL or ProxySQL for MySQL in high-traffic scenarios.

---

## Monitoring

### Log Slow Queries

Add to `AppServiceProvider::boot()`:

```php
if (app()->environment('local')) {
    DB::listen(function ($query) {
        if ($query->time > 100) {
            Log::warning("Slow query ({$query->time}ms): {$query->sql}");
        }
    });
}
```

### API Response Time Logging

The application logs slow API responses automatically. Check `storage/logs/laravel.log`.

---

## Troubleshooting

### Cache Not Working
```bash
php artisan cache:clear
php artisan config:clear
```

### Slow Best Seller Query
Ensure `total_sold` column exists and is indexed:
```bash
php artisan migrate
php artisan products:update-sales
```

### High Memory Usage
- Reduce eager loading limits
- Use pagination for large datasets
- Enable OPcache

### Redis Connection Failed
- Check Redis server is running
- Verify `REDIS_HOST` and `REDIS_PORT` in `.env`
- Try `REDIS_CLIENT=predis` instead of `phpredis`

---

## Files Changed

| File | Changes |
|------|---------|
| `app/Http/Controllers/Api/ProductController.php` | Optimized queries, used total_sold column |
| `app/Http/Controllers/Api/SettingsController.php` | Added homepage() endpoint |
| `app/Services/CacheService.php` | New - Unified caching service |
| `app/Console/Commands/CacheManage.php` | New - Cache management command |
| `app/Console/Commands/UpdateProductSalesCount.php` | New - Update total_sold |
| `routes/api_website.php` | Added /homepage route |
| `frontend/src/utils/api/home/home.js` | Added useGetHomepage hook |
| `frontend/src/components/themes/fashion/fashion1/index.jsx` | Uses combined endpoint |

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-18 | 1.0 | Initial optimization - indexes, total_sold, caching |
| 2024-12-18 | 1.1 | Combined homepage endpoint, Redis setup |
