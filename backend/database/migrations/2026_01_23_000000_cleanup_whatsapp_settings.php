<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')
            ->whereIn('key', [
                'whatsapp.sleekflow.base_url',
                'whatsapp.sleekflow.token',
                'whatsapp.sleekflow.sender_id',
                'whatsapp.sleekflow.message_endpoint',
                'whatsapp.sleekflow.channel',
                'whatsapp.sleekflow.template_name',
                'whatsapp.sleekflow.template_language',
            ])
            ->delete();
    }

    public function down(): void
    {
        // no-op: removed legacy SleekFlow settings
    }
};
