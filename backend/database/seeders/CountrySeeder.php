<?php

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    public function run(): void
    {
        $countries = [
            ['name' => 'United Arab Emirates', 'code' => 'UAE', 'currency' => 'AED', 'currency_symbol' => 'د.إ', 'phone_code' => '+971', 'is_active' => true],
            ['name' => 'Saudi Arabia', 'code' => 'KSA', 'currency' => 'SAR', 'currency_symbol' => 'ر.س', 'phone_code' => '+966', 'is_active' => true],
            ['name' => 'Kuwait', 'code' => 'KW', 'currency' => 'KWD', 'currency_symbol' => 'د.ك', 'phone_code' => '+965', 'is_active' => true],
            ['name' => 'Qatar', 'code' => 'QA', 'currency' => 'QAR', 'currency_symbol' => 'ر.ق', 'phone_code' => '+974', 'is_active' => true],
            ['name' => 'Bahrain', 'code' => 'BH', 'currency' => 'BHD', 'currency_symbol' => 'د.ب', 'phone_code' => '+973', 'is_active' => true],
            ['name' => 'Oman', 'code' => 'OM', 'currency' => 'OMR', 'currency_symbol' => 'ر.ع', 'phone_code' => '+968', 'is_active' => true],
            ['name' => 'Egypt', 'code' => 'EG', 'currency' => 'EGP', 'currency_symbol' => 'ج.م', 'phone_code' => '+20', 'is_active' => true],
            ['name' => 'Jordan', 'code' => 'JO', 'currency' => 'JOD', 'currency_symbol' => 'د.أ', 'phone_code' => '+962', 'is_active' => true],
            ['name' => 'Lebanon', 'code' => 'LB', 'currency' => 'LBP', 'currency_symbol' => 'ل.ل', 'phone_code' => '+961', 'is_active' => true],
            ['name' => 'Iraq', 'code' => 'IQ', 'currency' => 'IQD', 'currency_symbol' => 'د.ع', 'phone_code' => '+964', 'is_active' => true],
            ['name' => 'Syria', 'code' => 'SY', 'currency' => 'SYP', 'currency_symbol' => 'ل.س', 'phone_code' => '+963', 'is_active' => true],
            ['name' => 'Palestine', 'code' => 'PS', 'currency' => 'ILS', 'currency_symbol' => '₪', 'phone_code' => '+970', 'is_active' => true],
            ['name' => 'Yemen', 'code' => 'YE', 'currency' => 'YER', 'currency_symbol' => 'ر.ي', 'phone_code' => '+967', 'is_active' => true],
            ['name' => 'Morocco', 'code' => 'MA', 'currency' => 'MAD', 'currency_symbol' => 'د.م', 'phone_code' => '+212', 'is_active' => true],
            ['name' => 'Tunisia', 'code' => 'TN', 'currency' => 'TND', 'currency_symbol' => 'د.ت', 'phone_code' => '+216', 'is_active' => true],
            ['name' => 'Algeria', 'code' => 'DZ', 'currency' => 'DZD', 'currency_symbol' => 'د.ج', 'phone_code' => '+213', 'is_active' => true],
            ['name' => 'Libya', 'code' => 'LY', 'currency' => 'LYD', 'currency_symbol' => 'د.ل', 'phone_code' => '+218', 'is_active' => true],
            ['name' => 'Sudan', 'code' => 'SD', 'currency' => 'SDG', 'currency_symbol' => 'ج.س', 'phone_code' => '+249', 'is_active' => true],
            ['name' => 'United States', 'code' => 'US', 'currency' => 'USD', 'currency_symbol' => '$', 'phone_code' => '+1', 'is_active' => true],
            ['name' => 'United Kingdom', 'code' => 'GB', 'currency' => 'GBP', 'currency_symbol' => '£', 'phone_code' => '+44', 'is_active' => true],
            ['name' => 'Canada', 'code' => 'CA', 'currency' => 'CAD', 'currency_symbol' => 'C$', 'phone_code' => '+1', 'is_active' => true],
            ['name' => 'Australia', 'code' => 'AU', 'currency' => 'AUD', 'currency_symbol' => 'A$', 'phone_code' => '+61', 'is_active' => true],
            ['name' => 'Germany', 'code' => 'DE', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+49', 'is_active' => true],
            ['name' => 'France', 'code' => 'FR', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+33', 'is_active' => true],
            ['name' => 'Italy', 'code' => 'IT', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+39', 'is_active' => true],
            ['name' => 'Spain', 'code' => 'ES', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+34', 'is_active' => true],
            ['name' => 'Netherlands', 'code' => 'NL', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+31', 'is_active' => true],
            ['name' => 'Belgium', 'code' => 'BE', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+32', 'is_active' => true],
            ['name' => 'Switzerland', 'code' => 'CH', 'currency' => 'CHF', 'currency_symbol' => 'Fr', 'phone_code' => '+41', 'is_active' => true],
            ['name' => 'Austria', 'code' => 'AT', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+43', 'is_active' => true],
            ['name' => 'Sweden', 'code' => 'SE', 'currency' => 'SEK', 'currency_symbol' => 'kr', 'phone_code' => '+46', 'is_active' => true],
            ['name' => 'Norway', 'code' => 'NO', 'currency' => 'NOK', 'currency_symbol' => 'kr', 'phone_code' => '+47', 'is_active' => true],
            ['name' => 'Denmark', 'code' => 'DK', 'currency' => 'DKK', 'currency_symbol' => 'kr', 'phone_code' => '+45', 'is_active' => true],
            ['name' => 'Finland', 'code' => 'FI', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+358', 'is_active' => true],
            ['name' => 'Ireland', 'code' => 'IE', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+353', 'is_active' => true],
            ['name' => 'Portugal', 'code' => 'PT', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+351', 'is_active' => true],
            ['name' => 'Greece', 'code' => 'GR', 'currency' => 'EUR', 'currency_symbol' => '€', 'phone_code' => '+30', 'is_active' => true],
            ['name' => 'Poland', 'code' => 'PL', 'currency' => 'PLN', 'currency_symbol' => 'zł', 'phone_code' => '+48', 'is_active' => true],
            ['name' => 'Czech Republic', 'code' => 'CZ', 'currency' => 'CZK', 'currency_symbol' => 'Kč', 'phone_code' => '+420', 'is_active' => true],
            ['name' => 'Hungary', 'code' => 'HU', 'currency' => 'HUF', 'currency_symbol' => 'Ft', 'phone_code' => '+36', 'is_active' => true],
            ['name' => 'Romania', 'code' => 'RO', 'currency' => 'RON', 'currency_symbol' => 'lei', 'phone_code' => '+40', 'is_active' => true],
            ['name' => 'Russia', 'code' => 'RU', 'currency' => 'RUB', 'currency_symbol' => '₽', 'phone_code' => '+7', 'is_active' => true],
            ['name' => 'Ukraine', 'code' => 'UA', 'currency' => 'UAH', 'currency_symbol' => '₴', 'phone_code' => '+380', 'is_active' => true],
            ['name' => 'Turkey', 'code' => 'TR', 'currency' => 'TRY', 'currency_symbol' => '₺', 'phone_code' => '+90', 'is_active' => true],
            ['name' => 'India', 'code' => 'IN', 'currency' => 'INR', 'currency_symbol' => '₹', 'phone_code' => '+91', 'is_active' => true],
            ['name' => 'Pakistan', 'code' => 'PK', 'currency' => 'PKR', 'currency_symbol' => '₨', 'phone_code' => '+92', 'is_active' => true],
            ['name' => 'Bangladesh', 'code' => 'BD', 'currency' => 'BDT', 'currency_symbol' => '৳', 'phone_code' => '+880', 'is_active' => true],
            ['name' => 'Sri Lanka', 'code' => 'LK', 'currency' => 'LKR', 'currency_symbol' => 'Rs', 'phone_code' => '+94', 'is_active' => true],
            ['name' => 'Nepal', 'code' => 'NP', 'currency' => 'NPR', 'currency_symbol' => '₨', 'phone_code' => '+977', 'is_active' => true],
            ['name' => 'China', 'code' => 'CN', 'currency' => 'CNY', 'currency_symbol' => '¥', 'phone_code' => '+86', 'is_active' => true],
            ['name' => 'Japan', 'code' => 'JP', 'currency' => 'JPY', 'currency_symbol' => '¥', 'phone_code' => '+81', 'is_active' => true],
            ['name' => 'South Korea', 'code' => 'KR', 'currency' => 'KRW', 'currency_symbol' => '₩', 'phone_code' => '+82', 'is_active' => true],
            ['name' => 'Singapore', 'code' => 'SG', 'currency' => 'SGD', 'currency_symbol' => 'S$', 'phone_code' => '+65', 'is_active' => true],
            ['name' => 'Malaysia', 'code' => 'MY', 'currency' => 'MYR', 'currency_symbol' => 'RM', 'phone_code' => '+60', 'is_active' => true],
            ['name' => 'Indonesia', 'code' => 'ID', 'currency' => 'IDR', 'currency_symbol' => 'Rp', 'phone_code' => '+62', 'is_active' => true],
            ['name' => 'Thailand', 'code' => 'TH', 'currency' => 'THB', 'currency_symbol' => '฿', 'phone_code' => '+66', 'is_active' => true],
            ['name' => 'Vietnam', 'code' => 'VN', 'currency' => 'VND', 'currency_symbol' => '₫', 'phone_code' => '+84', 'is_active' => true],
            ['name' => 'Philippines', 'code' => 'PH', 'currency' => 'PHP', 'currency_symbol' => '₱', 'phone_code' => '+63', 'is_active' => true],
            ['name' => 'New Zealand', 'code' => 'NZ', 'currency' => 'NZD', 'currency_symbol' => 'NZ$', 'phone_code' => '+64', 'is_active' => true],
            ['name' => 'South Africa', 'code' => 'ZA', 'currency' => 'ZAR', 'currency_symbol' => 'R', 'phone_code' => '+27', 'is_active' => true],
            ['name' => 'Nigeria', 'code' => 'NG', 'currency' => 'NGN', 'currency_symbol' => '₦', 'phone_code' => '+234', 'is_active' => true],
            ['name' => 'Kenya', 'code' => 'KE', 'currency' => 'KES', 'currency_symbol' => 'KSh', 'phone_code' => '+254', 'is_active' => true],
            ['name' => 'Ghana', 'code' => 'GH', 'currency' => 'GHS', 'currency_symbol' => '₵', 'phone_code' => '+233', 'is_active' => true],
            ['name' => 'Brazil', 'code' => 'BR', 'currency' => 'BRL', 'currency_symbol' => 'R$', 'phone_code' => '+55', 'is_active' => true],
            ['name' => 'Mexico', 'code' => 'MX', 'currency' => 'MXN', 'currency_symbol' => '$', 'phone_code' => '+52', 'is_active' => true],
            ['name' => 'Argentina', 'code' => 'AR', 'currency' => 'ARS', 'currency_symbol' => '$', 'phone_code' => '+54', 'is_active' => true],
            ['name' => 'Colombia', 'code' => 'CO', 'currency' => 'COP', 'currency_symbol' => '$', 'phone_code' => '+57', 'is_active' => true],
            ['name' => 'Chile', 'code' => 'CL', 'currency' => 'CLP', 'currency_symbol' => '$', 'phone_code' => '+56', 'is_active' => true],
            ['name' => 'Peru', 'code' => 'PE', 'currency' => 'PEN', 'currency_symbol' => 'S/', 'phone_code' => '+51', 'is_active' => true],
            ['name' => 'Iran', 'code' => 'IR', 'currency' => 'IRR', 'currency_symbol' => '﷼', 'phone_code' => '+98', 'is_active' => true],
            ['name' => 'Afghanistan', 'code' => 'AF', 'currency' => 'AFN', 'currency_symbol' => '؋', 'phone_code' => '+93', 'is_active' => true],
        ];

        foreach ($countries as $country) {
            Country::updateOrCreate(
                ['code' => $country['code']],
                $country
            );
        }
    }
}
