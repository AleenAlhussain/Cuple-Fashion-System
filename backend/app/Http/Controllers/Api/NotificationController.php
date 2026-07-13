<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\DiscountRule;
use App\Models\UserNotification;
use Illuminate\Http\Request;

class NotificationController extends BaseController
{
    public function index(Request $request)
    {
        $notifications = UserNotification::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        $ruleIds = $notifications
            ->where('type', 'discount_offer')
            ->pluck('data.rule_id')
            ->filter()
            ->unique()
            ->values();

        $rulesById = $ruleIds->isEmpty()
            ? collect()
            : DiscountRule::whereIn('id', $ruleIds)
                ->pluck('name', 'id');

        if ($rulesById->isNotEmpty()) {
            $notifications->transform(function ($notification) use ($rulesById) {
                if ($notification->type !== 'discount_offer') {
                    return $notification;
                }

                $data = $notification->data ?? [];
                if (!empty($data['rule_name'])) {
                    return $notification;
                }

                $ruleId = $data['rule_id'] ?? null;
                if ($ruleId && isset($rulesById[$ruleId])) {
                    $data['rule_name'] = $rulesById[$ruleId];
                    $notification->data = $data;
                }

                return $notification;
            });
        }

        return $this->success($notifications);
    }

    public function markAsRead(Request $request, $id = null)
    {
        $validated = $request->validate([
            'ids' => 'nullable|array',
            'ids.*' => 'integer',
        ]);

        $query = UserNotification::where('user_id', $request->user()->id);
        if ($id) {
            $query->where('id', $id);
        } elseif (!empty($validated['ids'])) {
            $query->whereIn('id', $validated['ids']);
        }

        $query->update(['read_at' => now()]);

        return $this->success(null, 'Notifications marked as read');
    }
}
