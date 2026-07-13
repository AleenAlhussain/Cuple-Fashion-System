<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StripePaymentController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\PointController;
use App\Http\Controllers\Api\ProductVariantFilterController;
use App\Http\Controllers\Api\AramexTrackingController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\Website\TrackResolverController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\FaqController;
use App\Http\Controllers\Api\Admin\MenuController;
use App\Http\Controllers\Api\Admin\StoreController;
use App\Http\Controllers\Api\ShippingController as PublicShippingController;
use App\Http\Controllers\Api\Admin\ShippingController;
use App\Http\Controllers\Api\Admin\ShippingRuleController;
use App\Http\Controllers\Api\Admin\ReturnRequestController as AdminReturnRequestController;
use App\Http\Controllers\Api\Admin\AramexStatusMappingController;
use App\Http\Controllers\Api\Admin\PageController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Auth\Events\Verified;
use App\Models\User;
use App\Models\Point;

/*
|--------------------------------------------------------------------------
| Website API Routes
|--------------------------------------------------------------------------
*/
// Website routes available on /api/*
Route::get('media/{path}', [MediaController::class, 'show'])
    ->where('path', '.*')
    ->name('media.show');

Route::group([], base_path('routes/api_website.php'));

// Backward-compatible prefix /api/website/*
Route::prefix('website')->group(base_path('routes/api_website.php'));
Route::get('website/order/invoice/{orderNumber}', [OrderController::class, 'downloadInvoiceByNumber'])
    ->middleware('signed')
    ->name('website.order.invoice.download');

Route::post('shipping/calculate', [PublicShippingController::class, 'calculate']);
Route::get('shipping/countries', [PublicShippingController::class, 'availableCountries']);

Route::post('forgot-password', [AuthController::class, 'sendResetLinkEmail']);
Route::get('password/reset/{token}', function (Request $request, $token) {
    $email = $request->query('email');
    $frontendBase = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000'));
    $redirectUrl = rtrim($frontendBase, '/') . '/reset-password';

    $params = http_build_query(array_filter([
        'token' => $token,
        'email' => $email,
    ]));

    return redirect()->away($params ? "{$redirectUrl}?{$params}" : $redirectUrl);
})->name('password.reset');
Route::get('email/verify/{id}/{hash}', function (Request $request, $id, $hash) {
    if (!URL::hasValidSignature($request)) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid or expired verification link.',
        ], 403);
    }

    $user = User::findOrFail($id);

    if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid verification link.',
        ], 403);
    }

    if (!$user->hasVerifiedEmail()) {
        $user->markEmailAsVerified();
        $user->update(['is_active' => true]);
        event(new Verified($user));

    }

    $payload = [
        'success' => true,
        'message' => 'Email verified successfully.',
    ];

    if ($request->expectsJson()) {
        return response()->json($payload);
    }

    $frontendBase = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000'));
    $redirectUrl = rtrim($frontendBase, '/') . '/account/dashboard?verified=1';

    return redirect()->away($redirectUrl);
})->middleware('signed')->name('verification.verify');


