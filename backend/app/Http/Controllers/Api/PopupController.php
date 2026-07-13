<?php

namespace App\Http\Controllers\Api;

use App\Models\Popup;
use App\Models\SubscriptionEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PopupController extends BaseController
{
    /**
     * Get active popups for the website
     * Returns all active popups - frontend handles page filtering
     */
    public function active(Request $request)
    {
        $cacheKey = "active_popups_all";

        $popups = Cache::remember($cacheKey, 300, function () {
            return Popup::query()
                ->active()
                ->scheduled()
                ->orderBy('priority', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();
        });

        return $this->success($popups);
    }

    /**
     * Get a single popup by type
     */
    public function byType(Request $request, string $type)
    {
        $cacheKey = "popup_type_{$type}";

        $popup = Cache::remember($cacheKey, 300, function () use ($type) {
            return Popup::query()
                ->active()
                ->scheduled()
                ->ofType($type)
                ->orderBy('priority', 'desc')
                ->first();
        });

        if (!$popup) {
            return $this->error('No active popup found for this type', 404);
        }

        return $this->success($popup);
    }

    /**
     * Newsletter subscription
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'source' => 'nullable|in:footer,popup',
        ]);

        $email = mb_strtolower(trim((string) $request->input('email')));
        $path = trim((string) $request->path(), '/');
        $source = $request->input('source');

        if (!$source) {
            $source = str_contains($path, 'popups/subscribe') ? 'popup' : 'footer';
        }

        $subscriber = SubscriptionEmail::firstOrCreate(
            ['email' => $email],
            [
                'source' => $source,
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]
        );

        if (!$subscriber->wasRecentlyCreated) {
            $subscriber->update([
                'source' => $source,
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]);

            return $this->success([
                'already_subscribed' => true,
            ], 'Email already subscribed');
        }

        return $this->success([
            'already_subscribed' => false,
        ], 'Subscribed successfully');
    }
}
