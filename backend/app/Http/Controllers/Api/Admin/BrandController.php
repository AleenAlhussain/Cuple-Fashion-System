<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BrandController extends BaseController
{
    public function index(Request $request)
    {
        $query = Brand::withCount('products');

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        if ($request->has('status')) {
            $query->where('is_active', $request->boolean('status'));
        }

        $query->orderBy('sort_order');

        $brands = $query->paginate($request->input('paginate', 50));

        return $this->paginated($brands);
    }

    public function show($id)
    {
        $brand = Brand::withCount('products')->findOrFail($id);

        return $this->success($brand);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp,svg|max:2048',
            'logo_url' => 'nullable|string', // URL from media library
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);

        // Handle logo - either file upload or URL from media library
        if ($request->hasFile('logo')) {
            $validated['logo'] = $request->file('logo')->store('brands', 'public');
        } elseif ($request->filled('logo_url')) {
            $validated['logo'] = $this->extractPathFromUrl($request->input('logo_url'));
        }
        unset($validated['logo_url']);

        $brand = Brand::create($validated);

        return $this->success($brand, 'Brand created successfully', 201);
    }

    public function update(Request $request, $id)
    {
        $brand = Brand::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp,svg|max:2048',
            'logo_url' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        // Handle logo
        if ($request->hasFile('logo')) {
            // Delete old logo if exists and is local
            if ($brand->logo && !str_starts_with($brand->logo, 'http')) {
                \Storage::disk('public')->delete($brand->logo);
            }
            $validated['logo'] = $request->file('logo')->store('brands', 'public');
        } elseif ($request->filled('logo_url')) {
            $validated['logo'] = $this->extractPathFromUrl($request->input('logo_url'));
        }
        unset($validated['logo_url']);

        // Update slug if name changed
        if (isset($validated['name']) && $validated['name'] !== $brand->name) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
        }

        $brand->update($validated);

        return $this->success($brand, 'Brand updated successfully');
    }

    public function destroy($id)
    {
        $brand = Brand::findOrFail($id);

        // Check if brand has products
        if ($brand->products()->count() > 0) {
            return $this->error('Cannot delete brand with associated products', 422);
        }

        // Delete logo if exists and is local
        if ($brand->logo && !str_starts_with($brand->logo, 'http')) {
            \Storage::disk('public')->delete($brand->logo);
        }

        $brand->delete();

        return $this->success(null, 'Brand deleted successfully');
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
                $withProducts = Brand::whereIn('id', $ids)->whereHas('products')->pluck('name');
                if ($withProducts->isNotEmpty()) {
                    return $this->error('Cannot delete brands with products: ' . $withProducts->join(', '), 422);
                }
                Brand::whereIn('id', $ids)->delete();
                return $this->success(null, count($ids) . ' brand(s) deleted successfully.');

            case 'active':
                Brand::whereIn('id', $ids)->update(['is_active' => true]);
                return $this->success(null, count($ids) . ' brand(s) activated.');

            case 'deactive':
                Brand::whereIn('id', $ids)->update(['is_active' => false]);
                return $this->success(null, count($ids) . ' brand(s) deactivated.');

            default:
                return $this->error('Invalid action.', 400);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        $brand = Brand::findOrFail($id);
        $brand->is_active = !$brand->is_active;
        $brand->save();

        return $this->success($brand, 'Brand status updated');
    }

    /**
     * Extract storage path from full URL
     */
    protected function extractPathFromUrl($url)
    {
        if (!$url) return null;

        // Handle full URLs like http://localhost:8000/storage/attachments/xxx.jpg
        if (preg_match('/\/storage\/(.+)$/', $url, $matches)) {
            return $matches[1];
        }

        // Handle relative paths like /storage/attachments/xxx.jpg
        if (Str::startsWith($url, '/storage/')) {
            return Str::after($url, '/storage/');
        }

        // Return as-is if already a relative path
        return $url;
    }
}
