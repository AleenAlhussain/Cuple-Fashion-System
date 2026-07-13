<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->foreignId('order_item_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['refund', 'exchange']);
            $table->enum('status', [
                'pending',
                'under_review',
                'approved',
                'processing',
                'rejected',
                'completed',
                'cancelled',
            ])->default('pending');
            $table->string('payment_type')->nullable();
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamps();

            $table->index(['order_item_id', 'type']);
            $table->index(['user_id', 'type']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_requests');
    }
};
