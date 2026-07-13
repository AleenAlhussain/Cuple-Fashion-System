<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_request_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_request_id')->constrained('return_requests')->onDelete('cascade');
            $table->string('file_path');
            $table->string('file_url');
            $table->string('mime_type', 100)->nullable();
            $table->timestamp('uploaded_at')->useCurrent();
            $table->timestamps();

            $table->index(['return_request_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_request_attachments');
    }
};
