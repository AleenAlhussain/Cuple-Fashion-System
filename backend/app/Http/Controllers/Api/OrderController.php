<?php

namespace App\Http\Controllers\Api;

use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\Country;
use App\Models\Address;
use App\Services\GeneralSettingService;
use App\Services\InvoiceService;
use App\Services\OrderCalculationService;
use App\Services\ShippingCalculator;
use App\Services\StripeService;
use App\Services\OfferEngine\OfferEngineService;
use App\Models\DiscountRuleUsage;
use App\Models\Point;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use App\Services\AramexShipmentService;
use App\Services\ZapierWebhookService;

class OrderController extends BaseController
{
    protected InvoiceService $invoiceService;
    protected OrderCalculationService $orderCalculationService;
    protected ShippingCalculator $shippingCalculator;
    protected ?StripeService $stripeService = null;
    protected GeneralSettingService $generalSettingService;
    protected OfferEngineService $offerEngineService;

    protected const STRIPE_METHODS = [
        'stripe_card',
        'apple_pay',
        'google_pay',
    ];

    public function __construct(
        InvoiceService $invoiceService,
        OrderCalculationService $orderCalculationService,
        ShippingCalculator $shippingCalculator,
        GeneralSettingService $generalSettingService,
        OfferEngineService $offerEngineService
    )
    {
        $this->invoiceService = $invoiceService;
        $this->orderCalculationService = $orderCalculationService;
        $this->shippingCalculator = $shippingCalculator;
        $this->generalSettingService = $generalSettingService;
        $this->offerEngineService = $offerEngineService;

        try {
            $this->stripeService = app(StripeService::class);
        } catch (\Throwable $e) {
            // Stripe not configured - non-Stripe payment methods still work
        }
    }

    public function statuses()
    {
        $statuses = [
            ['id' => 1, 'name' => 'Pending', 'slug' => 'pending', 'sequence' => 1],
            ['id' => 2, 'name' => 'Confirmed', 'slug' => 'confirmed', 'sequence' => 2],
            ['id' => 3, 'name' => 'Processing', 'slug' => 'processing', 'sequence' => 3],
            ['id' => 4, 'name' => 'Shipped', 'slug' => 'shipped', 'sequence' => 4],
            ['id' => 5, 'name' => 'Out for Delivery', 'slug' => 'out-for-delivery', 'sequence' => 5],
            ['id' => 6, 'name' => 'Delivered', 'slug' => 'delivered', 'sequence' => 6],
            ['id' => 7, 'name' => 'Cancelled', 'slug' => 'cancelled', 'sequence' => 7],
        ];

        return $this->success($statuses);
    }

