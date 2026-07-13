<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Story;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class StoryController extends BaseController
{
    /**
     * Display a listing of stories
     */
    public function index(Request $request)
    {
        $query = Story::with(['user:id,name,email', 'product:id,name,slug']);

        // Filter by status
        if ($request->has('status')) {
            if ($request->status === 'active') {
                $query->active();
            } elseif ($request->status === 'expired') {
                $query->where('expires_at', '<=', Carbon::now());
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        // Filter by creator type
        if ($request->filled('creator_type')) {
            $query->byCreator($request->creator_type);
        }

        // Filter by media type
        if ($request->filled('media_type')) {
            $query->where('media_type', $request->media_type);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhereHas('user', fn($uq) => $uq->where('name', 'like', "%{$search}%"));
            });
        }

        $stories = $query->orderBy('sort_order', 'asc')
                         ->orderBy('created_at', 'desc')
                         ->paginate($request->input('paginate', 10));

        return $this->paginated($stories);
    }

    /**
     * Store a newly created story
     */
    public function store(Request $request)
    {
        // Validate media file manually to avoid fileinfo dependency
        if (!$request->hasFile('media')) {
            return $this->error('Media file is required', 422);
        }

        $mediaFile = $request->file('media');
        $ext = strtolower($mediaFile->getClientOriginalExtension());
        $allowedImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $allowedVideo = ['mp4', 'webm', 'mov'];
        $allowed = array_merge($allowedImage, $allowedVideo);

        if (!in_array($ext, $allowed)) {
            return $this->error('Invalid file type. Allowed: ' . implode(', ', $allowed), 422);
        }

        // Check file size (50MB max)
        if ($mediaFile->getSize() > 51200 * 1024) {
            return $this->error('Media file is too large. Maximum size is 50MB', 422);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'title_ar' => 'nullable|string|max:255',
            'media_type' => 'required|in:image,video',
            'creator_type' => 'required|string|max:100',
            'user_id' => 'required|exists:users,id',
            'product_id' => 'nullable|exists:products,id',
            'button_text' => 'nullable|string|max:100',
            'button_text_ar' => 'nullable|string|max:100',
            'custom_link' => 'nullable|url|max:500',
            'duration_seconds' => 'nullable|integer|min:3|max:30',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 422);
        }

        $data = $validator->validated();

        // Handle media upload - use storeAs to avoid MIME guessing
        if ($request->hasFile('media')) {
            $file = $request->file('media');
            $ext = $file->getClientOriginalExtension();
            $filename = 'story_' . time() . '_' . uniqid() . '.' . $ext;
            $file->move(storage_path('app/public/stories'), $filename);
            $data['media_path'] = 'stories/' . $filename;
        }

        // Handle thumbnail upload (for videos)
        if ($request->hasFile('thumbnail')) {
            $thumb = $request->file('thumbnail');
            $thumbExt = $thumb->getClientOriginalExtension();
            $thumbFilename = 'thumb_' . time() . '_' . uniqid() . '.' . $thumbExt;
            $thumb->move(storage_path('app/public/stories/thumbnails'), $thumbFilename);
            $data['thumbnail'] = 'stories/thumbnails/' . $thumbFilename;
        }

        // Set default duration based on media type
        if (!isset($data['duration_seconds'])) {
            $data['duration_seconds'] = $data['media_type'] === 'video' ? 15 : 5;
        }

        // Remove 'media' key as we use 'media_path'
        unset($data['media']);

        $story = Story::create($data);

        // Clear cache
        $this->forgetStoriesCache();

        return $this->success($story->load(['user:id,name', 'product:id,name,slug']), 'Story created successfully');
    }

    /**
     * Display the specified story
     */
    public function show($id)
    {
        $story = Story::with(['user:id,name,email', 'product:id,name,slug,price,sale_price'])->find($id);

        if (!$story) {
            return $this->error('Story not found', 404);
        }

        return $this->success($story);
    }

    /**
     * Update the specified story
     */
    public function update(Request $request, $id)
    {
        $story = Story::find($id);

        if (!$story) {
            return $this->error('Story not found', 404);
        }

        // Validate media file manually if provided to avoid fileinfo dependency
        if ($request->hasFile('media')) {
            $mediaFile = $request->file('media');
            $ext = strtolower($mediaFile->getClientOriginalExtension());
            $allowedImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            $allowedVideo = ['mp4', 'webm', 'mov'];
            $allowed = array_merge($allowedImage, $allowedVideo);

            if (!in_array($ext, $allowed)) {
                return $this->error('Invalid file type. Allowed: ' . implode(', ', $allowed), 422);
            }

            // Check file size (50MB max)
            if ($mediaFile->getSize() > 51200 * 1024) {
                return $this->error('Media file is too large. Maximum size is 50MB', 422);
            }
        }

        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'title_ar' => 'nullable|string|max:255',
            'media_type' => 'sometimes|required|in:image,video',
            'creator_type' => 'sometimes|required|string|max:100',
            'user_id' => 'sometimes|required|exists:users,id',
            'product_id' => 'nullable|exists:products,id',
            'button_text' => 'nullable|string|max:100',
            'button_text_ar' => 'nullable|string|max:100',
            'custom_link' => 'nullable|url|max:500',
            'duration_seconds' => 'nullable|integer|min:3|max:30',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 422);
        }

        $data = $validator->validated();

        // Handle media upload - use move to avoid MIME guessing
        if ($request->hasFile('media')) {
            // Delete old media using native PHP
            if ($story->media_path && !str_starts_with($story->media_path, 'http')) {
                $oldMediaPath = storage_path('app/public/' . $story->media_path);
                if (file_exists($oldMediaPath)) {
                    @unlink($oldMediaPath);
                }
            }
            $file = $request->file('media');
            $ext = $file->getClientOriginalExtension();
            $filename = 'story_' . time() . '_' . uniqid() . '.' . $ext;
            $file->move(storage_path('app/public/stories'), $filename);
            $data['media_path'] = 'stories/' . $filename;
        }

        // Handle thumbnail upload - use move to avoid MIME guessing
        if ($request->hasFile('thumbnail')) {
            // Delete old thumbnail using native PHP
            if ($story->thumbnail && !str_starts_with($story->thumbnail, 'http')) {
                $oldThumbPath = storage_path('app/public/' . $story->thumbnail);
                if (file_exists($oldThumbPath)) {
                    @unlink($oldThumbPath);
                }
            }
            $thumb = $request->file('thumbnail');
            $thumbExt = $thumb->getClientOriginalExtension();
            $thumbFilename = 'thumb_' . time() . '_' . uniqid() . '.' . $thumbExt;
            $thumb->move(storage_path('app/public/stories/thumbnails'), $thumbFilename);
            $data['thumbnail'] = 'stories/thumbnails/' . $thumbFilename;
        }

        // Remove 'media' key
        unset($data['media']);

        $story->update($data);

        // Clear cache
        $this->forgetStoriesCache();

        return $this->success($story->load(['user:id,name', 'product:id,name,slug']), 'Story updated successfully');
    }

    /**
     * Remove the specified story
     */
    public function destroy($id)
    {
        $story = Story::find($id);

        if (!$story) {
            return $this->error('Story not found', 404);
        }

        // Delete media files using native PHP to avoid fileinfo dependency
        if ($story->media_path && !str_starts_with($story->media_path, 'http')) {
            $mediaPath = storage_path('app/public/' . $story->media_path);
            if (file_exists($mediaPath)) {
                @unlink($mediaPath);
            }
        }
        if ($story->thumbnail && !str_starts_with($story->thumbnail, 'http')) {
            $thumbPath = storage_path('app/public/' . $story->thumbnail);
            if (file_exists($thumbPath)) {
                @unlink($thumbPath);
            }
        }

        $story->delete();

        // Clear cache
        $this->forgetStoriesCache();

        return $this->success(null, 'Story deleted successfully');
    }

    /**
     * Toggle story status
     */
    public function toggleStatus($id)
    {
        $story = Story::find($id);

        if (!$story) {
            return $this->error('Story not found', 404);
        }

        $story->is_active = !$story->is_active;
        $story->save();

        // Clear cache
        $this->forgetStoriesCache();

        return $this->success($story, 'Story status updated successfully');
    }

    /**
     * Extend story expiry by 24 hours
     */
    public function extend($id)
    {
        $story = Story::find($id);

        if (!$story) {
            return $this->error('Story not found', 404);
        }

        // If expired, extend from now; otherwise extend from current expiry
        $baseTime = $story->is_expired ? Carbon::now() : $story->expires_at;
        $story->expires_at = $baseTime->copy()->addHours(24);
        $story->save();

        // Clear cache
        $this->forgetStoriesCache();

        return $this->success($story, 'Story extended by 24 hours');
    }

    /**
     * Get products for dropdown
     */
    public function products(Request $request)
    {
        $query = Product::select(['id', 'name', 'slug', 'price'])
            ->where('is_active', true);

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $products = $query->limit(50)->get();

        return $this->success($products);
    }

    /**
     * Bulk delete stories
     */
    public function bulkDelete(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array',
            'ids.*' => 'exists:stories,id',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 422);
        }

        $stories = Story::whereIn('id', $request->ids)->get();

        foreach ($stories as $story) {
            if ($story->media_path && !str_starts_with($story->media_path, 'http')) {
                Storage::disk('public')->delete($story->media_path);
            }
            if ($story->thumbnail && !str_starts_with($story->thumbnail, 'http')) {
                Storage::disk('public')->delete($story->thumbnail);
            }
            $story->delete();
        }

        // Clear cache
        $this->forgetStoriesCache();

        return $this->success(null, 'Stories deleted successfully');
    }

    /**
     * Helper to clear story thumbnail caches.
     */
    private function forgetStoriesCache(): void
    {
        Cache::forget('stories_thumbnails');
        Cache::forget('stories_thumbnails_v2');
    }
}
