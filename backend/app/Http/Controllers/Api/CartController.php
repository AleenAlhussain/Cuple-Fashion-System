<?php

namespace App\Http\Controllers\Api;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;

class CartController extends BaseController
{
    public function index(Request $request)
    {
        $cart = $this->getCart($request);

        if (!$cart) {
            return $this->success([
                'items' => [],
                'subtotal' => 0,
                'total_items' => 0,
                'is_digital_only' => false,
            ]);
        }

        $cart->load([
            'items.product.images',
            'items.variant.attributeValues.attribute',
        ]);

        $isDigitalOnly = $cart->items->every(function ($item) {
            return $item->product->is_digital;
        });

        return $this->success([
            'items' => $cart->items,
            'subtotal' => $cart->subtotal,
            'total_items' => $cart->total_items,
            'is_digital_only' => $isDigitalOnly,
        ]);
    }

    public function add(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $variant = $validated['variant_id'] ? ProductVariant::find($validated['variant_id']) : null;

        // Check stock
        $stockQty = $variant ? $variant->stock_quantity : $product->stock_quantity;
        if ($product->manage_stock && $stockQty < $validated['quantity']) {
            return $this->error('Not enough stock available.', 400);
        }

        $cart = $this->getOrCreateCart($request);

        // Check if item already exists
        $existingItem = $cart->items()
            ->where('product_id', $product->id)
            ->where('product_variant_id', $variant?->id)
            ->first();

        if ($existingItem) {
            $newQty = $existingItem->quantity + $validated['quantity'];
            if ($product->manage_stock && $stockQty < $newQty) {
                return $this->error('Not enough stock available.', 400);
            }
            $existingItem->update(['quantity' => $newQty]);
        } else {
            $price = $variant?->price ?? $product->price;
            $salePrice = $variant?->sale_price ?? $product->sale_price;

            $cart->items()->create([
                'product_id' => $product->id,
                'product_variant_id' => $variant?->id,
                'quantity' => $validated['quantity'],
                'price' => $price,
                'sale_price' => $salePrice,
            ]);
        }

        return $this->index($request);
    }

    public function update(Request $request, $itemId)
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $cart = $this->getCart($request);

        if (!$cart) {
            return $this->error('Cart not found.', 404);
        }

        $item = $cart->items()->findOrFail($itemId);

        // Check stock
        $product = $item->product;
        $variant = $item->variant;
        $stockQty = $variant ? $variant->stock_quantity : $product->stock_quantity;

        if ($product->manage_stock && $stockQty < $validated['quantity']) {
            return $this->error('Not enough stock available.', 400);
        }

        $item->update(['quantity' => $validated['quantity']]);

        return $this->index($request);
    }

    public function remove(Request $request, $itemId)
    {
        $cart = $this->getCart($request);

        if (!$cart) {
            return $this->error('Cart not found.', 404);
        }

        $item = $cart->items()->find($itemId);

        if ($item) {
            $item->delete();
        }

        return $this->index($request);
    }

    public function clear(Request $request)
    {
        $cart = $this->getCart($request);

        if ($cart) {
            $cart->items()->delete();
        }

        return $this->success(null, 'Cart cleared successfully');
    }

    public function sync(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $cart = $this->getOrCreateCart($request);
        $cart->items()->delete();

        foreach ($validated['items'] as $item) {
            $product = Product::find($item['product_id']);
            $variant = isset($item['variant_id']) ? ProductVariant::find($item['variant_id']) : null;

            $price = $variant?->price ?? $product->price;
            $salePrice = $variant?->sale_price ?? $product->sale_price;

            $cart->items()->create([
                'product_id' => $item['product_id'],
                'product_variant_id' => $item['variant_id'] ?? null,
                'quantity' => $item['quantity'],
                'price' => $price,
                'sale_price' => $salePrice,
            ]);
        }

        return $this->index($request);
    }

    protected function getCart(Request $request): ?Cart
    {
        if ($request->user()) {
            return Cart::where('user_id', $request->user()->id)->first();
        }

        $sessionId = $request->header('X-Session-ID') ?? $request->session_id;
        if ($sessionId) {
            return Cart::where('session_id', $sessionId)->first();
        }

        return null;
    }

    protected function getOrCreateCart(Request $request): Cart
    {
        if ($request->user()) {
            return Cart::firstOrCreate(
                ['user_id' => $request->user()->id],
                ['country_id' => $request->user()->country_id]
            );
        }

        $sessionId = $request->header('X-Session-ID') ?? $request->session_id ?? uniqid('cart_');

        return Cart::firstOrCreate(
            ['session_id' => $sessionId],
            ['country_id' => $request->country_id]
        );
    }
}
