<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// ✅ Fix: prevent "Route [login] not defined" for unauthenticated redirects
Route::get('/login', function () {
    return response()->json([
        'success' => false,
        'message' => 'Unauthenticated.',
    ], 401);
})->name('login');
