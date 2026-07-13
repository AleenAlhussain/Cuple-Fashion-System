<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\ReturnRequest;
use App\Models\UserNotification;
use App\Services\AramexReturnService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReturnRequestController extends BaseController
{
    public function refundIndex(Request $request)
    {
        return $this->indexByType($request, 'refund');
    }

    public function exchangeIndex(Request $request)
    {
        return $this->indexByType($request, 'exchange');
    }

    public function updateRefundStatus(Request $request, $id)
    {
        return $this->updateStatus($request, $id, 'refund');
    }

    public function updateExchangeStatus(Request $request, $id)
    {
        return $this->updateStatus($request, $id, 'exchange');
    }

    public function createReturnAwb(Request $request, $id)
    {
        return $this->createReturnAwbForType($request, $id, 'refund');
    }

    public function createExchangeReturnAwb(Request $request, $id)
    {
        return $this->createReturnAwbForType($request, $id, 'exchange');
    }

    public function scheduleReturnPickup(Request $request, $id)
    {
        $returnRequest = ReturnRequest::with(['order.country', 'orderItem', 'user', 'attachments'])
            ->findOrFail($id);

        if (!in_array($returnRequest->status, ['approved', 'processing'], true)) {
            return $this->error('Pickup can only be scheduled for approved or processing requests.', 422);
        }

        if (!empty($returnRequest->return_pickup_reference)) {
            $payload = $this->buildReturnResponsePayload($returnRequest, [
                'notifications' => [],
            ]);

            return $this->success(
                $payload,
                'Pickup already scheduled.'
            );
        }

        if (empty($returnRequest->return_awb_number)) {
            return $this->error('Create AWB first.', 422);
        }

        $service = app(AramexReturnService::class);
        $result = $service->schedulePickupForRequest($returnRequest);

        $this->persistReturnResult($returnRequest, $result);

        $payload = $this->buildReturnResponsePayload($returnRequest->fresh(['order.country', 'orderItem', 'user', 'attachments']), $result);
        $message = $this->buildReturnMessage($payload, $result);

        return $this->success($payload, $message);
    }

    private function indexByType(Request $request, string $type)
    {
        $query = ReturnRequest::with(['order', 'orderItem', 'user', 'attachments'])
            ->where('type', $type);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('order', function ($q2) use ($search) {
                    $q2->where('order_number', 'like', "%{$search}%");
                })->orWhereHas('user', function ($q2) use ($search) {
                    $q2->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            });
        }

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->input('start_date'));
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->input('end_date'));
        }

        $requests = $query->latest()->paginate($request->input('paginate', 15));
        return $this->paginated($requests);
    }

    private function updateStatus(Request $request, $id, string $type)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,under_review,approved,processing,rejected,completed,cancelled',
        ]);

        $returnRequest = ReturnRequest::with(['order', 'orderItem', 'user', 'attachments'])
            ->where('type', $type)
            ->findOrFail($id);

        $returnRequest->update([
            'status' => $validated['status'],
        ]);

        $this->createUserNotification(
            $returnRequest->user_id,
            $returnRequest->order?->order_number,
            $validated['status']
        );

        return $this->success($returnRequest->fresh(['order', 'orderItem', 'user', 'attachments']), ucfirst($type) . ' request status updated');
    }

    private function createReturnAwbForType(Request $request, $id, string $type)
    {
        $returnRequest = ReturnRequest::with(['order.country', 'orderItem', 'user', 'attachments'])
            ->where('type', $type)
            ->findOrFail($id);

        if (!in_array($returnRequest->status, ['approved', 'processing'], true)) {
            return $this->error('Return AWB can only be created for approved or processing ' . $type . 's.', 422);
        }

        $service = app(AramexReturnService::class);
        $result = $service->createReturnForRequest($returnRequest);

        if (empty($result['awb'])) {
            $returnRequest->update([
                'return_status' => 'failed',
                'return_error_message' => $result['error_message'] ?? 'Failed to create return shipment.',
            ]);

            return $this->error(
                $result['error_message'] ?? 'Failed to create return shipment.',
                422
            );
        }

        $this->persistReturnResult($returnRequest, $result);

        $payload = $this->buildReturnResponsePayload($returnRequest->fresh(['order.country', 'orderItem', 'user', 'attachments']), $result);
        $message = $this->buildReturnMessage($payload, $result);

        return $this->success($payload, $message);
    }

    private function createUserNotification(
        int $userId,
        ?string $orderNumber,
        string $status
    ): void {
        $title = 'Request updated';
        $message = ($orderNumber ? "Your request for Order #{$orderNumber}" : "Your request") . " is now " . ucfirst($status) . ".";
        $link = '/account/dashboard?tab=refund';

        UserNotification::create([
            'user_id' => $userId,
            'type' => 'return_request',
            'data' => [
                'title' => $title,
                'message' => $message,
                'status' => $status,
                'link' => $link,
                'order_number' => $orderNumber,
            ],
        ]);
    }

    private function buildReturnResponsePayload(ReturnRequest $returnRequest, array $result): array
    {
        $awbCreated = !empty($returnRequest->return_awb_number);
        $pickupScheduled = !empty($returnRequest->return_pickup_reference);
        $state = $pickupScheduled ? 'pickup_scheduled' : ($returnRequest->return_error_message ? 'pickup_pending' : 'awb_created');

        return [
            'return_request' => $returnRequest,
            'awb_created' => $awbCreated,
            'pickup_scheduled' => $pickupScheduled,
            'pickup_date_used' => $returnRequest->return_pickup_date,
            'state' => $state,
            'aramex_notifications' => $result['notifications'] ?? [],
        ];
    }

    private function buildReturnMessage(array $payload, array $result): string
    {
        if (!empty($payload['pickup_scheduled'])) {
            return 'Return shipment created successfully.';
        }

        if (!empty($payload['awb_created'])) {
            $pickupRaw = $result['raw']['pickup'] ?? null;
            $reason = $result['error_message'] ?? 'Pickup scheduling pending/retry required.';
            if ($pickupRaw === null) {
                $reason = 'Pickup scheduling pending/retry required.';
            }
            return 'AWB created. Pickup not scheduled: ' . $reason;
        }

        return 'Failed to create return shipment.';
    }

    private function persistReturnResult(ReturnRequest $returnRequest, array $result): void
    {
        $pickupScheduled = !empty($result['pickup_reference']);
        $rawResponse = $result['raw']['pickup'] ?? $result['raw']['shipment'] ?? ($result['raw'] ?? null);
        $returnStatus = $pickupScheduled ? 'created' : 'pickup_pending';

        $returnRequest->update([
            'return_awb_number' => $result['awb'] ?? $returnRequest->return_awb_number,
            'return_label_url' => $result['label_url'] ?? $returnRequest->return_label_url,
            'return_pickup_reference' => $result['pickup_reference'] ?? $returnRequest->return_pickup_reference,
            'return_pickup_date' => $result['pickup_date'] ?? $returnRequest->return_pickup_date,
            'return_is_international' => (bool) ($result['is_international'] ?? $returnRequest->return_is_international),
            'return_params' => $result['params'] ?? $returnRequest->return_params,
            'return_raw_response' => $rawResponse,
            'return_status' => !empty($result['awb']) ? $returnStatus : 'failed',
            'return_error_message' => !empty($result['has_errors']) ? ($result['error_message'] ?? 'Failed to schedule return pickup.') : null,
            'return_created_at' => $returnRequest->return_created_at ?? now(),
        ]);
    }
}
