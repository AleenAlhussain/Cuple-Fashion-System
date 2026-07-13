<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Removed EnsureFrontendRequestsAreStateful to avoid CSRF issues with API-only requests
        // API uses token-based auth via Sanctum, not cookie-based SPA auth

        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'admin_panel' => \App\Http\Middleware\AdminPanelAccessMiddleware::class,
            'admin_or_manager' => \App\Http\Middleware\AdminOrShopManagerMiddleware::class,
            'admin_order_access' => \App\Http\Middleware\AdminOrderAccessMiddleware::class,
        ]);

        $middleware->redirectGuestsTo(function ($request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return null;
            }

            return route('login');
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