/*
Route::prefix('website')->group(function () {
    // Public routes
    Route::get('theme-options', [SettingsController::class, 'themeOptions']);
    Route::get('countries', [SettingsController::class, 'countries']);
    Route::get('banners', [SettingsController::class, 'banners']);

    // Products
    Route::get('products', [ProductController::class, 'index']);
    Route::get('products/search', [ProductController::class, 'quickSearch']); // Optimized quick search
    Route::get('products/featured', [ProductController::class, 'featured']);
    Route::get('products/{id}', [ProductController::class, 'show']);
    Route::get('products/{id}/variants', [ProductController::class, 'variants']);
    Route::get('products/{id}/related', [ProductController::class, 'related']);
    Route::get('product-variants/colors', [ProductVariantFilterController::class, 'colors']);

    // Categories
    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('categories/{id}', [CategoryController::class, 'show']);
    Route::get('categories/{id}/products', [CategoryController::class, 'products']);

    // Tags
    Route::get('tags', function () {
        return response()->json([
            'success' => true,
            'data' => \App\Models\Tag::where('status', true)->get(),
        ]);
    });

    // Auth
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('reset-password', [AuthController::class, 'resetPasswordWithToken']);
    Route::post('check-email', [AuthController::class, 'checkEmail']);

    // Order Statuses (public)
    Route::get('order-statuses', [OrderController::class, 'statuses']);
    Route::post('stripe/payment-intent', [StripePaymentController::class, 'createPaymentIntent']);

    // Cart (works for guests too)
    Route::get('cart', [CartController::class, 'index']);
    Route::post('cart', [CartController::class, 'add']);
    Route::put('cart/{itemId}', [CartController::class, 'update']);
    Route::delete('cart/{itemId}', [CartController::class, 'remove']);
    Route::delete('cart', [CartController::class, 'clear']);
    Route::post('cart/sync', [CartController::class, 'sync']);

    // Coupons
    Route::get('coupons', [CouponController::class, 'index']);
    Route::post('coupons/validate', [CouponController::class, 'validate']);

    // Guest checkout
    Route::post('checkout/guest', [OrderController::class, 'guestCheckout']);

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        // User
        Route::get('self', [AuthController::class, 'user']);
        Route::put('self', [AuthController::class, 'updateProfile']);
        Route::post('self/password', [AuthController::class, 'changePassword']);
        Route::post('logout', [AuthController::class, 'logout']);

        // Addresses
        Route::get('address', [AddressController::class, 'index']);
        Route::post('address', [AddressController::class, 'store']);
        Route::get('address/{id}', [AddressController::class, 'show']);
        Route::put('address/{id}', [AddressController::class, 'update']);
        Route::delete('address/{id}', [AddressController::class, 'destroy']);
        Route::post('address/{id}/default', [AddressController::class, 'setDefault']);

        // Wishlist
        Route::get('wishlist', [WishlistController::class, 'index']);
        Route::post('wishlist', [WishlistController::class, 'toggle']);
        Route::post('wishlist/add', [WishlistController::class, 'add']);
        Route::delete('wishlist/{productId}', [WishlistController::class, 'remove']);
        Route::get('wishlist/check/{productId}', [WishlistController::class, 'check']);

        // Orders
        Route::get('order', [OrderController::class, 'index']);
        Route::post('order', [OrderController::class, 'store']);
        Route::get('order/{id}', [OrderController::class, 'show']);
        Route::post('order/{id}/cancel', [OrderController::class, 'cancel']);
        Route::post('order/invoice', [OrderController::class, 'downloadInvoice']);

        // Points (both /points and /wallet/points for compatibility)
        Route::get('points', [PointController::class, 'index']);
        Route::get('wallet/points', [PointController::class, 'index']);
        Route::post('points/calculate', [PointController::class, 'calculate']);
        Route::post('points/redeem', [PointController::class, 'redeem']);
    });
});
*/


