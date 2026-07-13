<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payment_gateways', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // tabby, tamara
            $table->string('display_name');
            $table->text('description')->nullable();
            $table->string('logo')->nullable();
            $table->boolean('is_active')->default(false);
            $table->boolean('is_sandbox')->default(true);
            $table->string('public_key')->nullable();
            $table->text('secret_key')->nullable(); // encrypted
            $table->string('merchant_code')->nullable();
            $table->decimal('min_amount', 10, 2)->default(1);
            $table->decimal('max_amount', 10, 2)->default(5000);
            $table->integer('installments_count')->default(4);
            $table->json('supported_countries')->nullable(); // ['AE', 'SA']
            $table->json('settings')->nullable(); // additional gateway-specific settings
            $table->timestamps();
        });

        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->string('gateway'); // tabby, tamara
            $table->string('transaction_id')->nullable(); // gateway's transaction ID
            $table->string('payment_id')->nullable(); // gateway's payment/checkout ID
            $table->string('status'); // pending, authorized, captured, failed, refunded
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('AED');
            $table->json('gateway_response')->nullable(); // full response from gateway
            $table->json('webhook_payload')->nullable(); // webhook data
            $table->timestamp('authorized_at')->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'gateway']);
            $table->index(['payment_id', 'gateway']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('payment_gateways');
    }
};
