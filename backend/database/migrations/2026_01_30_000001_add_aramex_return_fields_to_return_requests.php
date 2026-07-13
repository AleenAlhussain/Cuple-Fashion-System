<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            $table->string('return_awb_number')->nullable()->after('attachments');
            $table->text('return_label_url')->nullable()->after('return_awb_number');
            $table->string('return_pickup_reference')->nullable()->after('return_label_url');
            $table->boolean('return_is_international')->default(false)->after('return_pickup_reference');
            $table->json('return_params')->nullable()->after('return_is_international');
            $table->string('return_status')->default('not_created')->after('return_params');
            $table->text('return_error_message')->nullable()->after('return_status');
            $table->timestamp('return_created_at')->nullable()->after('return_error_message');

            $table->unique('return_awb_number');
        });
    }

    public function down(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            $table->dropUnique(['return_awb_number']);
            $table->dropColumn([
                'return_awb_number',
                'return_label_url',
                'return_pickup_reference',
                'return_is_international',
                'return_params',
                'return_status',
                'return_error_message',
                'return_created_at',
            ]);
        });
    }
};
