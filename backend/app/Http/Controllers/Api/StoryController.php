<?php

namespace App\Http\Controllers\Api;

use App\Models\Story;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class StoryController extends BaseController
{
    /**
     * Get active stories - OPTIMIZED for homepage
     * Returns individual stories as separate thumbnails
     */
    public function index()
    {
        // Cache for 10 minutes for fast homepage load
        $stories = Cache::remember('stories_thumbnails_v2', 600, function () {
            return Story::select(['id', 'user_id', 'creator_type', 'thumbnail', 'media_path', 'media_type', 'title', 'created_at'])
                ->active()
                ->with('user:id,name')
                ->orderBy('sort_order', 'asc')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($story) {
                    return [
                        'id' => $story->id,
                        'story_id' => $story->id,
                        'user_id' => $story->user_id,
                        'creator_name' => $story->creator_type ?: ($story->user?->name ?? 'Admin'),
                        'title' => $story->title,
                        'thumbnail' => $story->thumbnail_url,
                        'story_count' => 1, // Each story is individual now
                        'latest_at' => $story->created_at->toISOString(),
                    ];
                })
                ->toArray();
        });

        return $this->success($stories);
    }

    /**
     * Get full story data by story ID
     * Called when user clicks on a story thumbnail (lazy load)
     */
    public function show($storyId)
    {
        // Short cache (2 min) for full story data
        $cacheKey = "story_{$storyId}";

        $storyData = Cache::remember($cacheKey, 120, function () use ($storyId) {
            $story = Story::select([
                    'id', 'title', 'title_ar', 'media_type', 'media_path', 'thumbnail',
                    'user_id', 'creator_type', 'product_id', 'button_text', 'button_text_ar',
                    'custom_link', 'duration_seconds', 'expires_at', 'created_at'
                ])
                ->where('id', $storyId)
                ->active()
                ->with([
                    'user:id,name',
                    'product:id,name,slug,price,sale_price'
                ])
                ->first();

            if (!$story) {
                return null;
            }

            return [
                'id' => $story->id,
                'story_id' => $story->id,
                'user_id' => $story->user_id,
                'creator_name' => $story->creator_type ?: ($story->user?->name ?? 'Admin'),
                'stories' => [[
                    'id' => $story->id,
                    'title' => $story->title,
                    'title_ar' => $story->title_ar,
                    'media_type' => $story->media_type,
                    'media_url' => $story->media_url,
                    'thumbnail_url' => $story->thumbnail_url,
                    'duration' => $story->duration_seconds,
                    'creator_name' => $story->creator_type ?: ($story->user?->name ?? 'Admin'),
                    'time_remaining' => $story->time_remaining,
                    'product' => $story->product ? [
                        'id' => $story->product->id,
                        'name' => $story->product->name,
                        'slug' => $story->product->slug,
                        'price' => $story->product->final_price,
                    ] : null,
                    'button_text' => $story->button_text,
                    'button_text_ar' => $story->button_text_ar,
                    'link' => $story->getLinkUrl(),
                    'created_at' => $story->created_at->toISOString(),
                ]],
            ];
        });

        if (!$storyData) {
            return $this->error('Story not found', 404);
        }

        return $this->success($storyData);
    }
}
