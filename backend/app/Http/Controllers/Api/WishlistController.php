<?php

namespace App\Http\Controllers\Api;

use App\Models\Wishlist;
use Illuminate\Http\Request;

class WishlistController extends BaseController
{
    public function index(Request $request)
    {
        $wishlists = $request->user()
            ->wishlists()
            ->with([
                'product.images',
                'product.categories' => fn($q) => $q
                    ->where(function ($cq) {
                        $cq->whereNull('categories.is_default')->orWhere('categories.is_default', false);
                    })
                    ->where(function ($cq) {
                        $cq->whereNull('categories.slug')->orWhere('categories.slug', '!=', 'uncategorized');
                    })
            ])
            ->get();

        return $this->success($wishlists->pluck('product'));
    }

    public function toggle(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $user = $request->user();
        $existing = $user->wishlists()->where('product_id', $validated['product_id'])->first();

        if ($existing) {
            $existing->delete();
            return $this->success(null, 'Removed from wishlist');
        }

        $user->wishlists()->create(['product_id' => $validated['product_id']]);

        return $this->success(null, 'Added to wishlist', 201);
    }

    public function add(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $user = $request->user();
        $existing = $user->wishlists()->where('product_id', $validated['product_id'])->first();

        if ($existing) {
            return $this->error('Product already in wishlist', 400);
        }

        $user->wishlists()->create(['product_id' => $validated['product_id']]);

        return $this->success(null, 'Added to wishlist', 201);
    }

    public function remove(Request $request, $productId)
    {
        $request->user()->wishlists()->where('product_id', $productId)->delete();

        return $this->success(null, 'Removed from wishlist');
    }

    public function check(Request $request, $productId)
    {
        $exists = $request->user()->wishlists()->where('product_id', $productId)->exists();

        return $this->success(['in_wishlist' => $exists]);
    }
}
