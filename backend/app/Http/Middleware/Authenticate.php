<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo($request): ?string
    {
        // مهم جداً للـ API
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }

        // لو مستقبلاً عندك login route للويب
        return route('login');
    }
}


