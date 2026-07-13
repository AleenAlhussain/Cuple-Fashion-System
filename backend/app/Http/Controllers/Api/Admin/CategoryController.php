<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CategoryController extends BaseController
{
    public function index(Request $request)
    {
        if ($request->filled('search')) {
            // Search mode: return flat paginated results
            $query = Category::with('parent')
                ->withCount('products')
                ->where('name', 'ilike', '%' . $request->search . '%')
                ->orderBy('sort_order');

            return $this->paginated($query->paginate($request->input('paginate', 50)));
        }

        // Default: return hierarchical tree (parents with nested subcategories)
        $categories = Category::with(['subcategories' => function ($q) {
                $q->withCount('products')->orderBy('sort_order');
            }])
            ->withCount('products')
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->get();

        return $this->success($categories);
    }

    public function show($id)
    {
        $category = Category::with(['parent', 'children'])->findOrFail($id);

        return $this->success($category);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'parent_id' => 'nullable|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'image_url' => 'nullable|string', // URL from media library
            'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB for banner
            'banner_image_url' => 'nullable|string', // URL from media library
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);

        // Handle image - either file upload or URL from media library
        if ($request->hasFile('image')) {
            $validated['image'] = $request->file('image')->store('categories', 'public');
        } elseif ($request->filled('image_url')) {
            // Extract relative path from URL (e.g., /storage/attachments/xxx.jpg -> attachments/xxx.jpg)
            $validated['image'] = $this->extractPathFromUrl($request->input('image_url'));
        }
        unset($validated['image_url']);

        // Handle banner image - either file upload or URL from media library
        if ($request->hasFile('banner_image')) {
            $validated['banner_image'] = $request->file('banner_image')->store('categories/banners', 'public');
        } elseif ($request->filled('banner_image_url')) {
            $validated['banner_image'] = $this->extractPathFromUrl($request->input('banner_image_url'));
        }
        unset($validated['banner_image_url']);

        $category = Category::create($validated);

        return $this->success($category, 'Category created successfully', 201);
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

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'parent_id' => 'nullable|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'image_url' => 'nullable|string', // URL from media library
            'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB for banner
            'banner_image_url' => 'nullable|string', // URL from media library
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
        ]);

        // Prevent setting itself as parent
        if (isset($validated['parent_id']) && $validated['parent_id'] == $id) {
            return $this->error('A category cannot be its own parent.', 400);
        }

        // Handle image - either file upload or URL from media library
        if ($request->hasFile('image')) {
            if ($category->image && !Str::startsWith($category->image, 'attachments/')) {
                Storage::disk('public')->delete($category->image);
            }
            $validated['image'] = $request->file('image')->store('categories', 'public');
        } elseif ($request->filled('image_url')) {
            $validated['image'] = $this->extractPathFromUrl($request->input('image_url'));
        }
        unset($validated['image_url']);

        // Handle banner image - either file upload or URL from media library
        if ($request->hasFile('banner_image')) {
            if ($category->banner_image && !Str::startsWith($category->banner_image, 'attachments/')) {
                Storage::disk('public')->delete($category->banner_image);
            }
            $validated['banner_image'] = $request->file('banner_image')->store('categories/banners', 'public');
        } elseif ($request->filled('banner_image_url')) {
            $validated['banner_image'] = $this->extractPathFromUrl($request->input('banner_image_url'));
        }
        unset($validated['banner_image_url']);

        $category->update($validated);

        return $this->success($category->fresh(), 'Category updated successfully');
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);

        if ($category->is_default) {
            return $this->error('Cannot delete the default category.', 400);
        }

        $this->deleteCategoriesAndDescendants([$category->id]);

        return $this->success(null, 'Category deleted successfully');
    }

    public function bulkAction(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:categories,id',
            'action' => 'required|string|in:delete,activate,deactivate',
        ]);

        $ids = array_values(array_unique($validated['ids']));

        switch ($validated['action']) {
            case 'activate':
                Category::whereIn('id', $ids)->update(['is_active' => true]);
                break;

            case 'deactivate':
                Category::whereIn('id', $ids)->where('is_default', false)->update(['is_active' => false]);
                break;

            case 'delete':
                // Exclude default category
                $ids = array_values(array_diff($ids, Category::where('is_default', true)->pluck('id')->toArray()));
                if (empty($ids)) {
                    return $this->error('Cannot delete the default category.', 400);
                }

                $this->deleteCategoriesAndDescendants($ids);
                break;
        }

        return $this->success(null, 'Bulk action completed successfully');
    }

    public function bulkDelete(Request $request)
    {
        $request->merge([
            'action' => 'delete',
            'ids' => $request->input('ids', []),
        ]);

        return $this->bulkAction($request);
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'categories' => 'required|array',
            'categories.*.id' => 'required|exists:categories,id',
            'categories.*.sort_order' => 'required|integer',
        ]);

        foreach ($validated['categories'] as $item) {
            Category::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return $this->success(null, 'Categories reordered successfully');
    }

    /**
     * Delete categories and their descendants while preserving product assignments
     * by moving them to the default category.
     */
    protected function deleteCategoriesAndDescendants(array $categoryIds): void
    {
        $categoryIds = array_values(array_unique(array_map('intval', $categoryIds)));
        if (empty($categoryIds)) {
            return;
        }

        $defaultCategoryId = Category::where('is_default', true)->value('id');
        if ($defaultCategoryId) {
            $categoryIds = array_values(array_diff($categoryIds, [(int) $defaultCategoryId]));
        }

        if (empty($categoryIds)) {
            return;
        }

        $allCategoryIds = $this->collectDescendantCategoryIds($categoryIds);
        if ($defaultCategoryId) {
            $allCategoryIds = array_values(array_diff($allCategoryIds, [(int) $defaultCategoryId]));
        }

        if (empty($allCategoryIds)) {
            return;
        }

        DB::transaction(function () use ($allCategoryIds, $defaultCategoryId) {
            $productIds = DB::table('category_product')
                ->whereIn('category_id', $allCategoryIds)
                ->pluck('product_id')
                ->unique()
                ->values()
                ->all();

            if ($defaultCategoryId && !empty($productIds)) {
                $existing = DB::table('category_product')
                    ->where('category_id', $defaultCategoryId)
                    ->whereIn('product_id', $productIds)
                    ->pluck('product_id')
                    ->all();

                $toInsert = array_values(array_diff($productIds, $existing));

                foreach (array_chunk($toInsert, 1000) as $chunk) {
                    $rows = array_map(function ($pid) use ($defaultCategoryId) {
                        return [
                            'category_id' => (int) $defaultCategoryId,
                            'product_id' => (int) $pid,
                        ];
                    }, $chunk);

                    if (!empty($rows)) {
                        DB::table('category_product')->insert($rows);
                    }
                }
            }

            DB::table('category_product')
                ->whereIn('category_id', $allCategoryIds)
                ->delete();

            $categories = Category::whereIn('id', $allCategoryIds)->get(['id', 'image', 'banner_image']);
            foreach ($categories as $category) {
                if ($category->image) {
                    Storage::disk('public')->delete($category->image);
                }
                if ($category->banner_image) {
                    Storage::disk('public')->delete($category->banner_image);
                }
            }

            Category::whereIn('id', $allCategoryIds)->delete();
        });
    }

    /**
     * Collect all descendants for provided category IDs.
     */
    protected function collectDescendantCategoryIds(array $rootCategoryIds): array
    {
        $allIds = array_values(array_unique(array_map('intval', $rootCategoryIds)));
        $pendingIds = $allIds;

        while (!empty($pendingIds)) {
            $childIds = Category::whereIn('parent_id', $pendingIds)->pluck('id')->map(function ($id) {
                return (int) $id;
            })->all();

            $pendingIds = array_values(array_diff($childIds, $allIds));
            $allIds = array_merge($allIds, $pendingIds);
        }

        return array_values(array_unique($allIds));
    }
}
