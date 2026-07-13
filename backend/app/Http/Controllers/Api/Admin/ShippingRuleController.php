<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Traits\ShippingTransforms;
use App\Http\Controllers\Api\BaseController;
use App\Models\ShippingRate;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ShippingRuleController extends BaseController
{
    use ShippingTransforms;

    private const FEE_METHOD_FIXED_PER_ORDER = 'fixed_per_order';
    private const FEE_METHOD_FIXED_BY_QUANTITY = 'fixed_by_quantity';
    private const FEE_METHOD_LEGACY = 'legacy';

    public function store(Request $request)
    {
        $data = $request->validate($this->rules(true));

        $payload = $this->preparePayload($data);
        $payload['shipping_zone_id'] = $data['shipping_id'];

        $rate = ShippingRate::create($payload);

        return $this->success($this->transformRate($rate->refresh()), 'Shipping rule saved successfully', 201);
    }

    public function update(Request $request, $id)
    {
        $rate = ShippingRate::findOrFail($id);

        $data = $request->validate($this->rules(false));

        $payload = $this->preparePayload($data);
        if (array_key_exists('shipping_id', $data)) {
            $payload['shipping_zone_id'] = $data['shipping_id'];
        }

        $rate->update($payload);

        return $this->success($this->transformRate($rate->refresh()), 'Shipping rule updated successfully');
    }

    public function destroy($id)
    {
        $rate = ShippingRate::findOrFail($id);
        $rate->delete();

        return $this->success(null, 'Shipping rule deleted successfully');
    }

    private function preparePayload(array $data): array
    {
        $feeMethod = $this->resolveFeeMethod($data);
        $shippingType = $data['shipping_type'] ?? 'fixed';
        $ruleType = $data['rule_type'] ?? 'base_on_price';
        $amount = $this->normalizeNumeric($data['amount'] ?? null, null);
        $minOrder = $this->normalizeNumeric($data['min'] ?? null, 0);
        $maxOrder = $this->normalizeNumeric($data['max'] ?? null, null);
        $minItemQty = null;
        $maxItemQty = null;

        if ($feeMethod === self::FEE_METHOD_FIXED_PER_ORDER) {
            if ($amount === null) {
                $this->throwFieldRequired('amount');
            }

            $shippingType = 'fixed';
            $ruleType = 'base_on_order';
            $minOrder = 0;
            $maxOrder = null;
        } elseif ($feeMethod === self::FEE_METHOD_FIXED_BY_QUANTITY) {
            if ($amount === null) {
                $this->throwFieldRequired('amount');
            }
            if (empty($data['min_item_qty'])) {
                $this->throwFieldRequired('min_item_qty');
            }

            $shippingType = 'fixed';
            $ruleType = 'base_on_quantity';
            $minOrder = 0;
            $maxOrder = null;
            $minItemQty = (int) $data['min_item_qty'];
            $maxItemQty = $this->hasValue($data['max_item_qty'] ?? null)
                ? (int) $data['max_item_qty']
                : null;
        } else {
            if (!isset($data['shipping_type']) || $data['shipping_type'] === '') {
                $this->throwFieldRequired('shipping_type');
            }
            if ($shippingType !== 'free' && $amount === null) {
                $this->throwFieldRequired('amount');
            }
            if ($ruleType === 'base_on_quantity') {
                $minItemQty = (int) ($data['min_item_qty'] ?? 0);
                $maxItemQty = (int) ($data['max_item_qty'] ?? 0);
            }
        }

        $name = trim($data['name'] ?? '');
        if ($name === '') {
            $name = $feeMethod === self::FEE_METHOD_FIXED_BY_QUANTITY
                ? 'Fixed by item quantity'
                : ($feeMethod === self::FEE_METHOD_FIXED_PER_ORDER
                    ? 'Fixed per order'
                    : ucfirst(str_replace('_', ' ', $shippingType ?: 'shipping')));
        }

        return [
            'name' => $name,
            'rule_type' => $ruleType,
            'shipping_type' => $shippingType,
            'fee_method' => $feeMethod,
            'min_order_amount' => $minOrder,
            'max_order_amount' => $maxOrder,
            'min_item_qty' => $minItemQty,
            'max_item_qty' => $maxItemQty,
            'rate' => $shippingType === 'free'
                ? 0
                : ($amount ?? 0),
            'is_active' => isset($data['status']) ? (bool) $data['status'] : true,
            'description' => $data['description'] ?? null,
            'estimated_days' => $data['estimated_days'] ?? null,
        ];
    }

    private function resolveFeeMethod(array $data): string
    {
        $feeMethod = $data['fee_method'] ?? null;
        if (in_array($feeMethod, [self::FEE_METHOD_FIXED_PER_ORDER, self::FEE_METHOD_FIXED_BY_QUANTITY, self::FEE_METHOD_LEGACY], true)) {
            return $feeMethod;
        }

        if (($data['rule_type'] ?? null) === 'base_on_quantity') {
            return self::FEE_METHOD_FIXED_BY_QUANTITY;
        }

        $shippingType = $data['shipping_type'] ?? null;
        if (
            $shippingType === 'fixed'
            && !$this->hasValue($data['min'] ?? null)
            && !$this->hasValue($data['max'] ?? null)
        ) {
            return self::FEE_METHOD_FIXED_PER_ORDER;
        }

        return self::FEE_METHOD_LEGACY;
    }

    private function hasValue($value): bool
    {
        return !($value === null || $value === '');
    }

    private function throwFieldRequired(string $field): void
    {
        throw ValidationException::withMessages([
            $field => [sprintf('The %s field is required.', str_replace('_', ' ', $field))],
        ]);
    }

    private function rules(bool $isStore): array
    {
        $shippingIdRule = $isStore ? 'required' : 'sometimes';

        return [
            'name' => 'nullable|string',
            'shipping_id' => [$shippingIdRule, 'integer', 'exists:shipping_zones,id'],
            'fee_method' => 'nullable|string|in:fixed_per_order,fixed_by_quantity,legacy',
            'rule_type' => 'nullable|string',
            'shipping_type' => 'nullable|string|in:free,fixed,percentage',
            'min' => 'nullable|numeric|min:0',
            'max' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
            'min_item_qty' => 'nullable|integer|min:1',
            'max_item_qty' => 'nullable|integer|min:1|gte:min_item_qty',
            'status' => 'boolean',
            'description' => 'nullable|string',
            'estimated_days' => 'nullable|string',
        ];
    }

    private function normalizeNumeric($value, $default = null)
    {
        if ($value === null || $value === '') {
            return $default;
        }

        return is_numeric($value) ? (float) $value : $default;
    }
}
