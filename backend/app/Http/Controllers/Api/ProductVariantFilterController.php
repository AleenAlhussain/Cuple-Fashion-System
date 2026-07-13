<?php

namespace App\Http\Controllers\Api;

use App\Models\AttributeValue;
use App\Models\Category;
use App\Models\Product;
use App\Services\ProductOfferService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ProductVariantFilterController extends BaseController
{
    public function colors(Request $request)
    {
        $categoryIdentifier = $request->input('category_id') ?? $request->input('category');
        $offerId = $request->input('offer_id');
        $offerKey = $request->input('offer_key');
        $promoGroupId = $request->input('promo_group_id') ?? $request->input('promo_group_ids');
        $cacheKey = 'variant_filters_' . md5(json_encode([
            'category' => $categoryIdentifier ?: 'all',
            'offer_id' => $offerId,
            'offer_key' => $offerKey,
            'promo_group_id' => $promoGroupId,
        ]));

        // Cache for 10 minutes - filters don't change often
        $result = Cache::remember($cacheKey, 600, function () use ($categoryIdentifier, $offerId, $offerKey, $promoGroupId) {
            $categoryIds = $this->collectCategoryIds($categoryIdentifier);
            $productIds = $this->collectProductIds($categoryIds);
            $offerService = app(ProductOfferService::class);

            // Offer mode restriction by offer_id, offer_key, or promo_group_id
            if ($promoGroupId !== null && $promoGroupId !== '') {
                $promoGroupIds = $this->normalizeIntArray($promoGroupId);
                $offerProductIds = $offerService->getProductIdsForPromoGroups($promoGroupIds);
                $productIds = $productIds->intersect($offerProductIds)->values();
            } elseif (!empty($offerKey)) {
                $offerProductIds = $offerService->getProductIdsForOfferKey((string) $offerKey);
                $productIds = $productIds->intersect($offerProductIds)->values();
            } elseif ($offerId) {
                $offerProductIds = $offerService->getProductIdsForOffer((int) $offerId);
                $productIds = $productIds->intersect($offerProductIds)->values();
            }

            return [
                'colors' => $this->collectAttributeValues($productIds, 'color')->values(),
                'sizes' => $this->collectAttributeValues($productIds, 'size')->values(),
            ];
        });

        return $this->success($result);
    }

    private function normalizeIntArray($value): array
    {
        $items = is_array($value) ? $value : explode(',', (string) $value);

        return array_values(array_unique(array_map(
            'intval',
            array_filter(array_map('trim', $items), 'is_numeric')
        )));
    }

    private function collectCategoryIds($categoryIdentifier): Collection
    {
        if (!$categoryIdentifier) {
            return Category::active()->storefrontVisible()->hasStorefrontProducts()->pluck('id')->values();
        }

        $category = is_numeric($categoryIdentifier)
            ? Category::storefrontVisible()->hasStorefrontProducts()->find($categoryIdentifier)
            : Category::storefrontVisible()->hasStorefrontProducts()->where('slug', $categoryIdentifier)->first();

        if (!$category) {
            return collect();
        }

        $categoryIds = collect([$category->id]);
        $children = Category::storefrontVisible()->hasStorefrontProducts()->where('parent_id', $category->id)->get();

        while ($children->isNotEmpty()) {
            $categoryIds = $categoryIds->merge($children->pluck('id'));
            $children = Category::storefrontVisible()->hasStorefrontProducts()->whereIn('parent_id', $children->pluck('id'))->get();
        }

        return $categoryIds->unique()->values();
    }

    private function collectProductIds(Collection $categoryIds): Collection
    {
        if ($categoryIds->isEmpty()) {
            return collect();
        }

        return Product::active()
            ->whereHas('categories', function ($query) use ($categoryIds) {
                $query->whereIn('categories.id', $categoryIds);
            })
            ->pluck('id')
            ->unique()
            ->values();
    }

    private function collectAttributeValues(Collection $productIds, string $attributeSlug): Collection
    {
        if ($productIds->isEmpty()) {
            return collect();
        }

        $attributeValues = AttributeValue::whereHas('attribute', function ($query) use ($attributeSlug) {
            $query->where('slug', $attributeSlug);
        })
            ->whereHas('productVariants', function ($query) use ($productIds) {
                $query->whereIn('product_variants.product_id', $productIds)
                    ->where('product_variants.is_active', true);
            })
            ->orderBy('sort_order')
            ->get();

        return $attributeValues->map(function (AttributeValue $value) use ($attributeSlug) {
            $payload = [
                'id' => $value->id,
                'value' => $value->value,
                'slug' => Str::slug($value->value),
            ];

            if ($attributeSlug === 'color') {
                $payload['color'] = $value->value;
                // Use ID as filter_value to ensure uniqueness (color_code can be null/duplicate)
                $payload['filter_value'] = (string) $value->id;
                $payload['color_code'] = $value->color_code ?? $this->generateColorFromName($value->value);
            }

            return $payload;
        });
    }

    /**
     * Generate a color code from a color name for display purposes
     */
    private function generateColorFromName(string $colorName): string
    {
        // Common color name mappings
        $colorMap = [
            'silver' => '#C0C0C0',
            'gold' => '#FFD700',
            'pewter' => '#8E8E8E',
            'bronze' => '#CD7F32',
            'copper' => '#B87333',
            'champagne' => '#F7E7CE',
            'rose gold' => '#B76E79',
            'rosegold' => '#B76E79',
            'cream' => '#FFFDD0',
            'ivory' => '#FFFFF0',
            'taupe' => '#483C32',
            'tan' => '#D2B48C',
            'nude' => '#E3BC9A',
            'camel' => '#C19A6B',
            'khaki' => '#C3B091',
            'olive' => '#808000',
            'burgundy' => '#800020',
            'maroon' => '#800000',
            'wine' => '#722F37',
            'coral' => '#FF7F50',
            'teal' => '#008080',
            'mint' => '#98FF98',
            'lavender' => '#E6E6FA',
            'plum' => '#8E4585',
            'coffee' => '#6F4E37',
            'sand' => '#C2B280',
            'offwhite' => '#FAF9F6',
            'off white' => '#FAF9F6',
            'light grey' => '#D3D3D3',
            'lightgrey' => '#D3D3D3',
            'dark grey' => '#A9A9A9',
            'light blue' => '#ADD8E6',
            'dark blue' => '#00008B',
            'light pink' => '#FFB6C1',
            'dark pink' => '#E75480',
            'light brown' => '#B5651D',
            'dark brown' => '#654321',
            'light green' => '#90EE90',
            'dark green' => '#006400',
        ];

        $lowerName = strtolower(trim($colorName));

        // Check direct match
        if (isset($colorMap[$lowerName])) {
            return $colorMap[$lowerName];
        }

        // Check if name contains a known color
        foreach ($colorMap as $name => $code) {
            if (str_contains($lowerName, $name)) {
                return $code;
            }
        }

        // Generate a hash-based color as fallback
        $hash = crc32($colorName);
        $r = ($hash & 0xFF0000) >> 16;
        $g = ($hash & 0x00FF00) >> 8;
        $b = $hash & 0x0000FF;

        // Ensure the color is not too dark or too light
        $r = max(50, min(200, $r));
        $g = max(50, min(200, $g));
        $b = max(50, min(200, $b));

        return sprintf('#%02X%02X%02X', $r, $g, $b);
    }
}
