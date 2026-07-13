<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Collection;

class PriceResolver
{
    public function resolve(
        Product $product,
        ?Collection $variants = null,
        ?int $selectedVariantId = null,
        ?int $countryId = null
    ): array {
        $variants = $variants ?? ($product->relationLoaded('variants') ? $product->variants : null);
        $hasVariants = $this->resolveHasVariants($product, $variants);

        $basePricing = $this->resolveBasePricing($product, $countryId);
        $basePrice = $basePricing['price'];
        $baseSalePrice = $basePricing['sale_price'];
        $priceSource = $basePricing['source'];

        $ranges = $this->resolveRanges($product, $variants, $hasVariants, $basePrice, $baseSalePrice);

        $displayPrice = $basePrice;
        $displaySalePrice = $baseSalePrice;

        if ($hasVariants) {
            if ($selectedVariantId) {
                $variant = $this->findVariant($product, $variants, $selectedVariantId);
                if ($variant) {
                    $displayPrice = $this->toFloat($variant->price);
                    $displaySalePrice = $this->normalizeSalePrice($variant->sale_price, $variant->price);
                    $priceSource = 'variant';
                }
            } else {
                $displayPrice = $ranges['min_price'];
                $displaySalePrice = $ranges['min_sale_price'];
                $priceSource = 'variant';
            }
        }

        return [
            'display_price' => $displayPrice,
            'display_sale_price' => $displaySalePrice,
            'min_price' => $ranges['min_price'],
            'max_price' => $ranges['max_price'],
            'min_sale_price' => $ranges['min_sale_price'],
            'max_sale_price' => $ranges['max_sale_price'],
            'price_source' => $priceSource,
            'has_variants' => $hasVariants,
        ];
    }

    public function refreshCachedPrices(
        Product $product,
        ?Collection $variants = null,
        bool $updateBaseFromMin = false
    ): Product {
        $variants = $variants ?? $product->variants()->where('is_active', true)->get(['id', 'price', 'sale_price']);
        $hasVariants = $variants->isNotEmpty();

        $basePrice = $this->toFloat($product->price);
        $baseSalePrice = $this->normalizeSalePrice($product->sale_price, $product->price);

        if ($hasVariants) {
            $ranges = $this->computeVariantRanges($variants, $basePrice);
            $product->min_price = $ranges['min_price'];
            $product->max_price = $ranges['max_price'];
            $product->min_sale_price = $ranges['min_sale_price'];
            $product->max_sale_price = $ranges['max_sale_price'];

            if ($updateBaseFromMin) {
                $product->price = $ranges['min_price'];
                $product->sale_price = $ranges['min_sale_price'];
            }
        } else {
            $product->min_price = $basePrice;
            $product->max_price = $basePrice;
            $product->min_sale_price = $baseSalePrice;
            $product->max_sale_price = $baseSalePrice;
        }

        $product->has_variants = $hasVariants;
        $product->save();

        return $product;
    }

    private function resolveBasePricing(Product $product, ?int $countryId = null): array
    {
        $price = $this->toFloat($product->price);
        $salePrice = $this->normalizeSalePrice($product->sale_price, $product->price);
        $source = 'product';

        if ($countryId) {
            $countryPricing = $this->resolveCountryPricing($product, $countryId);
            if ($countryPricing !== null) {
                $price = $this->toFloat($countryPricing['price']);
                $salePrice = $this->normalizeSalePrice($countryPricing['sale_price']);
                $source = 'country_override';
            }
        }

        return [
            'price' => $price,
            'sale_price' => $salePrice,
            'source' => $source,
        ];
    }

    private function resolveCountryPricing(Product $product, int $countryId): ?array
    {
        if ($product->relationLoaded('countries')) {
            $country = $product->countries->firstWhere('id', $countryId);
            if ($country) {
                return [
                    'price' => $country->pivot->price ?? $product->price,
                    'sale_price' => $country->pivot->sale_price ?? $product->sale_price,
                ];
            }
            return null;
        }

        return $product->getPriceForCountry($countryId);
    }

    private function resolveRanges(
        Product $product,
        ?Collection $variants,
        bool $hasVariants,
        float $basePrice,
        ?float $baseSalePrice
    ): array {
        if ($hasVariants) {
            $cachedMin = $product->min_price;
            $cachedMax = $product->max_price;
            $cachedMinSale = $product->min_sale_price;
            $cachedMaxSale = $product->max_sale_price;

            if ($cachedMin !== null && $cachedMax !== null) {
                return [
                    'min_price' => $this->toFloat($cachedMin),
                    'max_price' => $this->toFloat($cachedMax),
                    'min_sale_price' => $cachedMinSale !== null ? $this->toFloat($cachedMinSale) : null,
                    'max_sale_price' => $cachedMaxSale !== null ? $this->toFloat($cachedMaxSale) : null,
                ];
            }

            if ($variants && $variants->isNotEmpty()) {
                return $this->computeVariantRanges($variants, $basePrice);
            }
        }

        return [
            'min_price' => $basePrice,
            'max_price' => $basePrice,
            'min_sale_price' => $baseSalePrice,
            'max_sale_price' => $baseSalePrice,
        ];
    }

    private function computeVariantRanges(Collection $variants, float $fallbackPrice): array
    {
        $prices = $variants->map(function ($variant) {
            return $variant->price !== null ? $this->toFloat($variant->price) : null;
        })->filter(function ($value) {
            return $value !== null;
        })->values();

        $minPrice = $prices->isNotEmpty() ? $prices->min() : $fallbackPrice;
        $maxPrice = $prices->isNotEmpty() ? $prices->max() : $fallbackPrice;

        $salePrices = $variants->map(function ($variant) {
            return $this->normalizeSalePrice($variant->sale_price, $variant->price);
        })->filter(function ($value) {
            return $value !== null;
        })->values();

        $minSalePrice = $salePrices->isNotEmpty() ? $salePrices->min() : null;
        $maxSalePrice = $salePrices->isNotEmpty() ? $salePrices->max() : null;

        return [
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
            'min_sale_price' => $minSalePrice,
            'max_sale_price' => $maxSalePrice,
        ];
    }

    private function resolveHasVariants(Product $product, ?Collection $variants): bool
    {
        if ($product->has_variants !== null) {
            return (bool) $product->has_variants;
        }

        if ($variants !== null) {
            return $variants->isNotEmpty();
        }

        if ($product->relationLoaded('variants')) {
            return $product->variants->isNotEmpty();
        }

        return false;
    }

    private function findVariant(Product $product, ?Collection $variants, int $variantId): ?ProductVariant
    {
        if ($variants !== null) {
            return $variants->firstWhere('id', $variantId);
        }

        if ($product->relationLoaded('variants')) {
            return $product->variants->firstWhere('id', $variantId);
        }

        return ProductVariant::where('product_id', $product->id)->find($variantId);
    }

    private function normalizeSalePrice($value, $referencePrice = null): ?float
    {
        if ($value === null) {
            return null;
        }

        $numeric = $this->toFloat($value);
        if ($numeric <= 0) {
            return null;
        }

        if ($referencePrice !== null) {
            $referencePrice = $this->toFloat($referencePrice);
            if ($referencePrice > 0 && $numeric >= $referencePrice) {
                return null;
            }
        }

        return $numeric;
    }

    private function toFloat($value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        return (float) $value;
    }
}
