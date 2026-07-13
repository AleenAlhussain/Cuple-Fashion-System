<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('attachments')) {
            return;
        }

        Schema::table('attachments', function (Blueprint $table) {
            if (!Schema::hasColumn('attachments', 'source_url')) {
                $table->longText('source_url')->nullable()->after('original_url');
            }

            if (!Schema::hasColumn('attachments', 'file_hash')) {
                $table->string('file_hash', 64)->nullable()->after('url_hash');
                $table->index('file_hash');
            }

            if (!Schema::hasColumn('attachments', 'size')) {
                $table->unsignedBigInteger('size')->nullable()->after('mime_type');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('attachments')) {
            return;
        }

        Schema::table('attachments', function (Blueprint $table) {
            if (Schema::hasColumn('attachments', 'file_hash')) {
                $table->dropIndex(['file_hash']);
                $table->dropColumn('file_hash');
            }

            if (Schema::hasColumn('attachments', 'source_url')) {
                $table->dropColumn('source_url');
            }

            if (Schema::hasColumn('attachments', 'size')) {
                $table->dropColumn('size');
            }
        });
    }
};

