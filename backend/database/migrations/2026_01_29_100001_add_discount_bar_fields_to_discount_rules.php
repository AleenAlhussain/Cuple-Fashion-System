<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            // Discount Bar Settings
            $table->boolean('show_discount_bar')->default(false)->after('is_active');
            $table->string('bar_background_color', 7)->default('#ef0101')->after('show_discount_bar');
            $table->string('bar_text_color', 7)->default('#ffffff')->after('bar_background_color');

            // Bar Title
            $table->string('bar_title')->nullable()->after('bar_text_color');
            $table->string('bar_title_ar')->nullable()->after('bar_title');

            // Bar Content (supports HTML and shortcodes)
            $table->text('bar_content')->nullable()->after('bar_title_ar');
            $table->text('bar_content_ar')->nullable()->after('bar_content');

            // Bar Position
            $table->string('bar_position', 50)->default('below_price')->after('bar_content_ar');

            // Bar Style
            $table->string('bar_style', 20)->default('badge')->after('bar_position');
        });
    }

    public function down(): void
    {
        Schema::table('discount_rules', function (Blueprint $table) {
            $table->dropColumn([
                'show_discount_bar',
                'bar_background_color',
                'bar_text_color',
                'bar_title',
                'bar_title_ar',
                'bar_content',
                'bar_content_ar',
                'bar_position',
                'bar_style',
            ]);
        });
    }
};
