<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Popup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class PopupController extends BaseController
{
    /**
     * Display a listing of popups
     */
    public function index(Request $request)
    {
        $query = Popup::query();

        // Filter by type
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('is_active', $request->boolean('status'));
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('coupon_code', 'like', "%{$search}%");
            });
        }

        $popups = $query->orderBy('priority', 'desc')
                        ->orderBy('created_at', 'desc')
                        ->paginate($request->input('paginate', 10));

        return $this->paginated($popups);
    }

    /**
     * Store a newly created popup
     */
    public function store(Request $request)
    {
        // Decode show_on_pages JSON string from FormData
        if ($request->has('show_on_pages') && is_string($request->show_on_pages)) {
            $request->merge(['show_on_pages' => json_decode($request->show_on_pages, true) ?: []]);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'title_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'type' => 'required|in:collection,offer,coupon,newsletter',
            'image' => $request->hasFile('image') ? 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048' : 'nullable|string',
            'button_text' => 'nullable|string|max:100',
            'button_text_ar' => 'nullable|string|max:100',
            'button_link' => 'nullable|string|max:500',
            'coupon_code' => 'nullable|string|max:50',
            'discount_value' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|in:percentage,fixed',
            'display_frequency' => 'required|in:once,every_visit,once_per_session,once_per_day',
            'delay_seconds' => 'required|integer|min:0|max:60',
            'show_on_exit_intent' => 'boolean',
            'show_on_pages' => 'nullable|array',
            'show_on_pages.*' => 'in:home,shop,product,category,cart,checkout,all',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'boolean',
            'priority' => 'integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 422);
        }

        $data = $validator->validated();

        // Handle image upload
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('popups', 'public');
            $data['image'] = $path;
        }

        $popup = Popup::create($data);

        return $this->success($popup, 'Popup created successfully');
    }

    /**
     * Display the specified popup
     */
    public function show($id)
    {
        $popup = Popup::find($id);

        if (!$popup) {
            return $this->error('Popup not found', 404);
        }

        return $this->success($popup);
    }

    /**
     * Update the specified popup
     */
    public function update(Request $request, $id)
    {
        $popup = Popup::find($id);

        if (!$popup) {
            return $this->error('Popup not found', 404);
        }

        // Decode show_on_pages JSON string from FormData
        if ($request->has('show_on_pages') && is_string($request->show_on_pages)) {
            $request->merge(['show_on_pages' => json_decode($request->show_on_pages, true) ?: []]);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'title_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'type' => 'sometimes|required|in:collection,offer,coupon,newsletter',
            'image' => $request->hasFile('image') ? 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048' : 'nullable|string',
            'button_text' => 'nullable|string|max:100',
            'button_text_ar' => 'nullable|string|max:100',
            'button_link' => 'nullable|string|max:500',
            'coupon_code' => 'nullable|string|max:50',
            'discount_value' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|in:percentage,fixed',
            'display_frequency' => 'sometimes|required|in:once,every_visit,once_per_session,once_per_day',
            'delay_seconds' => 'sometimes|required|integer|min:0|max:60',
            'show_on_exit_intent' => 'boolean',
            'show_on_pages' => 'nullable|array',
            'show_on_pages.*' => 'in:home,shop,product,category,cart,checkout,all',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'boolean',
            'priority' => 'integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 422);
        }

        $data = $validator->validated();

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image
            if ($popup->image && !str_starts_with($popup->image, 'http')) {
                Storage::disk('public')->delete($popup->image);
            }
            $path = $request->file('image')->store('popups', 'public');
            $data['image'] = $path;
        }

        $popup->update($data);

        return $this->success($popup, 'Popup updated successfully');
    }

    /**
     * Remove the specified popup
     */
    public function destroy($id)
    {
        $popup = Popup::find($id);

        if (!$popup) {
            return $this->error('Popup not found', 404);
        }

        // Delete image
        if ($popup->image && !str_starts_with($popup->image, 'http')) {
            Storage::disk('public')->delete($popup->image);
        }

        $popup->delete();

        return $this->success(null, 'Popup deleted successfully');
    }

    /**
     * Toggle popup status
     */
    public function toggleStatus($id)
    {
        $popup = Popup::find($id);

        if (!$popup) {
            return $this->error('Popup not found', 404);
        }

        $popup->is_active = !$popup->is_active;
        $popup->save();

        return $this->success($popup, 'Popup status updated successfully');
    }

    /**
     * Bulk delete popups
     */
    public function bulkDelete(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array',
            'ids.*' => 'exists:popups,id',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 422);
        }

        $popups = Popup::whereIn('id', $request->ids)->get();

        foreach ($popups as $popup) {
            if ($popup->image && !str_starts_with($popup->image, 'http')) {
                Storage::disk('public')->delete($popup->image);
            }
            $popup->delete();
        }

        return $this->success(null, 'Popups deleted successfully');
    }

    /**
     * Get popup types for dropdown
     */
    public function types()
    {
        return $this->success([
            ['value' => 'collection', 'label' => 'New Collection'],
            ['value' => 'offer', 'label' => 'Special Offer'],
            ['value' => 'coupon', 'label' => 'Coupon'],
            ['value' => 'newsletter', 'label' => 'Newsletter'],
        ]);
    }

    /**
     * Get display frequency options
     */
    public function frequencies()
    {
        return $this->success([
            ['value' => 'once', 'label' => 'Show Once (Never Again)'],
            ['value' => 'every_visit', 'label' => 'Every Visit'],
            ['value' => 'once_per_session', 'label' => 'Once Per Session'],
            ['value' => 'once_per_day', 'label' => 'Once Per Day'],
        ]);
    }
}
