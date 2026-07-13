<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\AttributeValue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AttributeSeeder extends Seeder
{
    public function run(): void
    {
        // Size attribute
        $size = Attribute::updateOrCreate(
            ['slug' => 'size'],
            ['name' => 'Size', 'name_ar' => 'المقاس']
        );

        $sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        foreach ($sizes as $index => $sizeValue) {
            AttributeValue::updateOrCreate(
                ['attribute_id' => $size->id, 'value' => $sizeValue],
                ['sort_order' => $index]
            );
        }

        // Color attribute
        $color = Attribute::updateOrCreate(
            ['slug' => 'color'],
            ['name' => 'Color', 'name_ar' => 'اللون']
        );

        $colors = [
            ['value' => 'Black', 'value_ar' => 'أسود', 'color_code' => '#000000'],
            ['value' => 'White', 'value_ar' => 'أبيض', 'color_code' => '#FFFFFF'],
            ['value' => 'Red', 'value_ar' => 'أحمر', 'color_code' => '#FF0000'],
            ['value' => 'Blue', 'value_ar' => 'أزرق', 'color_code' => '#0000FF'],
            ['value' => 'Green', 'value_ar' => 'أخضر', 'color_code' => '#00FF00'],
            ['value' => 'Yellow', 'value_ar' => 'أصفر', 'color_code' => '#FFFF00'],
            ['value' => 'Pink', 'value_ar' => 'وردي', 'color_code' => '#FFC0CB'],
            ['value' => 'Gray', 'value_ar' => 'رمادي', 'color_code' => '#808080'],
            ['value' => 'Navy', 'value_ar' => 'كحلي', 'color_code' => '#000080'],
            ['value' => 'Beige', 'value_ar' => 'بيج', 'color_code' => '#F5F5DC'],
            ['value' => 'Brown', 'value_ar' => 'بني', 'color_code' => '#8B4513'],
        ];

        foreach ($colors as $index => $colorData) {
            AttributeValue::updateOrCreate(
                ['attribute_id' => $color->id, 'value' => $colorData['value']],
                [
                    'value_ar' => $colorData['value_ar'],
                    'color_code' => $colorData['color_code'],
                    'sort_order' => $index,
                ]
            );
        }
    }
}
