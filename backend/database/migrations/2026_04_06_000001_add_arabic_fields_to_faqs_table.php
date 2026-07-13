<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $missingTitleAr = !Schema::hasColumn('faqs', 'title_ar');
        $missingDescriptionAr = !Schema::hasColumn('faqs', 'description_ar');

        if (! $missingTitleAr && ! $missingDescriptionAr) {
            return;
        }

        Schema::table('faqs', function (Blueprint $table) use ($missingTitleAr, $missingDescriptionAr) {
            if ($missingTitleAr) {
                $table->string('title_ar')->nullable();
            }

            if ($missingDescriptionAr) {
                $table->text('description_ar')->nullable();
            }
        });
    }

    public function down(): void
    {
        $hasTitleAr = Schema::hasColumn('faqs', 'title_ar');
        $hasDescriptionAr = Schema::hasColumn('faqs', 'description_ar');

        if (! $hasTitleAr && ! $hasDescriptionAr) {
            return;
        }

        Schema::table('faqs', function (Blueprint $table) use ($hasTitleAr, $hasDescriptionAr) {
            $columns = [];

            if ($hasTitleAr) {
                $columns[] = 'title_ar';
            }

            if ($hasDescriptionAr) {
                $columns[] = 'description_ar';
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
