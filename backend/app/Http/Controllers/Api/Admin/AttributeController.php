<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Attribute;
use App\Models\AttributeValue;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AttributeController extends BaseController
{
    public function index(Request $request)
    {
        $attributes = Attribute::with('values')->get();

        // Transform data to include attribute_values as expected by frontend
        $data = $attributes->map(function ($attribute) {
            $arr = $attribute->toArray();
            // Frontend expects 'attribute_values' not 'values'
            $arr['attribute_values'] = $attribute->values->map(function ($value) {
                return [
                    'id' => $value->id,
                    'attribute_id' => $value->attribute_id,
                    'value' => $value->value,
                    'hex_color' => $value->color_code,
                ];
            });
            return $arr;
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function show($id)
    {
        $attribute = Attribute::with('values')->findOrFail($id);

        // Map values to attribute_values format expected by frontend
        $data = $attribute->toArray();
        $data['attribute_values'] = $attribute->values->map(function ($value) {
            return [
                'id' => $value->id,
                'value' => $value->value,
                'hex_color' => $value->color_code, // Map color_code to hex_color for frontend
            ];
        });

        return $this->success($data);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:28',
            'style' => 'nullable|string|in:rectangle,color,circle,dropdown,radio,select',
            'status' => 'nullable|boolean',
            'values' => 'nullable|array',
            'values.*' => 'string|max:255',
            'attribute_values' => 'nullable|array',
            'attribute_values.*.value' => 'required_with:attribute_values|string|max:255',
            'attribute_values.*.hex_color' => 'nullable|string|max:20',
        ]);

        // Use provided slug or generate from name
        $slug = !empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);

        $attribute = Attribute::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'style' => $validated['style'] ?? 'rectangle',
            'status' => $validated['status'] ?? true,
        ]);

        // Handle attribute_values format (from admin form)
        if (!empty($validated['attribute_values'])) {
            foreach ($validated['attribute_values'] as $index => $valueData) {
                AttributeValue::create([
                    'attribute_id' => $attribute->id,
                    'value' => $valueData['value'],
                    'color_code' => $valueData['hex_color'] ?? null, // Map hex_color from frontend to color_code in DB
                    'sort_order' => $index,
                ]);
            }
        }
        // Handle simple values array format
        elseif (!empty($validated['values'])) {
            foreach ($validated['values'] as $index => $value) {
                AttributeValue::create([
                    'attribute_id' => $attribute->id,
                    'value' => $value,
                    'sort_order' => $index,
                ]);
            }
        }

        return $this->success($attribute->load('values'), 'Attribute created successfully.');
    }

    public function update(Request $request, $id)
    {
        $attribute = Attribute::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|max:28',
            'style' => 'nullable|string|in:rectangle,color,circle,dropdown,radio,select',
            'status' => 'nullable|boolean',
            'values' => 'nullable|array',
            'values.*' => 'string|max:255',
            'attribute_values' => 'nullable|array',
            'attribute_values.*.value' => 'required_with:attribute_values|string|max:255',
            'attribute_values.*.hex_color' => 'nullable|string|max:20',
        ]);

        // Update attribute fields
        $updateData = [];
        if (isset($validated['name'])) {
            $updateData['name'] = $validated['name'];
        }
        // Update slug if provided, or regenerate from name if name changed
        if (isset($validated['slug'])) {
            $updateData['slug'] = Str::slug($validated['slug']);
        } elseif (isset($validated['name'])) {
            $updateData['slug'] = Str::slug($validated['name']);
        }
        if (isset($validated['style'])) {
            $updateData['style'] = $validated['style'];
        }
        if (isset($validated['status'])) {
            $updateData['status'] = $validated['status'];
        }
        if (!empty($updateData)) {
            $attribute->update($updateData);
        }

        // Handle attribute_values format (from admin form)
        if (isset($validated['attribute_values'])) {
            // Delete all existing values and recreate
            $attribute->values()->delete();

            foreach ($validated['attribute_values'] as $index => $valueData) {
                AttributeValue::create([
                    'attribute_id' => $attribute->id,
                    'value' => $valueData['value'],
                    'color_code' => $valueData['hex_color'] ?? null, // Map hex_color from frontend to color_code in DB
                    'sort_order' => $index,
                ]);
            }
        }
        // Handle simple values array format
        elseif (isset($validated['values'])) {
            // Delete all existing values and recreate
            $attribute->values()->delete();

            foreach ($validated['values'] as $index => $value) {
                AttributeValue::create([
                    'attribute_id' => $attribute->id,
                    'value' => $value,
                    'sort_order' => $index,
                ]);
            }
        }

        return $this->success($attribute->fresh()->load('values'), 'Attribute updated successfully.');
    }

    public function destroy($id)
    {
        $attribute = Attribute::findOrFail($id);
        $attribute->values()->delete();
        $attribute->delete();

        return $this->success(null, 'Attribute deleted successfully.');
    }

    public function bulkAction(Request $request)
    {
        $action = $request->input('action');
        $ids = $request->input('ids', []);

        if (empty($ids)) {
            return $this->error('No items selected.', 400);
        }

        switch ($action) {
            case 'delete':
                AttributeValue::whereIn('attribute_id', $ids)->delete();
                Attribute::whereIn('id', $ids)->delete();
                return $this->success(null, count($ids) . ' attribute(s) deleted successfully.');

            case 'active':
                Attribute::whereIn('id', $ids)->update(['status' => true]);
                return $this->success(null, count($ids) . ' attribute(s) activated.');

            case 'deactive':
                Attribute::whereIn('id', $ids)->update(['status' => false]);
                return $this->success(null, count($ids) . ' attribute(s) deactivated.');

            default:
                return $this->error('Invalid action.', 400);
        }
    }
}
