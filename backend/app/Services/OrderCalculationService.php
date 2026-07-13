<?php

namespace App\Services;

use App\Models\GiftBoxOffer;
use App\Models\GiftBoxSelection;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Arr;

class OrderCalculationService
{
    /**
     * Prepare items and subtotal from the incoming payload.
     *
     * @param  array  $items
     * @return array{items: array, subtotal: float}
     */
    public function prepareItems(array $items, ?User $user = null): array
    {
        $prepared = [];
        $subtotal = 0;
        $giftBoxDiscountTotal = 0;
        $selection = $this->resolveGiftBoxSelection($user);

        foreach ($items as $entry) {
            $product = Product::findOrFail($entry['product_id']);
            $variant = isset($entry['variant_id']) ? ProductVariant::find($entry['variant_id']) : null;
            $quantity = max(1, (int) ($entry['quantity'] ?? 1));

            $prepared[] = [
                'product' => $product,
                'variant' => $variant,
                'quantity' => $quantity,
                'base_price' => $this->resolvePrice($product, $variant),
                'matchi_bundle_key' => Arr::get($entry, 'matchi_bundle_key'),
                'matchi_bundle_sale_total' => (float) Arr::get($entry, 'matchi_bundle_sale_total', 0),
                'matchi_bundle_original_total' => (float) Arr::get($entry, 'matchi_bundle_original_total', 0),
                'matchi_pair_id' => Arr::get($entry, 'matchi_pair_id'),
                'color' => Arr::get($entry, 'color'),
                'size' => Arr::get($entry, 'size'),
            ];
        }

        $prepared = $this->applyMatchiBundlePricing($prepared);

        foreach ($prepared as $index => $item) {
            $price = (float) ($item['price'] ?? $item['base_price'] ?? 0);
            $quantity = (int) ($item['quantity'] ?? 1);
            $lineDiscount = $this->resolveGiftBoxDiscount($selection, $item['product']->id, $price);
            $total = ($price * $quantity) - $lineDiscount;
            $subtotal += $total;
            $giftBoxDiscountTotal += $lineDiscount;

            $prepared[$index]['price'] = ($lineDiscount > 0 && $quantity === 1)
                ? max(0, $price - $lineDiscount)
                : $price;
            $prepared[$index]['total'] = $total;
            $prepared[$index]['gift_box_discount'] = $lineDiscount;
        }

        return [
            'items' => $prepared,
            'subtotal' => round($subtotal, 2),
            'gift_box_selection_id' => $selection?->id,
            'gift_box_offer_id' => $selection?->gift_box_offer_id,
            'gift_box_discount_total' => round($giftBoxDiscountTotal, 2),
        ];
    }

    protected function applyMatchiBundlePricing(array $items): array
    {
        $prepared = array_map(function ($item) {
            $basePrice = (float) ($item['base_price'] ?? 0);
            $quantity = max(0, (int) ($item['quantity'] ?? 0));

            $item['base_price'] = $basePrice;
            $item['price'] = $basePrice;
            $item['total'] = round($basePrice * $quantity, 2);
            $item['matchi_bundle_discount'] = 0;
            $item['matchi_bundle_applied_qty'] = 0;

            return $item;
        }, $items);

        $groups = [];

        foreach ($prepared as $index => $item) {
            $bundleKey = trim((string) ($item['matchi_bundle_key'] ?? ''));
            $bundleSaleTotal = (float) ($item['matchi_bundle_sale_total'] ?? 0);

            if ($bundleKey === '' || $bundleSaleTotal <= 0) {
                continue;
            }

            $groups[$bundleKey][] = $index;
        }

        foreach ($groups as $indexes) {
            if (count($indexes) < 2) {
                continue;
            }

            $applications = min(array_map(
                fn ($index) => max(0, (int) ($prepared[$index]['quantity'] ?? 0)),
                $indexes
            ));

            if ($applications < 1) {
                continue;
            }

            $bundleSaleTotal = (float) ($prepared[$indexes[0]]['matchi_bundle_sale_total'] ?? 0);
            $baseTotal = array_sum(array_map(
                fn ($index) => (float) ($prepared[$index]['base_price'] ?? 0),
                $indexes
            ));

            if ($bundleSaleTotal <= 0 || $baseTotal <= 0 || $bundleSaleTotal >= $baseTotal) {
                continue;
            }

            $allocatedSaleTotal = 0.0;
            $lastPosition = count($indexes) - 1;

            foreach ($indexes as $position => $index) {
                $basePrice = (float) ($prepared[$index]['base_price'] ?? 0);
                $quantity = max(0, (int) ($prepared[$index]['quantity'] ?? 0));
                $fullPriceUnits = max(0, $quantity - $applications);
                $discountedUnitPrice = $position === $lastPosition
                    ? round(max(0, $bundleSaleTotal - $allocatedSaleTotal), 2)
                    : round(($basePrice / $baseTotal) * $bundleSaleTotal, 2);

                $allocatedSaleTotal += $discountedUnitPrice;

                $effectiveTotal = ($discountedUnitPrice * $applications) + ($basePrice * $fullPriceUnits);
                $baseLineTotal = $basePrice * $quantity;

                $prepared[$index]['price'] = $quantity > 0
                    ? round($effectiveTotal / $quantity, 4)
                    : round($basePrice, 4);
                $prepared[$index]['total'] = round($effectiveTotal, 2);
                $prepared[$index]['matchi_bundle_discount'] = round($baseLineTotal - $effectiveTotal, 2);
                $prepared[$index]['matchi_bundle_applied_qty'] = $applications;
                $prepared[$index]['matchi_bundle_discounted_unit_price'] = round($discountedUnitPrice, 2);
            }
        }

        return $prepared;
    }

    /**
     * Resolve the price for an item, preferring sale price when available.
     */
    protected function resolvePrice(Product $product, ?ProductVariant $variant): float
    {
        if ($variant) {
            return $variant->sale_price > 0 ? $variant->sale_price : $variant->price;
        }

        return $product->sale_price > 0 ? $product->sale_price : $product->price;
    }

    protected function resolveGiftBoxSelection(?User $user): ?GiftBoxSelection
    {
        if (!$user) {
            return null;
        }

        $offer = GiftBoxOffer::active()->orderByDesc('id')->first();
        if (!$offer) {
            return null;
        }

        return GiftBoxSelection::with('offer')
            ->where('user_id', $user->id)
            ->where('gift_box_offer_id', $offer->id)
            ->where('status', 'confirmed')
            ->first();
    }

    protected function resolveGiftBoxDiscount(?GiftBoxSelection $selection, int $productId, float $price): float
    {
        if (!$selection || $selection->product_id !== $productId) {
            return 0;
        }

        $offer = $selection->offer;
        if (!$offer || !$offer->isCurrentlyActive()) {
            return 0;
        }

        $discountValue = (float) ($offer->discount_value ?? 0);
        $discount = 0.0;

        switch ($offer->discount_type) {
            case 'percentage':
                $discount = $price * ($discountValue / 100);
                break;
            case 'fixed':
                $discount = $discountValue;
                break;
            case 'price_override':
                $discount = $price - $discountValue;
                break;
        }

        return max(0, min($discount, $price));
    }
}
