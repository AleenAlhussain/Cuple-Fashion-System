<?php

namespace App\Http\Controllers\Api;

use App\Models\Coupon;
use App\Services\GeneralSettingService;
use App\Services\OrderCalculationService;
use App\Services\ShippingCalculator;
use App\Services\StripeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class StripePaymentController extends BaseController
{
    protected OrderCalculationService $orderCalculationService;
    protected ShippingCalculator $shippingCalculator;
    protected GeneralSettingService $generalSettingService;
    protected ?StripeService $stripeService = null;

    public function __construct(
        OrderCalculationService $orderCalculationService,
        ShippingCalculator $shippingCalculator,
        GeneralSettingService $generalSettingService
    ) {
        $this->orderCalculationService = $orderCalculationService;
        $this->shippingCalculator = $shippingCalculator;
        $this->generalSettingService = $generalSettingService;
    }

    public function createPaymentIntent(Request $request)
    {
        // ✅ اقرأ الـ payload بشكل صريح (JSON أو form-data)
        $payload = $request->isJson()
            ? ($request->json()->all() ?: [])
            : $request->all();

        Log::info('stripe/payment-intent hit', [
            'content_type'  => $request->header('content-type'),
            'payload_keys'  => array_keys($payload),
            'payload'       => $payload,
        ]);

        $stripeService = $this->resolveStripeService();
        if (!$stripeService) {
            return $this->error('Stripe is not configured. Please add Stripe keys in Admin > Settings > Payment Methods.', 503);
        }

        // ✅ Validation على $payload بدل $request->validate
        $validator = Validator::make($payload, [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.color' => 'nullable|string|max:100',
            'items.*.size' => 'nullable|string|max:100',
            'coupon_code' => 'nullable|string|exists:coupons,code',
            'country_id' => 'required|exists:countries,id',
            'payment_method' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            Log::warning('stripe/payment-intent validation failed', [
                'errors' => $validator->errors()->toArray(),
            ]);

            return $this->error(
                $validator->errors()->first(),
                422,
                $validator->errors()->toArray()
            );
        }

        $validated = $validator->validated();

        $user = auth('sanctum')->user();
        $prepared = $this->orderCalculationService->prepareItems($validated['items'], $user);
        $subtotal = (float)($prepared['subtotal'] ?? 0);
        $giftBoxSelectionId = $prepared['gift_box_selection_id'] ?? null;

        if ($subtotal <= 0) {
            return $this->error('Cart total must be greater than zero.', 422);
        }

        // ✅ Calculate expected payable total before cache lookup.
        $discountAmount = 0;
        $couponCode = null;

        if (!empty($validated['coupon_code'])) {
            $coupon = Coupon::where('code', $validated['coupon_code'])->valid()->first();
            if ($coupon && $coupon->isValidForCountry($validated['country_id'])) {
                $discountAmount = (float) $coupon->calculateDiscount($subtotal);
                $couponCode = $coupon->code;
            }
        }

        $itemsQuantity = (int) collect($prepared['items'] ?? [])->sum('quantity');
        $shippingResult = $this->shippingCalculator->calculateForCountry(
            (int) $validated['country_id'],
            $subtotal,
            $itemsQuantity > 0 ? $itemsQuantity : null
        );
        $shippingAmount = (float) ($shippingResult['shipping_amount'] ?? 0);
        $paymentFee = $this->generalSettingService->getPaymentFee($validated['payment_method'] ?? null);
        $taxAmount = 0;

        $total = max(0, $subtotal - $discountAmount + $shippingAmount + $taxAmount + $paymentFee);

        if ($total <= 0) {
            return $this->error('Cart total must be greater than zero after discounts.', 422);
        }

        $expectedStripeAmount = $stripeService->toStripeAmount($total);

        /**
         * ✅ Anti-duplicate guard:
         * Create a stable signature for the request payload (items + country + coupon)
         * and reuse the same intent response for a short TTL to prevent flooding.
         */
        $normalizedItems = collect($validated['items'])
            ->map(function ($item) {
                return [
                    'product_id' => (int)($item['product_id'] ?? 0),
                    'variant_id' => isset($item['variant_id']) ? (int)$item['variant_id'] : null,
                    'quantity'   => (int)($item['quantity'] ?? 0),
                    'color'      => (string)($item['color'] ?? ''),
                    'size'       => (string)($item['size'] ?? ''),
                ];
            })
            // ✅ make signature stable even if frontend changes item order
            ->sortBy(function ($i) {
                return sprintf(
                    '%s-%s-%s-%s-%s',
                    $i['product_id'],
                    $i['variant_id'] ?? 0,
                    $i['quantity'],
                    $i['color'],
                    $i['size']
                );
            })
            ->values()
            ->all();

        $signaturePayload = [
            'country_id'  => (int)$validated['country_id'],
            'coupon_code' => $validated['coupon_code'] ?? null,
            'gift_box_selection_id' => $giftBoxSelectionId,
            'payment_method' => (string) ($validated['payment_method'] ?? 'stripe_card'),
            'expected_stripe_amount' => $expectedStripeAmount,
            'items'       => $normalizedItems,
        ];

        $signature = hash('sha256', json_encode($signaturePayload, JSON_UNESCAPED_UNICODE));
        $cacheKey  = "stripe_pi_sig:" . $signature;

        if (Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);
            $intentId = $cached['payment_intent_id'] ?? null;

            // Validate cached payment intent is still usable
            if ($intentId) {
                try {
                    $existingIntent = $stripeService->retrievePaymentIntent($intentId);
                    $status = $existingIntent['status'] ?? null;
                    $intentAmount = (int) ($existingIntent['amount'] ?? 0);

                    // PaymentElement only works with these statuses
                    $validStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action'];

                    if (in_array($status, $validStatuses, true) && $intentAmount === $expectedStripeAmount) {
                        Log::info('stripe/payment-intent reused (valid)', [
                            'signature' => $signature,
                            'intent_id' => $intentId,
                            'status' => $status,
                            'amount' => $intentAmount,
                        ]);
                        return $this->success($cached);
                    }

                    // Intent is not usable - remove from cache and create new one
                    Log::info('stripe/payment-intent cache invalidated', [
                        'signature' => $signature,
                        'intent_id' => $intentId,
                        'status' => $status,
                        'amount' => $intentAmount,
                        'expected_amount' => $expectedStripeAmount,
                    ]);
                    Cache::forget($cacheKey);
                } catch (\Throwable $e) {
                    // Could not retrieve intent - remove from cache
                    Log::warning('stripe/payment-intent cache invalidated (retrieve failed)', [
                        'signature' => $signature,
                        'intent_id' => $intentId,
                        'error' => $e->getMessage(),
                    ]);
                    Cache::forget($cacheKey);
                }
            }
        }

        try {
            Log::info('stripe/payment-intent creating', [
                'subtotal'       => $subtotal,
                'discount'       => $discountAmount,
                'shipping'       => $shippingAmount,
                'payment_fee'    => $paymentFee,
                'total'          => $total,
                'stripe_amount'  => $expectedStripeAmount,
                'currency'       => config('services.stripe.currency', 'aed'),
                'meta'           => [
                    'coupon_code' => $couponCode,
                    'country_id'  => $validated['country_id'],
                ],
                'signature'      => $signature,
            ]);

            $intent = $stripeService->createPaymentIntent(
                $expectedStripeAmount,
                array_filter([
                    'coupon_code' => $couponCode,
                    'country_id'  => $validated['country_id'],
                ])
            );

            Log::info('stripe/payment-intent created', [
                'intent_id' => $intent['id'] ?? null,
                'signature' => $signature,
            ]);
        } catch (\Throwable $e) {
            Log::error('stripe/payment-intent failed', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'signature' => $signature,
            ]);

            return $this->error('Unable to create Stripe payment intent: ' . $e->getMessage(), 500);
        }

        $response = [
            'client_secret'     => $intent['client_secret'] ?? null,
            'payment_intent_id' => $intent['id'] ?? null,
            'amount'            => $intent['amount'] ?? null,
            'currency'          => strtoupper($intent['currency'] ?? config('services.stripe.currency', 'aed')),
        ];

        // ✅ Cache for 30 minutes to prevent duplicate intent creation
        Cache::put($cacheKey, $response, now()->addMinutes(30));

        return $this->success($response);
    }

    private function resolveStripeService(): ?StripeService
    {
        if ($this->stripeService) {
            return $this->stripeService;
        }

        try {
            $this->stripeService = app(StripeService::class);
        } catch (\Throwable $e) {
            Log::error('stripe/payment-intent service unavailable', [
                'message' => $e->getMessage(),
            ]);
            return null;
        }

        return $this->stripeService;
    }
}
