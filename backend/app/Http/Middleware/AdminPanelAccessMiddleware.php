<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminPanelAccessMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->hasAdminPanelAccess()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to perform this action. Please contact an administrator.',
            ], 403);
        }

        return $next($request);
    }
}
