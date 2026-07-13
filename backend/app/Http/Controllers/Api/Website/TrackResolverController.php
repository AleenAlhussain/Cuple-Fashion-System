<?php

namespace App\Http\Controllers\Api\Website;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrackResolverController extends Controller
{
    private const MESSAGE_MAP = [
        'missing_query' => [
            'en' => 'Please enter an AWB, order number, or mobile number to proceed.',
            'ar' => 'يرجى إدخال رقم تتبع أو رقم طلب أو رقم جوال للمتابعة.',
        ],
        'invalid_query' => [
            'en' => 'That entry does not look like a valid AWB, order number, or UAE mobile.',
            'ar' => 'القيمة المدخلة لا تبدو رقم تتبع أو طلب صالحاً أو رقم جوال إماراتي.',
        ],
        'order_not_found' => [
            'en' => 'We could not find an order matching that number.',
            'ar' => 'لم يتطابق أي طلب مع الرقم المدخل.',
        ],
        'order_missing_tracking' => [
            'en' => 'Tracking information is not available yet for that order. Please try again later or contact support.',
            'ar' => 'لم تتوفر بيانات التتبع بعد لهذا الطلب. الرجاء المحاولة لاحقاً أو التواصل مع الدعم.',
        ],
        'mobile_no_orders' => [
            'en' => 'We could not find any recent orders for that mobile number.',
            'ar' => 'لم نجد أي طلبات حديثة مرتبطة برقم الجوال هذا.',
        ],
        'mobile_select_order' => [
            'en' => 'Select the correct order to continue tracking securely.',
            'ar' => 'اختر الطلب الصحيح لمتابعة التتبع بطريقة آمنة.',
        ],
    ];

    public function resolve(Request $request): JsonResponse
    {
        $query = trim((string) $request->get('query', ''));
        $locale = $this->normalizeLocale((string) $request->get('locale', 'en'));

        if ($query === '') {
            return $this->errorResponse('missing_query', $locale, 422);
        }

        $digits = preg_replace('/\D+/', '', $query);

        if ($this->looksLikeAwb($query, $digits)) {
            return $this->successResponse([
                'type' => 'awb',
                'awb' => $digits,
            ]);
        }

        if ($this->looksLikeOrder($query)) {
            $order = $this->findOrderByNumber($query);

            if (!$order) {
                return $this->errorResponse('order_not_found', $locale, 404);
            }

            if (empty($order->tracking_number)) {
                return $this->errorResponse('order_missing_tracking', $locale, 422);
            }

            return $this->successResponse([
                'type' => 'order',
                'order_number' => $order->order_number,
                'order_id' => $order->id,
                'awb' => $order->tracking_number,
            ]);
        }

        if ($this->looksLikeMobile($digits)) {
            $choicesData = $this->resolveMobileChoices($digits);

            if ($choicesData['choices']->isEmpty()) {
                return $this->errorResponse('mobile_no_orders', $locale, 404);
            }

            if ($choicesData['is_single']) {
                $choice = $choicesData['choices']->first();

                return $this->successResponse([
                    'type' => 'order',
                    'order_number' => $choice['order_number'],
                    'order_id' => $choice['order_id'],
                    'awb' => $choice['tracking_number'],
                ]);
            }

            return $this->successResponse([
                'type' => 'mobile',
                'message' => $this->translate('mobile_select_order', $locale),
                'choices' => $choicesData['choices']->toArray(),
                'has_more' => $choicesData['has_more'],
            ]);
        }

        return $this->errorResponse('invalid_query', $locale, 422);
    }

    private function resolveMobileChoices(string $digits): array
    {
        $expr = $this->sanitizedPhoneExpression();
        $tail = substr($digits, -9);

        $orders = Order::query()
            ->select(["id", "order_number", "tracking_number", "shipping_street", "shipping_city", "shipping_state", "shipping_country", "total", "currency", "created_at"])
            ->whereNotNull('tracking_number')
            ->whereRaw("{$expr} LIKE ?", ["%{$tail}"])
            ->orderByDesc('created_at')
            ->take(4)
            ->get();

        $hasMore = $orders->count() > 3;

        if ($hasMore) {
            $orders = $orders->slice(0, 3)->values();
        }

        $choices = $orders->map(function (Order $order) {
            return [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'tracking_number' => $order->tracking_number,
                'awb' => $order->tracking_number,
                'date' => optional($order->created_at)->format('Y-m-d'),
                'total' => number_format((float) ($order->total ?? 0), 2),
                'currency' => $order->currency ?? 'AED',
                'masked_address' => $this->maskAddress($order),
            ];
        });

        return [
            'choices' => $choices,
            'has_more' => $hasMore,
            'is_single' => $choices->count() === 1,
        ];
    }

    private function successResponse(array $data): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    private function errorResponse(string $key, string $locale, int $status = 422): JsonResponse
    {
        return response()->json([
            'success' => false,
            'code' => $key,
            'message' => $this->translate($key, $locale),
        ], $status);
    }

    private function translate(string $key, string $locale): string
    {
        $entry = self::MESSAGE_MAP[$key] ?? self::MESSAGE_MAP['invalid_query'];
        return $entry[$locale] ?? $entry['en'];
    }

    private function normalizeLocale(string $locale): string
    {
        $locale = strtolower(trim($locale));
        return $locale === 'ar' ? 'ar' : 'en';
    }

    private function looksLikeAwb(string $raw, string $digits): bool
    {
        return strlen($digits) >= 10 && !$this->looksLikeMobile($digits);
    }

    private function looksLikeOrder(string $raw): bool
    {
        $candidate = preg_replace('/[\s#]/', '', $raw);
        return (bool) preg_match('/^[0-9]{4,9}$/', $candidate);
    }

    private function looksLikeMobile(string $digits): bool
    {
        if (strlen($digits) < 9) {
            return false;
        }

        $tail = substr($digits, -9);
        return (bool) preg_match('/^5[0-9]{8}$/', $tail);
    }

    private function findOrderByNumber(string $raw): ?Order
    {
        $candidate = preg_replace('/[^0-9]/', '', $raw);
        if ($candidate === '') {
            return null;
        }

        $numbers = [$candidate];
        if (strlen($candidate) < 5) {
            $numbers[] = str_pad($candidate, 5, '0', STR_PAD_LEFT);
        }

        return Order::whereIn('order_number', array_unique($numbers))->first();
    }

    private function sanitizedPhoneExpression(): string
    {
        $expr = 'shipping_phone';
        foreach ([' ', '-', '+', '(', ')'] as $char) {
            $expr = "REPLACE({$expr}, '{$char}', '')";
        }
        return $expr;
    }

    private function maskAddress(Order $order): string
    {
        $parts = array_filter([
            $order->shipping_street,
            $order->shipping_city,
            $order->shipping_country,
        ]);

        $text = implode(', ', $parts);
        if ($text === '') {
            return '';
        }

        $length = 28;
        if (mb_strlen($text) <= $length) {
            return $text;
        }

        return mb_substr($text, 0, $length) . '…';
    }
}
