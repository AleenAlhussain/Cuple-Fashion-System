<?php

namespace App\Http\Controllers\Api;

use App\Models\GiftBoxOffer;
use App\Models\GiftBoxSelection;
use App\Models\Product;
use Illuminate\Http\Request;

class GiftBoxController extends BaseController
{
    public function active(Request $request)
    {
        $user = auth('sanctum')->user();

        $offer = GiftBoxOffer::active()
            ->with([
                'categoryItems.category',
                'categoryItems.product.images',
            ])
            ->orderByDesc('id')
            ->first();

        if (!$offer) {
            return $this->success([
                'is_active' => false,
                'offer_id' => null,
                'categories' => [],
                'has_selected_before' => false,
                'has_used_offer_before' => false,
                'should_show_popup' => false,
                'selection' => null,
            ]);
        }

        $hasSelectedBefore = false;
        $hasUsedOfferBefore = false;
        $selectionData = null;
        if ($user) {
            $hasSelectedBefore = GiftBoxSelection::where('user_id', $user->id)
                ->where('gift_box_offer_id', $offer->id)
                ->exists();

            $hasUsedOfferBefore = GiftBoxSelection::where('user_id', $user->id)
                ->where('gift_box_offer_id', $offer->id)
                ->whereNotNull('order_id')
                ->exists();

            $selection = GiftBoxSelection::with(['category', 'product.images', 'offer'])
                ->where('user_id', $user->id)
                ->where('gift_box_offer_id', $offer->id)
                ->orderByDesc('id')
                ->first();
            if ($selection) {
                $selectionData = $this->formatSelection($selection);
            }
        }

        $categories = $offer->categoryItems
            ->sortBy('position')
            ->groupBy('category_id')
            ->map(function ($items) {
                $category = $items->first()->category;

                return [
                    'category_id' => $category?->id,
                    'category_name' => $category?->name,
                    'items' => $items->map(function ($item) {
                        return [
                            'product_id' => $item->product_id,
                            'position' => $item->position,
                            'product' => $this->formatProduct($item->product),
                        ];
                    })->values(),
                ];
            })
            ->values();

        $shouldShowPopup = $user
            && $offer->isCurrentlyActive()
            && !$hasSelectedBefore;

        return $this->success([
            'is_active' => $offer->is_active,
            'offer_id' => $offer->id,
            'discount_type' => $offer->discount_type,
            'discount_value' => $offer->discount_value,
            'selection_limit' => $offer->selection_limit,
            'show_once_per_session' => $offer->show_once_per_session,
            'reuse_policy' => $offer->reuse_policy,
            'categories' => $categories,
            'has_selected_before' => $hasSelectedBefore,
            'has_used_offer_before' => $hasUsedOfferBefore,
            'should_show_popup' => (bool) $shouldShowPopup,
            'selection' => $selectionData,
        ]);
    }

    public function select(Request $request)
    {
        $user = auth('sanctum')->user();
        if (!$user) {
            return $this->error('Unauthorized', 401);
        }

        $validated = $request->validate([
            'offer_id' => 'required|exists:gift_box_offers,id',
            'category_id' => 'required|exists:categories,id',
            'product_id' => 'required|exists:products,id',
        ]);

        $offer = GiftBoxOffer::active()->findOrFail($validated['offer_id']);

        if (!$offer->isCurrentlyActive()) {
            return $this->error('Offer is not active.', 400);
        }

        $alreadySelected = GiftBoxSelection::where('user_id', $user->id)
            ->where('gift_box_offer_id', $offer->id)
            ->first();

        if ($alreadySelected) {
            return $this->success($this->formatSelection($alreadySelected), 'Selection already exists.');
        }

        $allowedItem = $offer->categoryItems()
            ->where('category_id', $validated['category_id'])
            ->where('product_id', $validated['product_id'])
            ->exists();

        if (!$allowedItem) {
            return $this->error('Selected item is not available for this category.', 422);
        }

        $product = Product::findOrFail($validated['product_id']);

        if ($product->stock_status !== 'in_stock') {
            return $this->error('Item unavailable', 409);
        }

        if ($product->manage_stock && $product->stock_quantity <= 0) {
            return $this->error('Item unavailable', 409);
        }

        $selection = GiftBoxSelection::create([
            'user_id' => $user->id,
            'gift_box_offer_id' => $offer->id,
            'category_id' => $validated['category_id'],
            'product_id' => $validated['product_id'],
            'status' => 'confirmed',
        ]);

        return $this->success($this->formatSelection($selection), 'Gift box selection saved.');
    }

    public function me(Request $request)
    {
        $user = auth('sanctum')->user();
        if (!$user) {
            return $this->error('Unauthorized', 401);
        }

        $activeOffer = GiftBoxOffer::active()->orderByDesc('id')->first();
        $selectionQuery = GiftBoxSelection::with(['category', 'product.images', 'offer'])
            ->where('user_id', $user->id);

        $hasUsedOfferBefore = false;
        if ($activeOffer) {
            $selectionQuery->where('gift_box_offer_id', $activeOffer->id);
            $hasUsedOfferBefore = GiftBoxSelection::where('user_id', $user->id)
                ->where('gift_box_offer_id', $activeOffer->id)
                ->whereNotNull('order_id')
                ->exists();
        }

        $selection = $selectionQuery->orderByDesc('id')->first();

        if (!$selection) {
            return $this->success([
                'selection' => null,
                'has_used_offer_before' => $hasUsedOfferBefore,
            ]);
        }

        return $this->success([
            'selection' => $this->formatSelection($selection),
            'has_used_offer_before' => $hasUsedOfferBefore,
        ]);
    }

    protected function formatSelection(GiftBoxSelection $selection): array
    {
        $offer = $selection->offer;

        return [
            'selection_id' => $selection->id,
            'offer_id' => $selection->gift_box_offer_id,
            'category_id' => $selection->category_id,
            'category_name' => $selection->category?->name,
            'product_id' => $selection->product_id,
            'product' => $this->formatProduct($selection->product),
            'status' => $selection->status,
            'order_id' => $selection->order_id,
            'discount_type' => $offer?->discount_type,
            'discount_value' => $offer?->discount_value,
        ];
    }

    protected function formatProduct(?Product $product): ?array
    {
        if (!$product) {
            return null;
        }

        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'price' => $product->price,
            'sale_price' => $product->sale_price,
            'final_price' => $product->final_price,
            'stock_status' => $product->stock_status,
            'product_thumbnail' => $product->product_thumbnail,
            'primary_image' => $product->primary_image,
        ];
    }
}