/*
|--------------------------------------------------------------------------
| Admin API Routes (NO AUTH REQUIRED - temporary for development)
| To restore auth: wrap routes below in Route::middleware(['auth:sanctum'])->group()
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->group(function () {
    // Admin login (matches frontend expecting /login)
    Route::post('login', [AuthController::class, 'adminLogin']);
    Route::post('forgot-password', [AuthController::class, 'sendResetLinkEmail']);

    Route::middleware(['auth:sanctum', 'admin_panel'])->group(function () {
        Route::get('self', [AuthController::class, 'adminSelf']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::put('updateProfile', [AuthController::class, 'updateProfile']);
        Route::put('updatePassword', [AuthController::class, 'changePassword']);
        Route::post('verifyEmailChange', [AuthController::class, 'verifyEmailChange']);
        Route::get('settings', [\App\Http\Controllers\Api\Admin\SettingController::class, 'index']);
    });

    Route::middleware(['auth:sanctum', 'admin_or_manager'])->group(function () {

        // Dashboard
        Route::get('dashboard/chart', [\App\Http\Controllers\Api\Admin\OrderController::class, 'chart']);

        // Cart (admin POS)
        Route::get('cart', [\App\Http\Controllers\Api\CartController::class, 'index']);
        Route::post('cart', [\App\Http\Controllers\Api\CartController::class, 'add']);
        Route::put('cart/{itemId}', [\App\Http\Controllers\Api\CartController::class, 'update']);
        Route::delete('cart/{itemId}', [\App\Http\Controllers\Api\CartController::class, 'remove']);
        Route::delete('cart', [\App\Http\Controllers\Api\CartController::class, 'clear']);
        Route::post('cart/sync', [\App\Http\Controllers\Api\CartController::class, 'sync']);

        // Addresses (admin POS)
        Route::post('address', [\App\Http\Controllers\Api\AddressController::class, 'store']);
        Route::get('badge', [DashboardController::class, 'badge']);
        Route::post('settings/test-email', [\App\Http\Controllers\Api\Admin\SettingController::class, 'sendTestEmail']);
        Route::get('settings/whatsapp', [\App\Http\Controllers\Api\Admin\WhatsAppSettingController::class, 'show']);
        Route::put('settings/whatsapp', [\App\Http\Controllers\Api\Admin\WhatsAppSettingController::class, 'update']);
        Route::get('settings/shop-layout', [\App\Http\Controllers\Api\Admin\ShopLayoutController::class, 'index']);

        // Payment Gateways (BNPL)
        Route::get('payment-gateway', [\App\Http\Controllers\Api\Admin\PaymentGatewayController::class, 'index']);
        Route::get('payment-gateway/{id}', [\App\Http\Controllers\Api\Admin\PaymentGatewayController::class, 'show']);
        Route::put('payment-gateway/{id}', [\App\Http\Controllers\Api\Admin\PaymentGatewayController::class, 'update']);
        Route::put('payment-gateway/{id}/toggle', [\App\Http\Controllers\Api\Admin\PaymentGatewayController::class, 'toggleStatus']);
        Route::post('payment-gateway/{id}/test', [\App\Http\Controllers\Api\Admin\PaymentGatewayController::class, 'testConnection']);
        Route::get('payment-gateway/{id}/statistics', [\App\Http\Controllers\Api\Admin\PaymentGatewayController::class, 'statistics']);
        Route::get('payment-transactions', [\App\Http\Controllers\Api\Admin\PaymentGatewayController::class, 'transactions']);


        // Theme Options (read-only)
        Route::get('themeOptions', [\App\Http\Controllers\Api\Admin\SettingController::class, 'themeOptions']);

        // Products (singular to match frontend /product) - non-destructive
        Route::get('product', [\App\Http\Controllers\Api\Admin\ProductController::class, 'index']);
        Route::post('product', [\App\Http\Controllers\Api\Admin\ProductController::class, 'store']);
        Route::get('product/{id}', [\App\Http\Controllers\Api\Admin\ProductController::class, 'show']);
        Route::put('product/{id}', [\App\Http\Controllers\Api\Admin\ProductController::class, 'update']);
        Route::put('products/{productId}/galleries/reorder', [\App\Http\Controllers\Api\Admin\ProductController::class, 'reorderGalleries']);
        Route::post('product/{id}/images', [\App\Http\Controllers\Api\Admin\ProductController::class, 'uploadImage']);
        Route::delete('product/{productId}/images/{imageId}', [\App\Http\Controllers\Api\Admin\ProductController::class, 'deleteImage']);
        Route::post('product/{productId}/variants', [\App\Http\Controllers\Api\Admin\ProductController::class, 'storeVariant']);
        Route::put('product/{productId}/variants/{variantId}', [\App\Http\Controllers\Api\Admin\ProductController::class, 'updateVariant']);
        Route::post('product/replicate/{id}', [\App\Http\Controllers\Api\Admin\ProductController::class, 'replicate']);
        Route::get('product/csv/export', [\App\Http\Controllers\Api\Admin\ProductController::class, 'export']);
        Route::get('product/excel/export', [\App\Http\Controllers\Api\Admin\ProductController::class, 'exportExcel']);
        Route::post('product/export-selected', [\App\Http\Controllers\Api\Admin\ProductController::class, 'exportSelected']);

        // Orders (singular to match frontend /order) - non-destructive
        /*
         * Order routes are registered in the dedicated admin_order_access group
         * below so stock keepers and accounting team can access only the
         * Orders module without inheriting broader admin permissions.
         */

        // Refund/Exchange Requests
        Route::get('refund', [AdminReturnRequestController::class, 'refundIndex']);
        Route::put('refund/{id}', [AdminReturnRequestController::class, 'updateRefundStatus']);
        Route::post('refund/{id}/create-return-awb', [AdminReturnRequestController::class, 'createReturnAwb']);
        Route::get('exchange', [AdminReturnRequestController::class, 'exchangeIndex']);
        Route::put('exchange/{id}', [AdminReturnRequestController::class, 'updateExchangeStatus']);
        Route::post('exchange/{id}/create-return-awb', [AdminReturnRequestController::class, 'createExchangeReturnAwb']);
        Route::post('return-requests/{id}/schedule-pickup', [AdminReturnRequestController::class, 'scheduleReturnPickup']);

        // Invoices (read access)
        Route::get('invoice', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'index']);
        Route::get('invoice/{id}', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'show']);
        Route::get('invoice/{id}/download', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'download']);
        Route::get('invoice/{id}/preview', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'preview']);

        // Coupons (offers/pricing)
        Route::get('coupon', [\App\Http\Controllers\Api\Admin\CouponController::class, 'index']);
        Route::post('coupon', [\App\Http\Controllers\Api\Admin\CouponController::class, 'store']);
        Route::get('coupon/{id}', [\App\Http\Controllers\Api\Admin\CouponController::class, 'show']);
        Route::put('coupon/{id}', [\App\Http\Controllers\Api\Admin\CouponController::class, 'update']);

        // Gift Box Offers
        Route::get('gift-box-offer', [\App\Http\Controllers\Api\Admin\GiftBoxOfferController::class, 'index']);
        Route::post('gift-box-offer', [\App\Http\Controllers\Api\Admin\GiftBoxOfferController::class, 'store']);
        Route::get('gift-box-offer/{id}', [\App\Http\Controllers\Api\Admin\GiftBoxOfferController::class, 'show']);
        Route::put('gift-box-offer/{id}', [\App\Http\Controllers\Api\Admin\GiftBoxOfferController::class, 'update']);

        // Discount Rules (Offer Engine) - non-destructive
        Route::get('discount-rule', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'index']);
        Route::get('discount-rule/enums', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'getEnums']);
        Route::get('discount-rule/stacking-groups', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'getStackingGroups']);
        Route::get('discount-rule/filter-options', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'getFilterOptions']);
        Route::post('discount-rule', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'store']);
        Route::get('discount-rule/{id}', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'show']);
        Route::get('discount-rule/{id}/statistics', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'statistics']);
        Route::get('discount-rule/{id}/statistics/export', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'exportStatistics']);
        Route::put('discount-rule/{id}', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'update']);
        Route::put('discount-rule/{id}/toggle-status', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'toggleStatus']);
        Route::put('discount-rule/{id}/status', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'toggleStatus']); // Alias for Status component
        Route::post('discount-rule/{id}/duplicate', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'duplicate']);

        // Discount Reports
        Route::get('discount-reports/overview', [\App\Http\Controllers\Api\Admin\DiscountReportController::class, 'overview']);
        Route::get('discount-reports/by-rule', [\App\Http\Controllers\Api\Admin\DiscountReportController::class, 'byRule']);
        Route::get('discount-reports/by-date', [\App\Http\Controllers\Api\Admin\DiscountReportController::class, 'byDate']);
        Route::get('discount-reports/by-rule-type', [\App\Http\Controllers\Api\Admin\DiscountReportController::class, 'byRuleType']);
        Route::get('discount-reports/export', [\App\Http\Controllers\Api\Admin\DiscountReportController::class, 'export']);

        // Promo Groups (for SKU-based targeting)
        Route::get('promo-group', [\App\Http\Controllers\Api\Admin\PromoGroupController::class, 'index']);
        Route::post('promo-group', [\App\Http\Controllers\Api\Admin\PromoGroupController::class, 'store']);
        Route::get('promo-group/template', [\App\Http\Controllers\Api\Admin\PromoGroupController::class, 'downloadTemplate']);
        Route::get('promo-group/{id}', [\App\Http\Controllers\Api\Admin\PromoGroupController::class, 'show']);
        Route::put('promo-group/{id}', [\App\Http\Controllers\Api\Admin\PromoGroupController::class, 'update']);
        Route::delete('promo-group/{id}', [\App\Http\Controllers\Api\Admin\PromoGroupController::class, 'destroy']);
        Route::post('promo-group/{id}/upload-skus', [\App\Http\Controllers\Api\Admin\PromoGroupController::class, 'uploadSkus']);
        Route::post('promo-group/{id}/remove-skus', [\App\Http\Controllers\Api\Admin\PromoGroupController::class, 'removeSkus']);
        Route::get('promo-group/{id}/variants', [\App\Http\Controllers\Api\Admin\PromoGroupController::class, 'getVariants']);

        // Variants by category (for promo group bulk selection)
        Route::get('variants-by-category/{categoryId}', [\App\Http\Controllers\Api\Admin\PromoGroupController::class, 'getVariantsByCategory']);

        // Catalog lookups (read-only)
        Route::get('category', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'index']);
        Route::get('category/{id}', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'show']);
        Route::get('attribute', [\App\Http\Controllers\Api\Admin\AttributeController::class, 'index']);
        Route::get('attribute/{id}', [\App\Http\Controllers\Api\Admin\AttributeController::class, 'show']);
        Route::get('store', [StoreController::class, 'index']);
        Route::get('store/{id}', [StoreController::class, 'show'])->whereNumber('id');
        Route::put('store/approve/{id}/status', [StoreController::class, 'updateStatus'])->whereNumber('id');
        Route::get('tag', [\App\Http\Controllers\Api\Admin\TagController::class, 'index']);
        Route::get('tag/{id}', [\App\Http\Controllers\Api\Admin\TagController::class, 'show']);
        Route::get('brand', [\App\Http\Controllers\Api\Admin\BrandController::class, 'index']);
        Route::get('brand/{id}', [\App\Http\Controllers\Api\Admin\BrandController::class, 'show']);

        // Users (read-only)
        Route::get('user', [\App\Http\Controllers\Api\Admin\UserController::class, 'index']);
        Route::get('user/role-counts', [\App\Http\Controllers\Api\Admin\UserController::class, 'roleCounts']);
        Route::get('user/{id}', [\App\Http\Controllers\Api\Admin\UserController::class, 'show']);
        Route::get('user/csv/export', [\App\Http\Controllers\Api\Admin\UserController::class, 'export']);
        Route::post('user/export-selected', [\App\Http\Controllers\Api\Admin\UserController::class, 'exportSelected']);
        Route::get('user/{id}/addresses', [\App\Http\Controllers\Api\Admin\UserController::class, 'addresses']);
        Route::get('user/{id}/addresses/export', [\App\Http\Controllers\Api\Admin\UserController::class, 'exportAddresses']);
        Route::get('users/addresses/export', [\App\Http\Controllers\Api\Admin\UserController::class, 'exportAllAddresses']);

        // Subscription emails
        Route::get('subscription-email', [\App\Http\Controllers\Api\Admin\SubscriptionEmailController::class, 'index']);
        Route::get('subscription-email/export', [\App\Http\Controllers\Api\Admin\SubscriptionEmailController::class, 'export']);

        // Wallets
        Route::get('wallet/consumer', [\App\Http\Controllers\Api\Admin\WalletController::class, 'consumerTransactions']);
        Route::get('wallet/vendor', [\App\Http\Controllers\Api\Admin\WalletController::class, 'vendorTransactions']);
        Route::post('credit/wallet', [\App\Http\Controllers\Api\Admin\WalletController::class, 'credit']);
        Route::post('debit/wallet', [\App\Http\Controllers\Api\Admin\WalletController::class, 'debit']);
        Route::post('credit/vendorWallet', [\App\Http\Controllers\Api\Admin\WalletController::class, 'credit']);
        Route::post('debit/vendorWallet', [\App\Http\Controllers\Api\Admin\WalletController::class, 'debit']);

        // Points
        Route::get('point', [\App\Http\Controllers\Api\Admin\PointController::class, 'index']);
        Route::get('point/{userId}', [\App\Http\Controllers\Api\Admin\PointController::class, 'show']);
        Route::post('point/credit', [\App\Http\Controllers\Api\Admin\PointController::class, 'credit']);
        Route::post('point/debit', [\App\Http\Controllers\Api\Admin\PointController::class, 'debit']);
        Route::get('points/consumer', [\App\Http\Controllers\Api\Admin\PointController::class, 'consumerTransactions']);
        Route::post('credit/points', [\App\Http\Controllers\Api\Admin\PointController::class, 'credit']);
        Route::post('debit/points', [\App\Http\Controllers\Api\Admin\PointController::class, 'debit']);

        // Attachments
        Route::get('attachment', [\App\Http\Controllers\Api\Admin\AttachmentController::class, 'index']);
        Route::get('attachment/export', [\App\Http\Controllers\Api\Admin\AttachmentController::class, 'exportXlsx']);
        Route::post('attachment', [\App\Http\Controllers\Api\Admin\AttachmentController::class, 'store']);
        Route::post('attachment/deleteAll', [\App\Http\Controllers\Api\Admin\AttachmentController::class, 'bulkDelete']);
        Route::delete('attachment/{id}', [\App\Http\Controllers\Api\Admin\AttachmentController::class, 'destroy']);
    });

    Route::middleware(['auth:sanctum', 'admin_order_access'])->group(function () {
        Route::get('statistics/count', [\App\Http\Controllers\Api\Admin\OrderController::class, 'statistics']);
        Route::get('order', [\App\Http\Controllers\Api\Admin\OrderController::class, 'index']);
        Route::get('order/trashed', [\App\Http\Controllers\Api\Admin\OrderController::class, 'trashed']);
        Route::get('order/{id}', [\App\Http\Controllers\Api\Admin\OrderController::class, 'show'])->whereNumber('id');
        Route::put('order/{id}', [\App\Http\Controllers\Api\Admin\OrderController::class, 'update'])->whereNumber('id');
        Route::get('orders/{id}', [\App\Http\Controllers\Api\Admin\OrderController::class, 'show'])->whereNumber('id');
        Route::put('orders/{id}', [\App\Http\Controllers\Api\Admin\OrderController::class, 'update'])->whereNumber('id');
        Route::put('order/{id}/status', [\App\Http\Controllers\Api\Admin\OrderController::class, 'updateStatus']);
        Route::put('order/{id}/payment', [\App\Http\Controllers\Api\Admin\OrderController::class, 'updatePaymentStatus']);
        Route::put('order/{id}/shipping', [\App\Http\Controllers\Api\Admin\OrderController::class, 'updateShipping']);
        Route::post('order/{id}/note', [\App\Http\Controllers\Api\Admin\OrderController::class, 'addNote']);
        Route::get('orderStatus', [\App\Http\Controllers\Api\Admin\OrderController::class, 'statuses']);
        Route::get('order/export/xlsx', [\App\Http\Controllers\Api\Admin\OrderController::class, 'exportXlsx']);
        Route::post('order/export/xlsx', [\App\Http\Controllers\Api\Admin\OrderController::class, 'exportXlsx']);
        Route::get('order/export/pdf', [\App\Http\Controllers\Api\Admin\OrderController::class, 'exportPdf']);
        Route::post('order/export/pdf', [\App\Http\Controllers\Api\Admin\OrderController::class, 'exportPdf']);
        Route::post('order/pick-list/export', [\App\Http\Controllers\Api\Admin\OrderController::class, 'exportOnlineRequest']);
        Route::get('order/{orderId}/invoice', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'getByOrder']);
        Route::get('order/{orderId}/invoice/download', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'downloadByOrder']);
        Route::post('order/{orderId}/invoice/generate', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'generate']);
        Route::post('invoice/{id}/send-email', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'sendEmail']);
    });

    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        // Products (destructive)
        Route::delete('product/{id}', [\App\Http\Controllers\Api\Admin\ProductController::class, 'destroy']);
        Route::post('product/{id}/restore', [\App\Http\Controllers\Api\Admin\ProductController::class, 'restore']);
        Route::delete('product/{id}/force', [\App\Http\Controllers\Api\Admin\ProductController::class, 'forceDestroy']);
        Route::post('product/bulk-action', [\App\Http\Controllers\Api\Admin\ProductController::class, 'bulkAction']);
        Route::delete('product/deleteAll', [\App\Http\Controllers\Api\Admin\ProductController::class, 'bulkDelete']);
        Route::delete('product/{productId}/variants/{variantId}', [\App\Http\Controllers\Api\Admin\ProductController::class, 'deleteVariant']);
        Route::post('product/csv/import', [\App\Http\Controllers\Api\Admin\ImportController::class, 'importProducts']);

        // Categories (singular to match frontend /category)
        Route::post('category', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'store']);
        Route::post('category/bulk-action', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'bulkAction']);
        Route::post('category/deleteAll', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'bulkDelete']);
        Route::delete('category/deleteAll', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'bulkDelete']);
        Route::put('category/{id}', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'update']);
        Route::delete('category/{id}', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'destroy']);

        // Orders (destructive/restore)
        Route::post('order', [\App\Http\Controllers\Api\Admin\OrderController::class, 'store']);
        Route::delete('order/deleteAll', [\App\Http\Controllers\Api\Admin\OrderController::class, 'bulkDelete']);
        Route::post('order/{id}/duplicate', [\App\Http\Controllers\Api\Admin\OrderController::class, 'duplicate']);
        Route::post('order/{id}/restore', [\App\Http\Controllers\Api\Admin\OrderController::class, 'restore']);
        Route::delete('order/{id}', [\App\Http\Controllers\Api\Admin\OrderController::class, 'destroy']);
        Route::delete('order/{id}/force', [\App\Http\Controllers\Api\Admin\OrderController::class, 'forceDelete']);

        // Invoices (admin actions)
        Route::post('invoice/{id}/regenerate', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'regenerate']);
        Route::post('invoice/{id}/mark-paid', [\App\Http\Controllers\Api\Admin\InvoiceController::class, 'markPaid']);

        // Users (admin only)
        Route::post('user/bulk-action', [\App\Http\Controllers\Api\Admin\UserController::class, 'bulkAction']);
        Route::post('user', [\App\Http\Controllers\Api\Admin\UserController::class, 'store']);
        Route::put('user/{id}', [\App\Http\Controllers\Api\Admin\UserController::class, 'update']);
        Route::put('user/{id}/status', [\App\Http\Controllers\Api\Admin\UserController::class, 'toggleStatus']);
        Route::put('user/{id}/reset-password', [\App\Http\Controllers\Api\Admin\UserController::class, 'resetPassword']);
        Route::put('user/{id}/reset-password-direct', [\App\Http\Controllers\Api\Admin\UserController::class, 'resetPasswordDirect']);
        Route::delete('user/{id}', [\App\Http\Controllers\Api\Admin\UserController::class, 'destroy']);
        Route::delete('user/deleteAll', [\App\Http\Controllers\Api\Admin\UserController::class, 'bulkDelete']);

        // Countries
        Route::get('country', [SettingsController::class, 'countries']);

        // Shipping
        Route::get('shipping', [ShippingController::class, 'index']);
        Route::post('shipping', [ShippingController::class, 'store']);
        Route::get('shipping/{id}', [ShippingController::class, 'show']);

        // Aramex status mapping
        Route::get('aramex-status-mappings', [AramexStatusMappingController::class, 'index']);
        Route::put('aramex-status-mappings/{mapping}', [AramexStatusMappingController::class, 'update']);
        Route::post('aramex-status-mappings/reimport', [AramexStatusMappingController::class, 'reimport']);

        // Shipping rules
        Route::post('shippingRule', [ShippingRuleController::class, 'store']);
        Route::put('shippingRule/{id}', [ShippingRuleController::class, 'update']);
        Route::delete('shippingRule/{id}', [ShippingRuleController::class, 'destroy']);

        // Attributes (for product variants)
        Route::post('attribute', [\App\Http\Controllers\Api\Admin\AttributeController::class, 'store']);
        Route::post('attribute/bulk-action', [\App\Http\Controllers\Api\Admin\AttributeController::class, 'bulkAction']);
        Route::put('attribute/{id}', [\App\Http\Controllers\Api\Admin\AttributeController::class, 'update']);
        Route::delete('attribute/{id}', [\App\Http\Controllers\Api\Admin\AttributeController::class, 'destroy']);

        // Tags
        Route::post('tag', [\App\Http\Controllers\Api\Admin\TagController::class, 'store']);
        Route::post('tag/bulk-action', [\App\Http\Controllers\Api\Admin\TagController::class, 'bulkAction']);
        Route::put('tag/{id}', [\App\Http\Controllers\Api\Admin\TagController::class, 'update']);
        Route::delete('tag/{id}', [\App\Http\Controllers\Api\Admin\TagController::class, 'destroy']);

        // Brands
        Route::post('brand', [\App\Http\Controllers\Api\Admin\BrandController::class, 'store']);
        Route::post('brand/bulk-action', [\App\Http\Controllers\Api\Admin\BrandController::class, 'bulkAction']);
        Route::put('brand/{id}', [\App\Http\Controllers\Api\Admin\BrandController::class, 'update']);
        Route::put('brand/{id}/status', [\App\Http\Controllers\Api\Admin\BrandController::class, 'updateStatus']);
        Route::delete('brand/{id}', [\App\Http\Controllers\Api\Admin\BrandController::class, 'destroy']);

        // Coupons (delete only)
        Route::delete('coupon/{id}', [\App\Http\Controllers\Api\Admin\CouponController::class, 'destroy']);

        // Discount Rules (destructive)
        Route::delete('discount-rule/{id}', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'destroy']);
        Route::post('discount-rule/bulk-delete', [\App\Http\Controllers\Api\Admin\DiscountRuleController::class, 'bulkDestroy']);


        // Settings
        Route::put('settings', [\App\Http\Controllers\Api\Admin\SettingController::class, 'update']);
        Route::put('settings/points', [\App\Http\Controllers\Api\Admin\SettingController::class, 'updatePoints']);
        Route::put('settings/shop-layout', [\App\Http\Controllers\Api\Admin\ShopLayoutController::class, 'update']);

        // Theme Options
        Route::post('themeOptions', [\App\Http\Controllers\Api\Admin\SettingController::class, 'updateThemeOptions']);
        Route::put('themeOptions', [\App\Http\Controllers\Api\Admin\SettingController::class, 'updateThemeOptions']);

        // Import
        Route::post('import/products', [\App\Http\Controllers\Api\Admin\ImportController::class, 'importProducts']);
        Route::post('import/products-action', [\App\Http\Controllers\Api\Admin\ImportController::class, 'importProductsAction']);
        Route::post('import/products-action/start', [\App\Http\Controllers\Api\Admin\ImportController::class, 'startProductActionImport']);
        Route::post('import/products-action/history/{id}/process', [\App\Http\Controllers\Api\Admin\ImportController::class, 'processProductActionImport']);
        Route::get('import/products-action/history', [\App\Http\Controllers\Api\Admin\ImportController::class, 'listProductActionImportHistory']);
        Route::get('import/products-action/history/{id}', [\App\Http\Controllers\Api\Admin\ImportController::class, 'showProductActionImportHistory']);
        Route::post('import/products-action/history/{id}/rollback', [\App\Http\Controllers\Api\Admin\ImportController::class, 'rollbackProductActionImportHistory']);
        Route::delete('import/products-action/history/{id}', [\App\Http\Controllers\Api\Admin\ImportController::class, 'destroyProductActionImportHistory']);
        Route::get('import/template', [\App\Http\Controllers\Api\Admin\ImportController::class, 'downloadTemplate']);

        // Bulk Status Update
        Route::post('import/status-update', [\App\Http\Controllers\Api\Admin\ImportController::class, 'bulkStatusUpdate']);
        Route::get('import/status-template', [\App\Http\Controllers\Api\Admin\ImportController::class, 'downloadStatusTemplate']);

        // Popups
        Route::get('popup', [\App\Http\Controllers\Api\Admin\PopupController::class, 'index']);
        Route::post('popup', [\App\Http\Controllers\Api\Admin\PopupController::class, 'store']);
        Route::get('popup/types', [\App\Http\Controllers\Api\Admin\PopupController::class, 'types']);
        Route::get('popup/frequencies', [\App\Http\Controllers\Api\Admin\PopupController::class, 'frequencies']);
        Route::get('popup/{id}', [\App\Http\Controllers\Api\Admin\PopupController::class, 'show']);
        Route::put('popup/{id}', [\App\Http\Controllers\Api\Admin\PopupController::class, 'update']);
        Route::post('popup/{id}', [\App\Http\Controllers\Api\Admin\PopupController::class, 'update']); // For FormData
        Route::put('popup/{id}/status', [\App\Http\Controllers\Api\Admin\PopupController::class, 'toggleStatus']);
        Route::delete('popup/{id}', [\App\Http\Controllers\Api\Admin\PopupController::class, 'destroy']);
        Route::delete('popup/deleteAll', [\App\Http\Controllers\Api\Admin\PopupController::class, 'bulkDelete']);

        // FAQs
        Route::get('faq', [FaqController::class, 'index']);
        Route::post('faq', [FaqController::class, 'store']);
        Route::get('faq/{id}', [FaqController::class, 'show']);
        Route::put('faq/{id}', [FaqController::class, 'update']);
        Route::delete('faq/{id}', [FaqController::class, 'destroy']);
        Route::post('faq/{id}/restore', [FaqController::class, 'restore']);
        Route::delete('faq/{id}/force', [FaqController::class, 'force']);

        // Stories
        Route::get('story', [\App\Http\Controllers\Api\Admin\StoryController::class, 'index']);
        Route::post('story', [\App\Http\Controllers\Api\Admin\StoryController::class, 'store']);
        Route::get('story/products', [\App\Http\Controllers\Api\Admin\StoryController::class, 'products']);
        Route::get('story/{id}', [\App\Http\Controllers\Api\Admin\StoryController::class, 'show']);
        Route::put('story/{id}', [\App\Http\Controllers\Api\Admin\StoryController::class, 'update']);
        Route::post('story/{id}', [\App\Http\Controllers\Api\Admin\StoryController::class, 'update']); // For FormData
        Route::put('story/{id}/status', [\App\Http\Controllers\Api\Admin\StoryController::class, 'toggleStatus']);
        Route::post('story/{id}/extend', [\App\Http\Controllers\Api\Admin\StoryController::class, 'extend']);
        Route::delete('story/{id}', [\App\Http\Controllers\Api\Admin\StoryController::class, 'destroy']);
        Route::delete('story/deleteAll', [\App\Http\Controllers\Api\Admin\StoryController::class, 'bulkDelete']);

        Route::put('menu/{id}', [MenuController::class, 'update']);
        Route::get('menu/{id}', [MenuController::class, 'show']);
        Route::delete('menu/{id}', [MenuController::class, 'destroy']);
        Route::get('menu', [MenuController::class, 'index']);
        Route::post('menu', [MenuController::class, 'store']);
        Route::get('menu-locations', [MenuController::class, 'locations']);
        Route::put('menu-locations', [MenuController::class, 'updateLocations']);

        Route::prefix('page')->group(function () {
            Route::get('/', [PageController::class, 'index']);
            Route::post('/', [PageController::class, 'store']);
            Route::get('{id}', [PageController::class, 'show']);
            Route::put('{id}', [PageController::class, 'update']);
            Route::delete('{id}', [PageController::class, 'destroy']);
            Route::post('{id}/duplicate', [PageController::class, 'duplicate']);
            Route::post('{id}/restore', [PageController::class, 'restore']);
            Route::delete('{id}/force', [PageController::class, 'force']);
        });
    });
});

// Backward compatibility for older admin builds that call /api/adminproduct/*.
Route::middleware(['auth:sanctum', 'admin_or_manager'])->group(function () {
    Route::get('adminproduct/csv/export', [\App\Http\Controllers\Api\Admin\ProductController::class, 'export']);
    Route::get('adminproduct/excel/export', [\App\Http\Controllers\Api\Admin\ProductController::class, 'exportExcel']);
});

Route::middleware('auth:sanctum')->group(function () {
    // ...
});

//Aramex api
//Route::get('shipping/aramex/track', [AramexTrackingController::class, 'track']);
Route::get('website/shipping/aramex/track', [AramexTrackingController::class, 'track']);
Route::get('website/track/resolve', [TrackResolverController::class, 'resolve']);

//middleware for order 
Route::middleware('auth:sanctum')->post('order', [OrderController::class, 'store']);
