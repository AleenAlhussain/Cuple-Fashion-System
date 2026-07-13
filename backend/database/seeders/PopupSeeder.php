<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Popup;

class PopupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // New Collection Popup
        Popup::create([
            'title' => 'New Winter Collection',
            'title_ar' => 'مجموعة الشتاء الجديدة',
            'description' => 'Discover our exclusive winter collection with premium styles and comfort.',
            'description_ar' => 'اكتشف مجموعتنا الشتوية الحصرية بأساليب فاخرة وراحة.',
            'type' => 'collection',
            'button_text' => 'Shop Now',
            'button_text_ar' => 'تسوق الآن',
            'button_link' => '/shop',
            'display_frequency' => 'once_per_session',
            'delay_seconds' => 2,
            'show_on_exit_intent' => false,
            'show_on_pages' => ['home'],
            'is_active' => true,
            'priority' => 10,
        ]);

        // Special Offer Popup
        Popup::create([
            'title' => 'Flash Sale!',
            'title_ar' => 'تخفيضات سريعة!',
            'description' => 'Get amazing discounts on selected items. Limited time offer!',
            'description_ar' => 'احصل على خصومات مذهلة على منتجات مختارة. عرض لفترة محدودة!',
            'type' => 'offer',
            'button_text' => 'Shop Sale',
            'button_text_ar' => 'تسوق العروض',
            'button_link' => '/shop?sale=true',
            'discount_value' => 30,
            'discount_type' => 'percentage',
            'display_frequency' => 'once_per_day',
            'delay_seconds' => 3,
            'show_on_exit_intent' => false,
            'show_on_pages' => ['shop'],
            'is_active' => true,
            'priority' => 8,
        ]);

        // Coupon Popup
        Popup::create([
            'title' => 'Exclusive Discount!',
            'title_ar' => 'خصم حصري!',
            'description' => 'Use this code at checkout and save on your order.',
            'description_ar' => 'استخدم هذا الكود عند الدفع ووفر على طلبك.',
            'type' => 'coupon',
            'coupon_code' => 'WELCOME20',
            'discount_value' => 20,
            'discount_type' => 'percentage',
            'button_text' => 'Shop Now',
            'button_text_ar' => 'تسوق الآن',
            'button_link' => '/shop',
            'display_frequency' => 'once',
            'delay_seconds' => 5,
            'show_on_exit_intent' => true,
            'show_on_pages' => ['all'],
            'is_active' => true,
            'priority' => 5,
        ]);

        // Newsletter Popup
        Popup::create([
            'title' => 'Join Our Newsletter',
            'title_ar' => 'انضم لنشرتنا البريدية',
            'description' => 'Subscribe to get exclusive offers, new arrivals and insider-only discounts.',
            'description_ar' => 'اشترك للحصول على عروض حصرية، منتجات جديدة وخصومات خاصة.',
            'type' => 'newsletter',
            'coupon_code' => 'NEWSLETTER10',
            'discount_value' => 10,
            'discount_type' => 'percentage',
            'button_text' => 'Subscribe',
            'button_text_ar' => 'اشترك',
            'display_frequency' => 'once',
            'delay_seconds' => 10,
            'show_on_exit_intent' => false,
            'show_on_pages' => ['home', 'shop'],
            'is_active' => false, // Disabled by default
            'priority' => 3,
        ]);
    }
}
