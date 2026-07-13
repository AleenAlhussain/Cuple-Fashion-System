<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\GiftBoxOffer;
use App\Models\GiftBoxOfferCategoryItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GiftBoxOfferController extends BaseController
{
    public function index()
    {
        $offer = GiftBoxOffer::with(['categoryItems.category', 'categoryItems.product'])
            ->orderByDesc('id')
            ->first();

        return $this->success($offer ? $this->formatOffer($offer) : null);
    }

    public function show($id)
    {
        $offer = GiftBoxOffer::with(['categoryItems.category', 'categoryItems.product'])
            ->findOrFail($id);

        return $this->success($this->formatOffer($offer));
    }

    public function store(Request $request)
    {
        $validated = $this->validatePayload($request);

        DB::beginTransaction();
        try {
            $offer = GiftBoxOffer::create($this->normalizeOfferPayload($validated));
            $this->syncCategoryItems($offer, $validated['categories'] ?? []);

            DB::commit();
            return $this->success($this->formatOffer($offer->fresh(['categoryItems.category', 'categoryItems.product'])));
        } catch (\InvalidArgumentException $e) {
            DB::rollBack();
            return $this->error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->error('Failed to save gift box offer.', 500);
        }
    }

    public function update(Request $request, $id)
    {
        $offer = GiftBoxOffer::findOrFail($id);
        $validated = $this->validatePayload($request, $offer->id);

        DB::beginTransaction();
        try {
            $offer->update($this->normalizeOfferPayload($validated));
            $this->syncCategoryItems($offer, $validated['categories'] ?? []);

            DB::commit();
            return $this->success($this->formatOffer($offer->fresh(['categoryItems.category', 'categoryItems.product'])));
        } catch (\InvalidArgumentException $e) {
            DB::rollBack();
            return $this->error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->error('Failed to update gift box offer.', 500);
        }
    }

    protected function validatePayload(Request $request, ?int $offerId = null): array
    {
        return $request->validate([
            'is_active' => 'required|boolean',
            'start_at' => 'nullable|date',
            'end_at' => 'nullable|date|after_or_equal:start_at',
            'discount_type' => 'required|in:percentage,fixed,price_override',
            'discount_value' => 'required|numeric|min:0',
            'categories' => 'required|array|min:1',
            'categories.*.category_id' => 'required|exists:categories,id',
            'categories.*.items' => 'required|array|min:1|max:5',
            'categories.*.items.*.product_id' => 'required|exists:products,id',
            'categories.*.items.*.position' => 'required|integer|between:1,5',
        ]);
    }

    protected function normalizeOfferPayload(array $validated): array
    {
        return [
            'is_active' => $validated['is_active'],
            'start_at' => $validated['start_at'] ?? null,
            'end_at' => $validated['end_at'] ?? null,
            'only_logged_in' => true,
            'selection_limit' => 1,
            'show_once_per_session' => true,
            'reuse_policy' => 'once_per_user',
            'discount_type' => $validated['discount_type'],
            'discount_value' => $validated['discount_value'],
        ];
    }

    protected function syncCategoryItems(GiftBoxOffer $offer, array $categories): void
    {
        GiftBoxOfferCategoryItem::where('gift_box_offer_id', $offer->id)->delete();

        foreach ($categories as $category) {
            $items = $category['items'] ?? [];
            $itemCount = count($items);

            if ($itemCount < 1 || $itemCount > 5) {
                throw new \InvalidArgumentException('Each category must have between one and five products.');
            }

            $positions = collect($items)
                ->pluck('position')
                ->map(fn ($pos) => (int) $pos)
                ->toArray();

            if (count(array_unique($positions)) !== $itemCount) {
                throw new \InvalidArgumentException('Each category must have unique positions.');
            }

            sort($positions);
            if ($positions !== range(1, $itemCount)) {
                throw new \InvalidArgumentException('Positions must be sequential starting at 1.');
            }

            $productIds = collect($items)
                ->pluck('product_id')
                ->map(fn ($id) => (int) $id)
                ->toArray();

            if (count(array_unique($productIds)) !== $itemCount) {
                throw new \InvalidArgumentException('Each category must have unique products.');
            }

            foreach ($items as $item) {
                GiftBoxOfferCategoryItem::create([
                    'gift_box_offer_id' => $offer->id,
                    'category_id' => $category['category_id'],
                    'product_id' => $item['product_id'],
                    'position' => $item['position'],
                ]);
            }
        }
    }

    protected function formatOffer(GiftBoxOffer $offer): array
    {
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
                            'product_name' => $item->product?->name,
                            'position' => $item->position,
                        ];
                    })->values(),
                ];
            })
            ->values();

        return [
            'id' => $offer->id,
            'is_active' => $offer->is_active,
            'start_at' => optional($offer->start_at)->toDateTimeString(),
            'end_at' => optional($offer->end_at)->toDateTimeString(),
            'only_logged_in' => $offer->only_logged_in,
            'selection_limit' => $offer->selection_limit,
            'show_once_per_session' => $offer->show_once_per_session,
            'reuse_policy' => $offer->reuse_policy,
            'discount_type' => $offer->discount_type,
            'discount_value' => $offer->discount_value,
            'categories' => $categories,
        ];
    }
}
