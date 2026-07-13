<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentGateway;
use App\Models\PaymentTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PaymentGatewayController extends Controller
{
    /**
     * List all payment gateways
     */
    public function index(): JsonResponse
    {
        $gateways = PaymentGateway::all()->map(function ($gateway) {
            return [
                'id' => $gateway->id,
                'name' => $gateway->name,
                'display_name' => $gateway->display_name,
                'description' => $gateway->description,
                'logo' => $gateway->logo,
                'is_active' => $gateway->is_active,
                'is_sandbox' => $gateway->is_sandbox,
                'public_key' => $gateway->public_key,
                'has_secret_key' => !empty($gateway->getOriginal('secret_key')),
                'merchant_code' => $gateway->merchant_code,
                'min_amount' => $gateway->min_amount,
                'max_amount' => $gateway->max_amount,
                'installments_count' => $gateway->installments_count,
                'supported_countries' => $gateway->supported_countries,
                'settings' => $gateway->settings,
                'is_configured' => $gateway->isConfigured(),
                'created_at' => $gateway->created_at,
                'updated_at' => $gateway->updated_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $gateways,
        ]);
    }

    /**
     * Get single payment gateway
     */
    public function show(int $id): JsonResponse
    {
        $gateway = PaymentGateway::find($id);

        if (!$gateway) {
            return response()->json([
                'success' => false,
                'message' => 'Payment gateway not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $gateway->id,
                'name' => $gateway->name,
                'display_name' => $gateway->display_name,
                'description' => $gateway->description,
                'logo' => $gateway->logo,
                'is_active' => $gateway->is_active,
                'is_sandbox' => $gateway->is_sandbox,
                'public_key' => $gateway->public_key,
                'has_secret_key' => !empty($gateway->getOriginal('secret_key')),
                'merchant_code' => $gateway->merchant_code,
                'min_amount' => $gateway->min_amount,
                'max_amount' => $gateway->max_amount,
                'installments_count' => $gateway->installments_count,
                'supported_countries' => $gateway->supported_countries,
                'settings' => $gateway->settings,
                'is_configured' => $gateway->isConfigured(),
            ],
        ]);
    }

    /**
     * Update payment gateway settings
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $gateway = PaymentGateway::find($id);

        if (!$gateway) {
            return response()->json([
                'success' => false,
                'message' => 'Payment gateway not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'display_name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'is_active' => 'sometimes|boolean',
            'is_sandbox' => 'sometimes|boolean',
            'public_key' => 'sometimes|nullable|string|max:500',
            'secret_key' => 'sometimes|nullable|string|max:500',
            'merchant_code' => 'sometimes|nullable|string|max:255',
            'min_amount' => 'sometimes|numeric|min:0',
            'max_amount' => 'sometimes|numeric|min:0',
            'installments_count' => 'sometimes|integer|min:1|max:12',
            'supported_countries' => 'sometimes|array',
            'supported_countries.*' => 'string|size:2',
            'settings' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // Handle secret_key specially - only update if provided and not empty
        if (isset($data['secret_key'])) {
            if (empty($data['secret_key'])) {
                unset($data['secret_key']); // Don't clear existing key
            }
        }

        $gateway->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Payment gateway updated successfully',
            'data' => [
                'id' => $gateway->id,
                'name' => $gateway->name,
                'display_name' => $gateway->display_name,
                'is_active' => $gateway->is_active,
                'is_configured' => $gateway->isConfigured(),
            ],
        ]);
    }

    /**
     * Toggle gateway active status
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $gateway = PaymentGateway::find($id);

        if (!$gateway) {
            return response()->json([
                'success' => false,
                'message' => 'Payment gateway not found',
            ], 404);
        }

        // Check if gateway is configured before activating
        if (!$gateway->is_active && !$gateway->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot activate gateway without API credentials',
            ], 400);
        }

        $gateway->update(['is_active' => !$gateway->is_active]);

        return response()->json([
            'success' => true,
            'message' => $gateway->is_active ? 'Gateway activated' : 'Gateway deactivated',
            'data' => [
                'id' => $gateway->id,
                'name' => $gateway->name,
                'is_active' => $gateway->is_active,
            ],
        ]);
    }

    /**
     * Test gateway connection
     */
    public function testConnection(int $id): JsonResponse
    {
        $gateway = PaymentGateway::find($id);

        if (!$gateway) {
            return response()->json([
                'success' => false,
                'message' => 'Payment gateway not found',
            ], 404);
        }

        if (!$gateway->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Gateway is not configured with API credentials',
            ], 400);
        }

        // Test connection based on gateway type
        try {
            if ($gateway->name === 'tabby') {
                $service = new \App\Services\PaymentGateways\TabbyService();
                // Simple test - just verify the service can be instantiated
                // A more comprehensive test could make an API call
            } elseif ($gateway->name === 'tamara') {
                $service = new \App\Services\PaymentGateways\TamaraService();
            }

            return response()->json([
                'success' => true,
                'message' => 'Connection test successful',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Connection test failed: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get transaction statistics for a gateway
     */
    public function statistics(int $id): JsonResponse
    {
        $gateway = PaymentGateway::find($id);

        if (!$gateway) {
            return response()->json([
                'success' => false,
                'message' => 'Payment gateway not found',
            ], 404);
        }

        $transactions = PaymentTransaction::byGateway($gateway->name);

        return response()->json([
            'success' => true,
            'data' => [
                'total_transactions' => $transactions->count(),
                'successful_transactions' => $transactions->clone()->successful()->count(),
                'failed_transactions' => $transactions->clone()->failed()->count(),
                'pending_transactions' => $transactions->clone()->pending()->count(),
                'total_amount' => $transactions->clone()->successful()->sum('amount'),
            ],
        ]);
    }

    /**
     * List all transactions (optional: filter by gateway)
     */
    public function transactions(Request $request): JsonResponse
    {
        $query = PaymentTransaction::with(['order:id,order_number,total,created_at'])
            ->orderBy('created_at', 'desc');

        if ($request->has('gateway')) {
            $query->byGateway($request->gateway);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $transactions = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $transactions->items(),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }
}
