<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\ShopLayoutSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShopLayoutController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $scope = $request->query('scope', 'global');
        $scopeId = $request->query('scope_id') ? (int) $request->query('scope_id') : null;

        $settings = ShopLayoutSetting::getSettings($scope, $scopeId);

        return $this->success([
            'scope' => $scope,
            'scope_id' => $scopeId,
            'settings' => $settings,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scope' => 'required|in:global,shop,category,brand',
            'scope_id' => 'nullable|integer',
            'settings' => 'required|array',
            'settings.grid' => 'sometimes|array',
            'settings.card_image' => 'sometimes|array',
            'settings.card_content' => 'sometimes|array',
            'settings.card_order' => 'sometimes|array',
            'settings.text' => 'sometimes|array',
            'settings.sorting' => 'sometimes|array',
            'settings.priority' => 'sometimes|array',
        ]);

        $scope = $validated['scope'];
        $scopeId = $validated['scope_id'] ?? null;

        // Merge with defaults so partial updates don't lose keys
        $current = ShopLayoutSetting::getSettings($scope, $scopeId);
        $merged = array_replace_recursive($current, $validated['settings']);

        $record = ShopLayoutSetting::saveSettings($scope, $merged, $scopeId);

        return $this->success([
            'scope' => $scope,
            'scope_id' => $scopeId,
            'settings' => $record->settings,
        ], 'Settings saved');
    }
}
