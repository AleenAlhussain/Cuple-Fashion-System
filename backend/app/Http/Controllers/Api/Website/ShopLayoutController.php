<?php

namespace App\Http\Controllers\Api\Website;

use App\Http\Controllers\Api\BaseController;
use App\Models\ShopLayoutSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShopLayoutController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $scope = $request->query('scope', 'shop');
        $scopeId = $request->query('scope_id') ? (int) $request->query('scope_id') : null;

        $settings = ShopLayoutSetting::resolveForWebsite($scope, $scopeId);

        return $this->success($settings);
    }
}
