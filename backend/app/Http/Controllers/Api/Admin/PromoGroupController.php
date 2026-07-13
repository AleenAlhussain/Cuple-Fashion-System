<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PromoGroup;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class PromoGroupController extends Controller
{
    /**
     * List all promo groups
     */
    public function index(Request $request): JsonResponse
    {
        $query = PromoGroup::withCount('variants');

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_ar', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Active filter
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $groups = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $groups
        ]);
    }

    /**
     * Create a new promo group
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'variant_ids' => 'nullable|array',
            'variant_ids.*' => 'integer|exists:product_variants,id',
            'skus' => 'nullable|array',
            'skus.*' => 'string',
        ]);

        // Generate unique slug
        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug;
        $counter = 1;
        while (PromoGroup::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }
        $validated['slug'] = $slug;

        $group = PromoGroup::create([
            'name' => $validated['name'],
            'name_ar' => $validated['name_ar'] ?? null,
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // Sync variants by IDs
        $variantIds = $validated['variant_ids'] ?? [];

        // Also add variants by SKU if provided
        if (!empty($validated['skus'])) {
            $skuVariants = ProductVariant::whereIn('sku', $validated['skus'])->pluck('id')->toArray();
            $variantIds = array_unique(array_merge($variantIds, $skuVariants));
        }

        if (!empty($variantIds)) {
            $group->variants()->sync($variantIds);
        }

        return response()->json([
            'success' => true,
            'data' => $group->load('variants'),
            'message' => 'Promo group created successfully'
        ], 201);
    }

    /**
     * Get a single promo group
     */
    public function show($id): JsonResponse
    {
        $group = PromoGroup::with(['variants' => function ($query) {
            $query->select('product_variants.id', 'sku', 'product_id', 'price')
                  ->with('product:id,name,name_ar');
        }])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $group
        ]);
    }

    /**
     * Update a promo group
     */
    public function update(Request $request, $id): JsonResponse
    {
        $group = PromoGroup::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'variant_ids' => 'nullable|array',
            'variant_ids.*' => 'integer|exists:product_variants,id',
            'skus' => 'nullable|array',
            'skus.*' => 'string',
        ]);

        // Update slug if name changed
        if (isset($validated['name']) && $validated['name'] !== $group->name) {
            $baseSlug = Str::slug($validated['name']);
            $slug = $baseSlug;
            $counter = 1;
            while (PromoGroup::where('slug', $slug)->where('id', '!=', $id)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        $group->update($validated);

        // Sync variants if provided
        if (isset($validated['variant_ids']) || isset($validated['skus'])) {
            $variantIds = $validated['variant_ids'] ?? [];

            // Also add variants by SKU if provided
            if (!empty($validated['skus'])) {
                $skuVariants = ProductVariant::whereIn('sku', $validated['skus'])->pluck('id')->toArray();
                $variantIds = array_unique(array_merge($variantIds, $skuVariants));
            }

            $group->variants()->sync($variantIds);
        }

        return response()->json([
            'success' => true,
            'data' => $group->fresh('variants'),
            'message' => 'Promo group updated successfully'
        ]);
    }

    /**
     * Delete a promo group
     */
    public function destroy($id): JsonResponse
    {
        $group = PromoGroup::findOrFail($id);
        $group->delete();

        return response()->json([
            'success' => true,
            'message' => 'Promo group deleted successfully'
        ]);
    }

    /**
     * Upload Excel to add SKUs to promo group
     */
    public function uploadSkus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        $group = PromoGroup::findOrFail($id);

        $file = $request->file('file');
        $spreadsheet = IOFactory::load($file->getPathname());
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();

        // Find SKU column (header can be 'SKU', 'sku', 'Sku', 'variant_sku', etc.)
        $skuColumnIndex = 0;
        $headerRow = $rows[0] ?? [];
        foreach ($headerRow as $index => $header) {
            $headerLower = strtolower(trim($header ?? ''));
            if (in_array($headerLower, ['sku', 'variant_sku', 'variantsku', 'product_sku'])) {
                $skuColumnIndex = $index;
                break;
            }
        }

        // Collect SKUs from file
        $skus = [];
        foreach ($rows as $index => $row) {
            if ($index === 0) continue; // Skip header

            $sku = trim($row[$skuColumnIndex] ?? '');
            if (!empty($sku)) {
                $skus[] = $sku;
            }
        }

        // Remove duplicates
        $skus = array_unique($skus);

        // Find variant IDs by SKU
        $variants = ProductVariant::whereIn('sku', $skus)->get();
        $variantIds = $variants->pluck('id')->toArray();

        // Get existing IDs and merge (upsert - no duplicates)
        $existingIds = $group->variants()->pluck('product_variants.id')->toArray();
        $newIds = array_unique(array_merge($existingIds, $variantIds));
        $group->variants()->sync($newIds);

        $addedCount = count($variantIds);
        $foundSkus = $variants->pluck('sku')->toArray();
        $notFoundSkus = array_diff($skus, $foundSkus);

        return response()->json([
            'success' => true,
            'message' => "Added {$addedCount} SKUs to promo group",
            'added_count' => $addedCount,
            'total_skus_in_file' => count($skus),
            'found_skus' => $foundSkus,
            'not_found_skus' => array_values($notFoundSkus),
        ]);
    }

    /**
     * Remove SKUs from promo group
     */
    public function removeSkus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'variant_ids' => 'nullable|array',
            'variant_ids.*' => 'integer',
            'skus' => 'nullable|array',
            'skus.*' => 'string',
        ]);

        $group = PromoGroup::findOrFail($id);

        $variantIds = $request->input('variant_ids', []);

        // Also find variants by SKU
        if (!empty($request->input('skus'))) {
            $skuVariants = ProductVariant::whereIn('sku', $request->input('skus'))->pluck('id')->toArray();
            $variantIds = array_unique(array_merge($variantIds, $skuVariants));
        }

        if (!empty($variantIds)) {
            $group->variants()->detach($variantIds);
        }

        return response()->json([
            'success' => true,
            'message' => 'SKUs removed from promo group',
            'removed_count' => count($variantIds),
        ]);
    }

    /**
     * Get variants/SKUs in a promo group (with pagination)
     */
    public function getVariants(Request $request, $id): JsonResponse
    {
        $group = PromoGroup::findOrFail($id);

        $query = $group->variants()
            ->select('product_variants.id', 'sku', 'product_id', 'price', 'stock_quantity')
            ->with('product:id,name,name_ar');

        // Search by SKU
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('sku', 'like', "%{$search}%");
        }

        $perPage = $request->input('per_page', 50);
        $variants = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $variants->items(),
            'meta' => [
                'current_page' => $variants->currentPage(),
                'last_page' => $variants->lastPage(),
                'per_page' => $variants->perPage(),
                'total' => $variants->total(),
            ]
        ]);
    }

    /**
     * Get variants by category for bulk selection
     */
    public function getVariantsByCategory($categoryId): JsonResponse
    {
        $variants = ProductVariant::whereHas('product.categories', function($q) use ($categoryId) {
            $q->where('categories.id', $categoryId);
        })
        ->with('product:id,name,name_ar')
        ->select('id', 'sku', 'price', 'product_id', 'stock_quantity')
        ->where('is_active', true)
        ->orderBy('sku')
        ->get()
        ->map(function($v) {
            return [
                'id' => $v->id,
                'sku' => $v->sku,
                'price' => $v->price,
                'stock_quantity' => $v->stock_quantity,
                'product_name' => $v->product?->name ?? 'Unknown',
                'product_name_ar' => $v->product?->name_ar ?? null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $variants,
            'count' => $variants->count(),
        ]);
    }

    /**
     * Download template for SKU upload
     */
    public function downloadTemplate(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Headers
        $sheet->setCellValue('A1', 'SKU');
        $sheet->setCellValue('B1', 'Notes (optional - ignored)');

        // Example data
        $sheet->setCellValue('A2', 'SKU-001');
        $sheet->setCellValue('B2', 'Example SKU 1');
        $sheet->setCellValue('A3', 'SKU-002');
        $sheet->setCellValue('B3', 'Example SKU 2');

        // Style header
        $sheet->getStyle('A1:B1')->getFont()->setBold(true);
        $sheet->getColumnDimension('A')->setWidth(20);
        $sheet->getColumnDimension('B')->setWidth(30);

        // Create temp file
        $filename = 'promo_group_sku_template.xlsx';
        $tempPath = storage_path('app/temp/' . $filename);

        // Ensure temp directory exists
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save($tempPath);

        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    }
}
