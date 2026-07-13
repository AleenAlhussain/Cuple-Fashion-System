<?php

namespace Database\Seeders;

use App\Models\PaymentGateway;
use Illuminate\Database\Seeder;

class PaymentGatewaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $gateways = [
            [
                'name' => 'tabby',
                'display_name' => 'Tabby',
                'description' => 'Pay in 4 interest-free payments with Tabby. Split your purchase into 4 easy payments.',
                'logo' => '/assets/images/payment/tabby-logo.svg',
                'is_active' => false,
                'is_sandbox' => true,
                'public_key' => null,
                'secret_key' => null,
                'merchant_code' => null,
                'min_amount' => 50.00,
                'max_amount' => 5000.00,
                'installments_count' => 4,
                'supported_countries' => ['AE', 'SA', 'KW', 'BH', 'QA'],
                'settings' => [
                    'checkout_flow' => 'redirect', // redirect or popup
                    'auto_capture' => true,
                ],
            ],
            [
                'name' => 'tamara',
                'display_name' => 'Tamara',
                'description' => 'Split in 3 interest-free payments with Tamara. Shop now and pay later.',
                'logo' => '/assets/images/payment/tamara-logo.svg',
                'is_active' => false,
                'is_sandbox' => true,
                'public_key' => null,
                'secret_key' => null,
                'merchant_code' => null,
                'min_amount' => 50.00,
                'max_amount' => 5000.00,
                'installments_count' => 3,
                'supported_countries' => ['AE', 'SA', 'KW', 'BH', 'QA'],
                'settings' => [
                    'checkout_flow' => 'redirect',
                    'auto_capture' => true,
                    'payment_types' => ['PAY_BY_INSTALMENTS', 'PAY_BY_LATER'],
                ],
            ],
        ];

        foreach ($gateways as $gateway) {
            PaymentGateway::updateOrCreate(
                ['name' => $gateway['name']],
                $gateway
            );
        }

        $this->command->info('Payment gateways seeded successfully!');
    }
}
