<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\GeoController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StripePaymentController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\PointController;
use App\Http\Controllers\Api\ProductVariantFilterController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\PopupController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\ReturnRequestController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Admin\MenuController;
use App\Http\Controllers\Api\GiftBoxController;
use App\Http\Controllers\Api\Website\WalletController;

// Public routes
// Stories (optimized for fast homepage load)
Route::get('stories', [StoryController::class, 'index']);        // Thumbnails only (fast)
Route::get('stories/{userId}', [StoryController::class, 'show']); // Full stories (on click)

Route::get('popups', [PopupController::class, 'active']);
Route::get('popups/{type}', [PopupController::class, 'byType']);
Route::post('popups/subscribe', [PopupController::class, 'subscribe']);
Route::post('subscribe', [PopupController::class, 'subscribe']);
Route::get('settings', [SettingsController::class, 'settings']);
Route::get('theme-options', [SettingsController::class, 'themeOptions']);
Route::get('countries', [SettingsController::class, 'countries']);
Route::get('banners', [SettingsController::class, 'banners']);
Route::get('homepage', [SettingsController::class, 'homepage']);
Route::get('shop', [SettingsController::class, 'shopPage']);
Route::get('pages', [PageController::class, 'index']);
Route::get('page/{slug}', [PageController::class, 'show']);
Route::get('menu', [MenuController::class, 'index']);
Route::get('gift-box/active', [GiftBoxController::class, 'active']);
Route::get('shop-layout', [\App\Http\Controllers\Api\Website\ShopLayoutController::class, 'index']);

// Products
Route::get('shop/products', [ProductController::class, 'index']);
Route::get('shop/facets', [ProductController::class, 'facets']);
Route::get('products', [ProductController::class, 'index']);
Route::get('products/facets', [ProductController::class, 'facets']);
Route::get('products/active-offers', [ProductController::class, 'activeOffers']);
Route::get('products/search', [ProductController::class, 'quickSearch']);
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

// FAQs
Route::get('faqs', [FaqController::class, 'index']);
Route::get('faqs/{id}', [FaqController::class, 'show']);

// Auth
Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);
Route::post('login/whatsapp/send-otp', [AuthController::class, 'sendWhatsAppLoginOtp']);
Route::post('login/whatsapp/verify-otp', [AuthController::class, 'verifyWhatsAppLoginOtp']);
Route::post('forgot-password', [AuthController::class, 'sendResetLinkEmail']);
Route::post('reset-password', [AuthController::class, 'resetPasswordWithToken']);
Route::post('check-email', [AuthController::class, 'checkEmail']);

// Order Statuses (public) + Stripe
Route::get('order-statuses', [OrderController::class, 'statuses']);
Route::post('stripe/payment-intent', [StripePaymentController::class, 'createPaymentIntent']);

// BNPL Payment Gateways (Tabby, Tamara)
use App\Http\Controllers\Api\Website\PaymentController;

Route::get('payment/gateways', [PaymentController::class, 'getAvailableGateways']);
Route::post('payment/initiate', [PaymentController::class, 'initiatePayment']);
Route::get('payment/callback/{gateway}', [PaymentController::class, 'handleCallback']);
Route::post('payment/webhook/{gateway}', [PaymentController::class, 'handleWebhook']);
Route::get('payment/status/{orderId}', [PaymentController::class, 'getPaymentStatus']);

// Cart
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
Route::post('geo/reverse', [GeoController::class, 'reverse']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
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

    // Refund/Exchange Requests
    Route::get('refund', [ReturnRequestController::class, 'refundIndex']);
    Route::post('refund', [ReturnRequestController::class, 'refundStore']);
    Route::get('exchange', [ReturnRequestController::class, 'exchangeIndex']);
    Route::post('exchange', [ReturnRequestController::class, 'exchangeStore']);

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::put('notifications/mark-as-read/{id?}', [NotificationController::class, 'markAsRead']);

    // Wallet
    Route::get('wallet', [WalletController::class, 'index']);
    Route::get('wallet/points-value', [WalletController::class, 'pointsValue']);

    // Points
    Route::get('points', [PointController::class, 'index']);
    Route::get('wallet/points', [PointController::class, 'index']);
    Route::post('points/calculate', [PointController::class, 'calculate']);
    Route::post('points/redeem', [PointController::class, 'redeem']);

    // Gift Box
    Route::post('gift-box/select', [GiftBoxController::class, 'select']);
    Route::get('me/gift-box', [GiftBoxController::class, 'me']);
});

// Discount/Offer Engine routes
use App\Http\Controllers\Api\Website\DiscountController;

Route::post('cart/calculate-discounts', [DiscountController::class, 'calculateDiscounts']);
Route::post('cart/preview-discounts', [DiscountController::class, 'previewDiscounts']);
Route::get('products/{variantId}/offers', [DiscountController::class, 'getVariantOffers']);
Route::get('sku/{variantId}/discounts', [DiscountController::class, 'getSkuDiscountBreakdown']);
Route::get('product/{productId}/discount-bars', [DiscountController::class, 'getProductDiscountBars']);
Route::get('cart/debug-promotions', [DiscountController::class, 'debugPromotions']);
Route::get('cart/debug-calculate', [DiscountController::class, 'debugCalculate']);
Route::get('cart/debug-rules', [DiscountController::class, 'debugRules']);
Route::post('cart/debug-rules/activate/{id}', [DiscountController::class, 'activateRule']);
Route::get('cart/debug-bogo', [DiscountController::class, 'debugBogo']);
