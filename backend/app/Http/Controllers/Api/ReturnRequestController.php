<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ReturnRequest;
use App\Models\ReturnRequestAttachment;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class ReturnRequestController extends BaseController
{
    private const OPEN_STATUSES = ['pending', 'under_review', 'approved', 'processing'];
    private const CLOSED_STATUSES = ['rejected', 'completed', 'cancelled'];
    private const WINDOW_DAYS = 15;

    public function refundIndex(Request $request)
    {
        return $this->indexByType($request, 'refund');
    }

    public function exchangeIndex(Request $request)
    {
        return $this->indexByType($request, 'exchange');
    }

    public function refundStore(Request $request)
    {
        return $this->storeByType($request, 'refund');
    }

    public function exchangeStore(Request $request)
    {
        return $this->storeByType($request, 'exchange');
    }

    private function indexByType(Request $request, string $type)
    {
        $requests = ReturnRequest::with(['order', 'orderItem', 'user', 'attachments'])
            ->where('user_id', $request->user()->id)
            ->where('type', $type)
            ->latest()
            ->paginate($request->input('paginate', 10));

        return $this->paginated($requests);
    }

    private function storeByType(Request $request, string $type)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'order_item_id' => 'required|exists:order_items,id',
            'reason' => 'required|string|max:2000',
            'notes' => 'nullable|string|max:2000',
            'attachments' => 'required|array|min:1',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
        ]);

        $user = $request->user();
        $order = Order::where('id', $validated['order_id'])
            ->where('user_id', $user->id)
            ->first();

        if (!$order) {
            return $this->error('Order not found', 404);
        }

        $orderItem = OrderItem::where('id', $validated['order_item_id'])
            ->where('order_id', $order->id)
            ->first();

        if (!$orderItem) {
            return $this->error('Order item not found', 404);
        }

        $orderHasRequest = ReturnRequest::where('order_id', $order->id)
            ->where('user_id', $user->id)
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->exists();

        if ($orderHasRequest) {
            return response()->json([
                'success' => false,
                'message' => 'You already submitted a request for this order.',
            ], 409);
        }

        $eligibilityError = $this->checkEligibility($order, $orderItem->id);
        if ($eligibilityError) {
            return $this->error($eligibilityError, 422);
        }

        if (!$request->hasFile('attachments')) {
            return $this->error('Attachment is required (product photo).', 422);
        }

        $files = (array) $request->file('attachments');
        if (count($files) < 1) {
            return $this->error('Attachment is required (product photo).', 422);
        }
        if (count($files) > 5) {
            return $this->error('Maximum 5 attachments allowed.', 422);
        }

        $returnRequest = ReturnRequest::create([
            'order_id' => $order->id,
            'order_item_id' => $orderItem->id,
            'user_id' => $user->id,
            'type' => $type,
            'status' => 'pending',
            'reason' => $validated['reason'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'attachments' => null,
            'requested_at' => now(),
        ]);

        $attachments = [];
        foreach ($files as $file) {
            if ($file) {
                $attachments[] = $file->store("return-requests/{$returnRequest->id}", 'public');
            }
        }
        foreach ($attachments as $path) {
            ReturnRequestAttachment::create([
                'return_request_id' => $returnRequest->id,
                'file_path' => $path,
                'file_url' => asset('storage/' . ltrim($path, '/')),
                'mime_type' => Storage::disk('public')->mimeType($path) ?: null,
                'uploaded_at' => now(),
            ]);
        }

        $this->createUserNotification($user->id, $order->order_number);

        return $this->success($returnRequest->load(['order', 'orderItem', 'user', 'attachments']), ucfirst($type) . ' request submitted', 201);
    }

    private function checkEligibility(Order $order, int $orderItemId): ?string
    {
        if ($order->status !== 'delivered') {
            return 'Order is not delivered yet.';
        }

        if (!$order->delivered_at) {
            return 'Delivered date is missing.';
        }

        $windowEnd = Carbon::parse($order->delivered_at)->addDays(self::WINDOW_DAYS);
        if (Carbon::now()->greaterThan($windowEnd)) {
            return 'Return window expired.';
        }

        $hasOpen = ReturnRequest::where('order_item_id', $orderItemId)
            ->whereIn('status', self::OPEN_STATUSES)
            ->exists();

        if ($hasOpen) {
            return 'An active request already exists for this item.';
        }

        return null;
    }

    private function createUserNotification(int $userId, string $orderNumber): void
    {
        $title = 'Request submitted';
        $message = "Your request has been submitted for Order #{$orderNumber}.";
        $link = '/account/dashboard?tab=refund';

        UserNotification::create([
            'user_id' => $userId,
            'type' => 'return_request',
            'data' => [
                'title' => $title,
                'message' => $message,
                'status' => 'pending',
                'link' => $link,
                'order_number' => $orderNumber,
            ],
        ]);
    }
}