    public function index(Request $request)
    {
        $orders = Order::with(['items.product.images', 'country'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate($request->input('paginate', 10));

        return $this->paginated($orders);
    }

    public function show(Request $request, $id)
    {
        // Support both numeric ID and order_number
        $query = Order::with(['items.product.images', 'items.variant', 'country', 'invoice'])
            ->where('user_id', $request->user()->id);

        // Always try order_number first (since frontend passes order_number like "00004")
        // Then fall back to ID lookup
        $order = $query->where('order_number', $id)->first();

        if (!$order && ctype_digit($id)) {
            // Not found by order_number, try by ID
            $order = Order::with(['items.product.images', 'items.variant', 'country', 'invoice'])
                ->where('user_id', $request->user()->id)
                ->find((int)$id);
        }

        if (!$order) {
            return $this->error('Order not found', 404);
        }

        // Transform to match frontend expected format
        return $this->success($this->transformOrderForFrontend($order));
    }

    /**
     * Transform order data for frontend display
     */
    protected function transformOrderForFrontend($order)
    {
        $orderData = $order->toArray();

        $returnRequests = ReturnRequest::where('order_id', $order->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy(function ($req) {
                return $req->order_item_id . ':' . $req->type;
            });
        $orderData['has_open_return_request'] = ReturnRequest::where('order_id', $order->id)
            ->where('user_id', $order->user_id)
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->exists();

        // Map items to products format expected by frontend
        $orderData['products'] = collect($order->items)->map(function ($item) use ($returnRequests) {
            $refundReq = $returnRequests->get($item->id . ':refund')?->first();
            $exchangeReq = $returnRequests->get($item->id . ':exchange')?->first();
            return [
                'id' => $item->product_id,
                'name' => $item->product_name,
                'product_thumbnail' => $item->product?->main_image ?? $item->product?->images?->first()?->image_url,
                'is_return' => $item->product?->is_return ?? 1,
                'is_exchange' => $item->product?->is_exchange ?? 1,
                'pivot' => [
                    'order_item_id' => $item->id,
                    'order_id' => $item->order_id,
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'single_price' => $item->price,
                    'subtotal' => $item->total,
                    'variation' => $item->variant ? [
                        'id' => $item->variant->id,
                        'name' => $item->variant_name,
                        'variation_image' => $item->variant->main_image,
                    ] : null,
                    'refund_status' => $refundReq?->status,
                    'exchange_status' => $exchangeReq?->status,
                ],
            ];
        })->toArray();

        // Add order_status object
        $statusMap = [
            'pending' => ['id' => 1, 'name' => 'Pending', 'slug' => 'pending', 'sequence' => 1],
            'confirmed' => ['id' => 2, 'name' => 'Confirmed', 'slug' => 'confirmed', 'sequence' => 2],
            'processing' => ['id' => 3, 'name' => 'Processing', 'slug' => 'processing', 'sequence' => 3],
            'shipped' => ['id' => 4, 'name' => 'Shipped', 'slug' => 'shipped', 'sequence' => 4],
            'out-for-delivery' => ['id' => 5, 'name' => 'Out for Delivery', 'slug' => 'out-for-delivery', 'sequence' => 5],
            'delivered' => ['id' => 6, 'name' => 'Delivered', 'slug' => 'delivered', 'sequence' => 6],
            'cancelled' => ['id' => 7, 'name' => 'Cancelled', 'slug' => 'cancelled', 'sequence' => 7],
        ];
        $orderData['order_status'] = $statusMap[$order->status] ?? $statusMap['pending'];

        // Add consumer info
        $orderData['consumer'] = [
            'name' => trim(($order->shipping_first_name ?? '') . ' ' . ($order->shipping_last_name ?? '')),
            'email' => $order->shipping_email,
            'phone' => $order->shipping_phone,
        ];

        // Get country code from country relation if available
        $countryCode = $order->country?->phone_code ?? '';

        // Add shipping_address object
        $orderData['shipping_address'] = [
            'street' => $order->shipping_street,
            'address' => $order->shipping_street,
            'city' => $order->shipping_city,
            'state' => ['name' => $order->shipping_state],
            'country' => ['name' => $order->shipping_country],
            'pincode' => $order->shipping_postal_code,
            'phone' => $order->shipping_phone,
            'country_code' => $countryCode,
        ];

        // Add billing_address (use billing fields if available, otherwise use shipping)
        $orderData['billing_address'] = [
            'street' => $order->billing_street ?? $order->shipping_street,
            'address' => $order->billing_street ?? $order->shipping_street,
            'city' => $order->billing_city ?? $order->shipping_city,
            'state' => ['name' => $order->billing_state ?? $order->shipping_state],
            'country' => ['name' => $order->billing_country ?? $order->shipping_country],
            'pincode' => $order->billing_postal_code ?? $order->shipping_postal_code,
            'phone' => $order->billing_phone ?? $order->shipping_phone,
            'country_code' => $countryCode,
        ];

        // Add invoice_url if invoice exists
        $orderData['invoice_url'] = $order->invoice ? $this->buildInvoiceDownloadUrl((string) $order->order_number) : null;

        // Map field names to match frontend expectations
        $orderData['amount'] = $order->subtotal;
        $orderData['shipping_total'] = $order->shipping_amount;
        $orderData['tax_total'] = $order->tax_amount;
        // total already exists with correct name

        // Add tracking info if available
        $orderData['tracking_number'] = $order->tracking_number ?? null;
        $orderData['shipping_carrier'] = $order->carrier ?? null;
        $orderData['delivery_description'] = $order->delivery_description ?? null;

        $orderData['payment_fee'] = $order->payment_fee ?? 0;
        $orderData['delivered_at'] = $order->delivered_at;

        // Add discount rule name if rule-based discount was applied
        if ($order->rule_discount_amount > 0 && !empty($order->applied_discount_rules)) {
            $ruleIds = is_array($order->applied_discount_rules) ? $order->applied_discount_rules : [];
            if (!empty($ruleIds)) {
                $rules = \App\Models\DiscountRule::whereIn('id', $ruleIds)->pluck('name')->toArray();
                $orderData['rule_discount_name'] = implode(', ', $rules);
            }
        }

        return $orderData;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            // For logged-in users: billing_address_id is used as shipping if shipping_address_id not provided
            'shipping_address_id' => 'nullable|exists:addresses,id',
            'billing_address_id' => 'nullable|exists:addresses,id',
            'shipping_latitude' => 'nullable|numeric|between:-90,90',
            'shipping_longitude' => 'nullable|numeric|between:-180,180',
            // For guest checkout: require shipping details if no address IDs
            'shipping_first_name' => 'required_without_all:shipping_address_id,billing_address_id|string|max:255',
            'shipping_last_name' => 'required_without_all:shipping_address_id,billing_address_id|string|max:255',
            'shipping_phone' => 'required_without_all:shipping_address_id,billing_address_id|string|max:20',
            'shipping_email' => 'nullable|email|max:255',
            'shipping_street' => 'required_without_all:shipping_address_id,billing_address_id|string|max:500',
            'shipping_apartment' => 'nullable|string|max:255',
            'shipping_city' => 'required_without_all:shipping_address_id,billing_address_id|string|max:255',
            'shipping_state' => 'nullable|string|max:255',
            'shipping_postal_code' => 'nullable|string|max:20',
            'shipping_country_id' => 'required_without_all:shipping_address_id,billing_address_id|exists:countries,id',
            'payment_method' => 'required|string',
            'payment_intent_id' => 'nullable|string',
            'coupon_code' => 'nullable|string|exists:coupons,code',
            'customer_notes' => 'nullable|string|max:1000',
            'country_id' => 'required|exists:countries,id',
            // Support items from frontend (since frontend uses local storage cart)
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.color' => 'nullable|string|max:100',
            'items.*.size' => 'nullable|string|max:100',
            'items.*.custom_price' => 'nullable|numeric|min:0',
            'items.*.base_price' => 'nullable|numeric|min:0',
            'items.*.matchi_bundle_key' => 'nullable|string|max:191',
            'items.*.matchi_bundle_sale_total' => 'nullable|numeric|min:0',
            'items.*.matchi_bundle_original_total' => 'nullable|numeric|min:0',
            'items.*.matchi_pair_id' => 'nullable|string|max:191',
            'points_to_use' => 'nullable|numeric|min:0',
        ]);

        $user = auth('sanctum')->user(); 
        if (!$user) {
          return $this->error('Unauthenticated. Please login or use guest checkout.', 401);
        }

        $giftBoxSelectionId = null;
        $giftBoxDiscountTotal = 0;

        // Check if items are provided in request (frontend local storage cart)
        $useRequestItems = !empty($validated['items']);

        if ($useRequestItems) {
            $prepared = $this->orderCalculationService->prepareItems($validated['items'], $user);
            $itemsData = $prepared['items'];
            $subtotal = $prepared['subtotal'];
            $giftBoxSelectionId = $prepared['gift_box_selection_id'] ?? null;
            $giftBoxDiscountTotal = $prepared['gift_box_discount_total'] ?? 0;

            if (empty($itemsData)) {
                return $this->error('Cart is empty.', 400);
            }
        } else {
            // Use database cart
            $cart = Cart::where('user_id', $user->id)->with('items.product', 'items.variant')->first();

            if (!$cart || $cart->items->isEmpty()) {
                return $this->error('Cart is empty.', 400);
            }

            $subtotal = $cart->subtotal;
        }

        $clientIp = $this->resolveClientIp($request);

        // Get shipping address (use billing_address_id as fallback for logged-in users)
        $shippingAddressId = $validated['shipping_address_id'] ?? $validated['billing_address_id'] ?? null;
        if ($shippingAddressId) {
            $shippingAddress = $user->addresses()->findOrFail($shippingAddressId);
            $shippingAddressIp = $shippingAddress->ip_address ?: $clientIp;
            $shippingLatitude = $shippingAddress->latitude;
            $shippingLongitude = $shippingAddress->longitude;

            // Fall back to user's name if address doesn't have first/last name
            $firstName = $shippingAddress->first_name;
            $lastName = $shippingAddress->last_name;
            if (empty($firstName) && !empty($user->name)) {
                [$firstName, $lastName] = $this->splitName($user->name);
            }

            $shippingData = [
                'shipping_first_name' => $firstName ?: $user->name,
                'shipping_last_name' => $lastName ?: '',
                'shipping_phone' => $shippingAddress->phone,
                'shipping_email' => $shippingAddress->email ?? $user->email,
                'shipping_street' => $shippingAddress->street,
                'shipping_apartment' => $shippingAddress->apartment,
                'shipping_city' => $shippingAddress->city,
                'shipping_state' => $shippingAddress->state,
                'shipping_postal_code' => $shippingAddress->postal_code,
                'shipping_country' => $shippingAddress->country->name ?? '',
            ];
        } else {
            $shippingAddressIp = $clientIp;
            $shippingLatitude = $validated['shipping_latitude'] ?? null;
            $shippingLongitude = $validated['shipping_longitude'] ?? null;
            $country = Country::find($validated['shipping_country_id']);
            $shippingData = [
                'shipping_first_name' => $validated['shipping_first_name'],
                'shipping_last_name' => $validated['shipping_last_name'],
                'shipping_phone' => $validated['shipping_phone'],
                'shipping_email' => $validated['shipping_email'] ?? $user->email,
                'shipping_street' => $validated['shipping_street'],
                'shipping_apartment' => $validated['shipping_apartment'] ?? null,
                'shipping_city' => $validated['shipping_city'],
                'shipping_state' => $validated['shipping_state'] ?? null,
                'shipping_postal_code' => $validated['shipping_postal_code'] ?? null,
                'shipping_country' => $country->name,
            ];

            // Save address to user's account for future use
            $this->saveUserAddress($user->id, [
                'first_name' => $validated['shipping_first_name'],
                'last_name' => $validated['shipping_last_name'],
                'phone' => $validated['shipping_phone'],
                'email' => $validated['shipping_email'] ?? $user->email,
                'street' => $validated['shipping_street'],
                'apartment' => $validated['shipping_apartment'] ?? null,
                'city' => $validated['shipping_city'],
                'state' => $validated['shipping_state'] ?? null,
                'postal_code' => $validated['shipping_postal_code'] ?? null,
                'country_id' => $validated['shipping_country_id'],
                'ip_address' => $shippingAddressIp,
                'latitude' => $shippingLatitude,
                'longitude' => $shippingLongitude,
            ]);
        }

        // Calculate totals - subtotal already calculated above for request items
        $discountAmount = 0;
        $couponCode = null;
        $ruleDiscountAmount = 0;
        $appliedDiscountRules = [];

        // Apply coupon
        if (isset($validated['coupon_code'])) {
            $coupon = Coupon::where('code', $validated['coupon_code'])->valid()->first();
            if ($coupon && $coupon->isValidForCountry($validated['country_id'])) {
                $discountAmount = $coupon->calculateDiscount($subtotal);
                $couponCode = $coupon->code;
                $coupon->increment('usage_count');
            }
        }

        // Calculate rule-based discounts using Offer Engine
        $discountResult = null;
        if ($useRequestItems && !empty($itemsData)) {
            $cartItemsForEngine = collect($itemsData)->map(function ($item) {
                return [
                    'variant_id' => $item['variant']?->id,
                    'variant_sku' => $item['variant']?->sku ?? $item['product']->sku,
                    'product_id' => $item['product']->id,
                    'price' => $item['price'],
                    'qty' => $item['quantity'],
                    'category_ids' => $item['product']->categories->pluck('id')->toArray(),
                ];
            })->toArray();

            $discountContext = [
                'user_id' => $user->id,
                'country_id' => $validated['country_id'],
            ];

            $discountResult = $this->offerEngineService->calculate($cartItemsForEngine, $discountContext);

            if ($discountResult->hasDiscounts()) {
                $ruleDiscountAmount = $discountResult->getTotalDiscount();
                $appliedDiscountRules = $discountResult->getAppliedRuleIds();
            }
        }

        $shippingCountryId = $shippingAddressId
            ? $shippingAddress->country_id
            : ($validated['shipping_country_id'] ?? $validated['country_id']);

        $itemsQuantity = (int) collect($itemsData)->sum('quantity');
        $shippingResult = $this->shippingCalculator->calculateForCountry($shippingCountryId, $subtotal, $itemsQuantity);
        $shippingAmount = $shippingResult['shipping_amount'];
        $shippingMethod = $shippingResult['rate'] ? $shippingResult['rate']->name : null;
        $paymentFee = $this->generalSettingService->getPaymentFee($validated['payment_method'] ?? null);

        $taxAmount = 0; // Calculate if needed
        $totalDiscounts = $discountAmount + $ruleDiscountAmount + $giftBoxDiscountTotal;

        // Points redemption
        $pointsRedeemed = 0;
        $pointsDiscountAmount = 0;

        if (!empty($validated['points_to_use']) && $validated['points_to_use'] > 0 && $user) {
            $point = Point::getOrCreate($user->id);
            $requestedPoints = (float) $validated['points_to_use'];
            $ratio = Point::getCurrencyRatio();
            $maxPercent = Point::getMaxRedeemPercent();
            $orderBaseAmount = $subtotal - $totalDiscounts;

            $requestedValue = $requestedPoints * $ratio;
            $maxDiscountValue = $orderBaseAmount * ($maxPercent / 100);
            $allowedValue = min($requestedValue, $maxDiscountValue);
            $pointsRedeemed = $ratio > 0 ? (int) floor($allowedValue / $ratio) : 0;
            $pointsRedeemed = min($pointsRedeemed, (int) floor((float) $point->balance));
            $pointsDiscountAmount = round($pointsRedeemed * $ratio, 2);
        }

        $total = $subtotal - $totalDiscounts - $pointsDiscountAmount + $shippingAmount + $taxAmount + $paymentFee;

        $country = Country::find($validated['country_id']);

        DB::beginTransaction();
        try {
            $order = Order::create([
                'user_id' => $user->id,
                'sales_channel' => 'online',
                'created_by_user_id' => null,
               // 'email' => $user->email ?? ($shippingData['shipping_email'] ?? null),
                'country_id' => $validated['country_id'],
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'rule_discount_amount' => $ruleDiscountAmount,
                'applied_discount_rules' => !empty($appliedDiscountRules) ? $appliedDiscountRules : null,
                'gift_box_discount_amount' => $giftBoxDiscountTotal,
                'points_redeemed' => $pointsRedeemed,
                'points_discount_amount' => $pointsDiscountAmount,
                'shipping_amount' => $shippingAmount,
                'shipping_method' => $shippingMethod,
                'payment_fee' => $paymentFee,
                'tax_amount' => $taxAmount,
                'total' => $total,
                'currency' => $country->currency,
                'coupon_code' => $couponCode,
                'client_ip' => $clientIp,
                'customer_notes' => $validated['customer_notes'] ?? null,
                'is_guest' => 0,
                'shipping_address_ip' => $shippingAddressIp,
                'billing_address_ip' => $shippingAddressIp,
                'shipping_latitude' => $shippingLatitude,
                'shipping_longitude' => $shippingLongitude,
                'billing_latitude' => $shippingLatitude,
                'billing_longitude' => $shippingLongitude,
                ...$shippingData,
            ]);

            // Debit points after order creation
            if ($pointsRedeemed > 0) {
                $point = Point::getOrCreate($user->id);
                $point->debit($pointsRedeemed, 'points_redeem', $order->id, null, 'order:' . $order->id);
            }

            // Create order items - use request items or database cart
            if ($useRequestItems) {
                foreach ($itemsData as $itemData) {
                    // Build options array with color and size
                    $options = [];
                    if (!empty($itemData['color'])) {
                        $options['Color'] = $itemData['color'];
                    }
                    if (!empty($itemData['size'])) {
                        $options['Size'] = $itemData['size'];
                    }

                    $order->items()->create([
                        'product_id' => $itemData['product']->id,
                        'product_variant_id' => $itemData['variant']?->id,
                        'product_name' => $itemData['product']->name,
                        'variant_name' => $itemData['variant']?->variant_name,
                        'sku' => $itemData['variant']?->sku ?? $itemData['product']->sku,
                        'quantity' => $itemData['quantity'],
                        'price' => $itemData['price'],
                        'total' => $itemData['total'],
                        'options' => !empty($options) ? $options : null,
                    ]);

                    // Update stock
                    if ($itemData['product']->manage_stock) {
                        if ($itemData['variant']) {
                            $itemData['variant']->decrement('stock_quantity', $itemData['quantity']);
                        } else {
                            $itemData['product']->decrement('stock_quantity', $itemData['quantity']);
                        }
                    }
                }
            } else {
                foreach ($cart->items as $item) {
                    $order->items()->create([
                        'product_id' => $item->product_id,
                        'product_variant_id' => $item->product_variant_id,
                        'product_name' => $item->product->name,
                        'variant_name' => $item->variant?->variant_name,
                        'sku' => $item->variant?->sku ?? $item->product->sku,
                        'quantity' => $item->quantity,
                        'price' => $item->final_price,
                        'total' => $item->total,
                        'options' => $item->variant?->attributeValues->mapWithKeys(function ($av) {
                            return [$av->attribute->name => $av->value];
                        }),
                    ]);

                    // Update stock
                    if ($item->product->manage_stock) {
                        if ($item->variant) {
                            $item->variant->decrement('stock_quantity', $item->quantity);
                        } else {
                            $item->product->decrement('stock_quantity', $item->quantity);
                        }
                    }
                }

                // Clear database cart only if using it
                $cart->items()->delete();
            }

            if (!empty($giftBoxSelectionId) && $giftBoxDiscountTotal > 0) {
                $selection = \App\Models\GiftBoxSelection::where('id', $giftBoxSelectionId)
                    ->where('user_id', $user->id)
                    ->where('status', 'confirmed')
                    ->first();

                if ($selection) {
                    $selection->update([
                        'status' => 'applied',
                        'order_id' => $order->id,
                    ]);
                }
            }

            // Record discount usage for reporting
            if ($discountResult && $discountResult->hasDiscounts()) {
                $appliedRulesData = $discountResult->getAppliedRulesForRecording();
                DiscountRuleUsage::recordOrderUsages($order->id, $appliedRulesData, $user->id);
            }

            if ($this->isStripeMethod($validated['payment_method'])) {
                $this->finalizeStripePayment($order, $validated['payment_intent_id'] ?? null);
            }

            DB::commit();

            $this->scheduleOrderPostProcessingAfterResponse($order->id);

            return $this->success(
                $order->load(['items.product.images', 'country']),
                'Order placed successfully',
                201
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Failed to place order. ' . $e->getMessage(), 500);
        }
    }

    public function cancel(Request $request, $id)
    {
        $order = Order::where('user_id', $request->user()->id)->findOrFail($id);

        if (!$order->canBeCancelled()) {
            return $this->error('This order cannot be cancelled.', 400);
        }

        $order->update(['status' => 'cancelled']);

        // Restore stock
        foreach ($order->items as $item) {
            if ($item->product->manage_stock) {
                if ($item->variant) {
                    $item->variant->increment('stock_quantity', $item->quantity);
                } else {
                    $item->product->increment('stock_quantity', $item->quantity);
                }
            }
        }

        return $this->success($order->fresh(), 'Order cancelled successfully');
    }

    // Guest checkout
    public function guestCheckout(Request $request)
    {
        $this->hydrateGuestShippingAddress($request);
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.color' => 'nullable|string|max:100',
            'items.*.size' => 'nullable|string|max:100',
            'items.*.custom_price' => 'nullable|numeric|min:0',
            'items.*.base_price' => 'nullable|numeric|min:0',
            'items.*.matchi_bundle_key' => 'nullable|string|max:191',
            'items.*.matchi_bundle_sale_total' => 'nullable|numeric|min:0',
            'items.*.matchi_bundle_original_total' => 'nullable|numeric|min:0',
            'items.*.matchi_pair_id' => 'nullable|string|max:191',
            // Support multiple formats: name, shipping_name, or shipping_first_name/shipping_last_name
            'name' => 'nullable|string|max:255',
            'shipping_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'shipping_first_name' => 'nullable|string|max:255',
            'shipping_last_name' => 'nullable|string|max:255',
            'shipping_email' => 'nullable|email|max:255',
            'shipping_phone' => 'nullable|string|max:50',
            'shipping_street' => 'required|string|max:500',
            'shipping_apartment' => 'nullable|string|max:255',
            'shipping_city' => 'required|string|max:255',
            'shipping_state' => 'nullable|string|max:255',
            'shipping_postal_code' => 'nullable|string|max:20',
            'shipping_country' => 'nullable|string|max:255',
            'shipping_country_id' => 'nullable|exists:countries,id',
            'shipping_latitude' => 'nullable|numeric|between:-90,90',
            'shipping_longitude' => 'nullable|numeric|between:-180,180',
            'payment_method' => 'required|string',
            'payment_intent_id' => 'nullable|string',
            'coupon_code' => 'nullable|string',
            'customer_notes' => 'nullable|string|max:1000',
            'country_id' => 'required|exists:countries,id',
            'create_account' => 'nullable|boolean',
            'password' => 'required_if:create_account,true|nullable|string|min:8',
            'password_confirmation' => 'required_if:create_account,true|nullable|same:password',
        ]);

        // Check if email already exists when creating account
        if ($request->boolean('create_account')) {
            $email = $validated['shipping_email'] ?? $validated['email'] ?? null;
            if ($email && \App\Models\User::where('email', $email)->exists()) {
                return $this->error('An account with this email already exists. Please login instead.', 422);
            }
        }

        // Calculate items
        $prepared = $this->orderCalculationService->prepareItems($validated['items'], null);
        $itemsData = $prepared['items'];
        $subtotal = $prepared['subtotal'];
        $giftBoxDiscountTotal = $prepared['gift_box_discount_total'] ?? 0;

        $discountAmount = 0;
        $couponCode = null;
        $coupon = null;
        $ruleDiscountAmount = 0;
        $appliedDiscountRules = [];

        if (!empty($validated['coupon_code'])) {
            $coupon = Coupon::where('code', $validated['coupon_code'])->valid()->first();
            if ($coupon && $coupon->isValidForCountry($validated['country_id'])) {
                $discountAmount = $coupon->calculateDiscount($subtotal);
                $couponCode = $coupon->code;
            }
        }

        // Calculate rule-based discounts using Offer Engine
        $discountResult = null;
        if (!empty($itemsData)) {
            $cartItemsForEngine = collect($itemsData)->map(function ($item) {
                return [
                    'variant_id' => $item['variant']?->id,
                    'variant_sku' => $item['variant']?->sku ?? $item['product']->sku,
                    'product_id' => $item['product']->id,
                    'price' => $item['price'],
                    'qty' => $item['quantity'],
                    'category_ids' => $item['product']->categories->pluck('id')->toArray(),
                ];
            })->toArray();

            $discountContext = [
                'user_id' => null, // Guest user
                'country_id' => $validated['country_id'],
            ];

            $discountResult = $this->offerEngineService->calculate($cartItemsForEngine, $discountContext);

            if ($discountResult->hasDiscounts()) {
                $ruleDiscountAmount = $discountResult->getTotalDiscount();
                $appliedDiscountRules = $discountResult->getAppliedRuleIds();
            }
        }

        $country = Country::find($validated['country_id']);
        $shippingCountryId = $validated['shipping_country_id'] ?? $validated['country_id'];
        $shippingCountry = Country::find($shippingCountryId);
        $itemsQuantity = (int) collect($itemsData)->sum('quantity');
        $shippingResult = $this->shippingCalculator->calculateForCountry($shippingCountryId, $subtotal, $itemsQuantity);
        $shippingAmount = $shippingResult['shipping_amount'];
        $shippingMethod = $shippingResult['rate'] ? $shippingResult['rate']->name : null;
        $paymentFee = $this->generalSettingService->getPaymentFee($validated['payment_method'] ?? null);
        $totalDiscounts = $discountAmount + $ruleDiscountAmount + $giftBoxDiscountTotal;
        $total = $subtotal - $totalDiscounts + $shippingAmount + $paymentFee;

        // Get customer name - support multiple formats
        $firstName = $validated['shipping_first_name'] ?? null;
        $lastName = $validated['shipping_last_name'] ?? null;
        if (!$firstName) {
            $fullName = $validated['shipping_name'] ?? $validated['name'] ?? null;
            if ($fullName) {
                [$firstName, $lastName] = $this->splitName($fullName);
            }
        }

        // Get email and phone - support both old and new format
        $email = $validated['shipping_email'] ?? $validated['email'] ?? null;
        $phone = $validated['shipping_phone'] ?? $validated['phone'] ?? null;

        // Get shipping country name
        $shippingCountryName = $validated['shipping_country'] ?? $shippingCountry?->name ?? '';
        $clientIp = $this->resolveClientIp($request);
        $shippingAddressIp = $clientIp;
        $shippingLatitude = $validated['shipping_latitude'] ?? null;
        $shippingLongitude = $validated['shipping_longitude'] ?? null;

        DB::beginTransaction();
        try {
            $userId = null;

            // Create account if requested
            if ($request->boolean('create_account') && !empty($validated['password'])) {
                $fullName = trim(($firstName ?? '') . ' ' . ($lastName ?? ''));
                $user = \App\Models\User::create([
                    'name' => $fullName ?: $validated['name'] ?? 'Guest',
                    'email' => $email,
                    'password' => bcrypt($validated['password']),
                    'phone' => $phone,
                    'country_id' => $validated['country_id'],
                    'role' => 'customer',
                    'is_active' => true,
                ]);
                $userId = $user->id;

                // Save shipping address to new user's account
                $this->saveUserAddress($userId, [
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'phone' => $phone,
                    'email' => $email,
                    'street' => $validated['shipping_street'],
                    'apartment' => $validated['shipping_apartment'] ?? null,
                    'city' => $validated['shipping_city'],
                    'state' => $validated['shipping_state'] ?? null,
                    'postal_code' => $validated['shipping_postal_code'] ?? null,
                    'country_id' => $shippingCountryId,
                    'ip_address' => $shippingAddressIp,
                    'latitude' => $shippingLatitude,
                    'longitude' => $shippingLongitude,
                ]);
            }

            $order = Order::create([
                'user_id' => $userId,
                'sales_channel' => 'online',
                'created_by_user_id' => null,
                'country_id' => $validated['country_id'],
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'rule_discount_amount' => $ruleDiscountAmount,
                'applied_discount_rules' => !empty($appliedDiscountRules) ? $appliedDiscountRules : null,
                'gift_box_discount_amount' => $giftBoxDiscountTotal,
                'shipping_amount' => $shippingAmount,
                'shipping_method' => $shippingMethod,
                'payment_fee' => $paymentFee,
                'tax_amount' => 0,
                'total' => $total,
                'currency' => $country->currency ?? 'AED',
                'coupon_code' => $couponCode,
                'client_ip' => $clientIp,
                'shipping_first_name' => $firstName,
                'shipping_last_name' => $lastName,
                'shipping_phone' => $phone,
                'shipping_email' => $email,
                'shipping_street' => $validated['shipping_street'],
                'shipping_apartment' => $validated['shipping_apartment'] ?? null,
                'shipping_city' => $validated['shipping_city'],
                'shipping_state' => $validated['shipping_state'] ?? null,
                'shipping_postal_code' => $validated['shipping_postal_code'] ?? null,
                'shipping_country' => $shippingCountryName,
                'shipping_address_ip' => $shippingAddressIp,
                'billing_address_ip' => $shippingAddressIp,
                'shipping_latitude' => $shippingLatitude,
                'shipping_longitude' => $shippingLongitude,
                'billing_latitude' => $shippingLatitude,
                'billing_longitude' => $shippingLongitude,
                'customer_notes' => $validated['customer_notes'] ?? null,
                'is_guest' => $userId === null,
            ]);

            foreach ($itemsData as $itemData) {
                // Build options array with color and size
                $options = [];
                if (!empty($itemData['color'])) {
                    $options['Color'] = $itemData['color'];
                }
                if (!empty($itemData['size'])) {
                    $options['Size'] = $itemData['size'];
                }

                $order->items()->create([
                    'product_id' => $itemData['product']->id,
                    'product_variant_id' => $itemData['variant']?->id,
                    'product_name' => $itemData['product']->name,
                    'variant_name' => $itemData['variant']?->variant_name,
                    'sku' => $itemData['variant']?->sku ?? $itemData['product']->sku,
                    'quantity' => $itemData['quantity'],
                    'price' => $itemData['price'],
                    'total' => $itemData['total'],
                    'options' => !empty($options) ? $options : null,
                ]);

                // Update stock
                if ($itemData['product']->manage_stock) {
                    if ($itemData['variant']) {
                        $itemData['variant']->decrement('stock_quantity', $itemData['quantity']);
                    } else {
                        $itemData['product']->decrement('stock_quantity', $itemData['quantity']);
                    }
                }
            }

            if ($coupon) {
                $coupon->increment('usage_count');
            }

            // Record discount usage for reporting
            if ($discountResult && $discountResult->hasDiscounts()) {
                $appliedRulesData = $discountResult->getAppliedRulesForRecording();
                DiscountRuleUsage::recordOrderUsages($order->id, $appliedRulesData, $userId);
            }

            if ($this->isStripeMethod($validated['payment_method'])) {
                $this->finalizeStripePayment($order, $validated['payment_intent_id'] ?? null);
            }

            DB::commit();

            $this->scheduleOrderPostProcessingAfterResponse($order->id);
            return $this->success($order->load(['items.product.images', 'invoice']), 'Order placed successfully', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Failed to place order. ' . $e->getMessage(), 500);
        }
    }

    protected function splitName(string $name): array
    {
        $parts = explode(' ', trim($name), 2);
        return [
            $parts[0] ?? '',
            $parts[1] ?? '',
        ];
    }

    protected function isStripeMethod(?string $method): bool
    {
        return in_array($method, self::STRIPE_METHODS, true);
    }

    protected function finalizeStripePayment(Order $order, ?string $paymentIntentId): void
    {
        if (!$this->stripeService) {
            throw new \RuntimeException('Stripe is not configured. Please contact support.');
        }

        if (!$paymentIntentId) {
            throw new \RuntimeException('Stripe payment intent ID is required.');
        }

        $intent = $this->stripeService->retrievePaymentIntent($paymentIntentId);
        $expectedAmount = $this->stripeService->toStripeAmount((float) $order->total);
        $receivedAmount = (int) ($intent['amount_received'] ?? 0);

        if (($intent['status'] ?? '') !== 'succeeded' || $receivedAmount < $expectedAmount) {
            throw new \RuntimeException('Stripe payment was not successful.');
        }

        $order->update([
            'payment_status' => 'paid',
            'transaction_id' => $intent['id'] ?? $paymentIntentId,
        ]);
    }

    protected function hydrateGuestShippingAddress(Request $request)
    {
        $billing = $request->input('billing_address', []);
        $shippingName = $request->input('shipping_name') ?? $request->input('name');
        $overrides = [];

        if (!$request->filled('shipping_first_name')) {
            [$first] = $this->splitName($shippingName ?? $billing['name'] ?? '');
            $overrides['shipping_first_name'] = $first;
        }
        if (!$request->filled('shipping_last_name')) {
            [, $last] = $this->splitName($shippingName ?? $billing['name'] ?? '');
            $overrides['shipping_last_name'] = $last ?? '';
        }
        if (!$request->filled('shipping_phone') && ($request->input('phone') || !empty($billing['phone']))) {
            $overrides['shipping_phone'] = $request->input('shipping_phone') ?: $request->input('phone') ?: $billing['phone'];
        }
        if (!$request->filled('shipping_email') && $request->input('email')) {
            $overrides['shipping_email'] = $request->input('email');
        }

        $overrides['shipping_street'] = $request->input('shipping_street') ?? $billing['street'] ?? null;
        $overrides['shipping_city'] = $request->input('shipping_city') ?? $billing['city'] ?? null;
        $overrides['shipping_state'] = $request->input('shipping_state') ?? $billing['state'] ?? null;
        $overrides['shipping_postal_code'] = $request->input('shipping_postal_code') ?? $billing['postal_code'] ?? null;
        $overrides['shipping_country_id'] = $request->input('shipping_country_id') ?? $billing['country_id'] ?? null;
        $overrides['shipping_country'] = $request->input('shipping_country') ?? $billing['country_name'] ?? null;
        $overrides['shipping_latitude'] = $request->input('shipping_latitude') ?? $billing['latitude'] ?? null;
        $overrides['shipping_longitude'] = $request->input('shipping_longitude') ?? $billing['longitude'] ?? null;

        $filtered = array_filter($overrides, function ($value) {
            return $value !== null;
        });

        if (!empty($filtered)) {
            $request->merge($filtered);
        }
    }

    /**
     * Save address to user's account (avoid duplicates)
     */
    protected function saveUserAddress($userId, array $addressData): ?Address
    {
        if (!$userId) {
            return null;
        }

        // Check if similar address already exists
        $existingAddress = Address::where('user_id', $userId)
            ->where('street', $addressData['street'] ?? '')
            ->where('city', $addressData['city'] ?? '')
            ->where('country_id', $addressData['country_id'] ?? null)
            ->first();

        if ($existingAddress) {
            // Update existing address with any new info
            $existingAddress->update(array_filter($addressData));
            return $existingAddress;
        }

        // Check if user has any addresses (for setting default)
        $hasAddresses = Address::where('user_id', $userId)->exists();

        // Create new address
        $address = Address::create([
            'user_id' => $userId,
            'title' => $addressData['title'] ?? 'Shipping Address',
            'first_name' => $addressData['first_name'] ?? null,
            'last_name' => $addressData['last_name'] ?? null,
            'phone' => $addressData['phone'] ?? null,
            'country_code' => $addressData['country_code'] ?? '+971',
            'ip_address' => $addressData['ip_address'] ?? null,
            'email' => $addressData['email'] ?? null,
            'latitude' => $addressData['latitude'] ?? null,
            'longitude' => $addressData['longitude'] ?? null,
            'street' => $addressData['street'] ?? null,
            'apartment' => $addressData['apartment'] ?? null,
            'city' => $addressData['city'] ?? null,
            'state' => $addressData['state'] ?? null,
            'postal_code' => $addressData['postal_code'] ?? null,
            'country_id' => $addressData['country_id'] ?? null,
            'is_default_shipping' => !$hasAddresses, // First address is default
            'is_default_billing' => !$hasAddresses,
        ]);

        return $address;
    }

    public function downloadInvoice(Request $request)
    {
        $validated = $request->validate([
            'order_number' => 'required|string',
        ]);

        $order = Order::where('user_id', $request->user()->id)
            ->where('order_number', $validated['order_number'])
            ->with('invoice')
            ->firstOrFail();

        return $this->downloadInvoiceForOrder($order);
    }

    public function downloadInvoiceByNumber(Request $request, string $orderNumber)
    {
        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with('invoice')
            ->firstOrFail();

        return $this->downloadInvoiceForOrder($order);
    }

    private function downloadInvoiceForOrder(Order $order)
    {
        if (!$order->invoice) {
            $invoice = $this->invoiceService->generateInvoice($order);
        } else {
            $invoice = $order->invoice;
        }

        return $this->invoiceService->downloadPdf($invoice);
    }

    private function buildInvoiceDownloadUrl(string $orderNumber): string
    {
        return URL::signedRoute('website.order.invoice.download', [
            'orderNumber' => $orderNumber,
        ]);
    }

    private function scheduleOrderPostProcessingAfterResponse(int $orderId): void
    {
        app()->terminating(function () use ($orderId) {
            $this->runOrderPostProcessing($orderId);
        });
    }

    private function runOrderPostProcessing(int $orderId): void
    {
        $order = Order::with(['invoice'])->find($orderId);
        if (!$order) {
            return;
        }

        try {
            $invoice = $this->invoiceService->generateInvoice($order);
            $this->invoiceService->sendInvoiceEmail($invoice);
        } catch (\Throwable $e) {
            \Log::error('Failed to generate/send invoice: ' . $e->getMessage(), [
                'order_id' => $orderId,
            ]);
        }

        $this->tryCreateAramexShipmentAndSaveTracking($order);
        $this->trySendOrderZapierWebhook($order);
    }

    private function tryCreateAramexShipmentAndSaveTracking($order): void
{
    try {
        logger()->info('Aramex shipment: start', [
            'order_id' => $order->id ?? null,
            'shipping_provider' => $order->shipping_provider ?? null,
            'existing_tracking' => $order->tracking_number ?? null,
        ]);

        // اختياري: شغّلها فقط إذا provider = aramex
        if (!empty($order->shipping_provider) && $order->shipping_provider !== 'aramex') {
            logger()->info('Aramex shipment: skipped (provider not aramex)', [
                'order_id' => $order->id ?? null,
                'provider' => $order->shipping_provider,
            ]);
            return;
        }

        // لو فيه tracking جاهز لا تعيد
        if (!empty($order->tracking_number)) {
            logger()->info('Aramex shipment: skipped (already has tracking)', [
                'order_id' => $order->id ?? null,
                'tracking_number' => $order->tracking_number,
            ]);
            return;
        }

        $service = app(\App\Services\AramexShipmentService::class);

        $resp = $service->createShipmentForOrder($order);

        if (!empty($order->tracking_number)) {
            logger()->info('Aramex shipment: AWB already saved', [
                'order_id' => $order->id ?? null,
                'awb' => $order->tracking_number,
            ]);
            return;
        }

        [$awb, $awbPath] = $this->extractAramexAwb($resp);
        $hasErrors = (bool) data_get($resp, 'HasErrors');

        if ($awb !== '') {
            $order->tracking_number = $awb;
            $order->save();

            logger()->info('Aramex shipment: AWB saved successfully', [
                'order_id' => $order->id ?? null,
                'awb' => $awb,
                'awb_extracted_path' => $awbPath,
            ]);
        } else {
            logger()->warning('Aramex shipment: no AWB returned', [
                'order_id' => $order->id ?? null,
                'has_errors' => $hasErrors,
                'awb_extracted_path' => $awbPath,
                'response_snapshot' => $resp,
            ]);
        }
    } catch (\Throwable $e) {
        logger()->error('Aramex CreateShipment failed', [
            'order_id' => $order->id ?? null,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
    }
}

    private function extractAramexAwb(array $resp): array
    {
        $processed = data_get($resp, 'Shipments.ProcessedShipment');
        if (is_array($processed)) {
            if (isset($processed[0])) {
                $awb = data_get($processed[0], 'ID');
                if ($awb) {
                    return [(string) $awb, 'Shipments.ProcessedShipment[0].ID'];
                }
            }
            $awb = data_get($processed, 'ID');
            if ($awb) {
                return [(string) $awb, 'Shipments.ProcessedShipment.ID'];
            }
        }

        $awb = data_get($resp, 'Shipments.ProcessedShipment.ID');
        if ($awb) {
            return [(string) $awb, 'Shipments.ProcessedShipment.ID'];
        }

        $awb = data_get($resp, 'ProcessedShipment.ID');
        if ($awb) {
            return [(string) $awb, 'ProcessedShipment.ID'];
        }

        $awb = data_get($resp, 'Shipments.0.ID');
        if ($awb) {
            return [(string) $awb, 'Shipments[0].ID'];
        }

        return ['', null];
    }

    private function trySendOrderZapierWebhook($order): void
    {
        try {
            app(ZapierWebhookService::class)->sendOrderCreated($order);
        } catch (\Throwable $e) {
            logger()->warning('Zapier webhook failed', [
                'order_id' => $order->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }

}
