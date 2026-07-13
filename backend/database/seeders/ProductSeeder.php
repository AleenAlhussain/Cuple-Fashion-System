<?php

namespace Database\Seeders;

use App\Models\AttributeValue;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $category = Category::updateOrCreate(
            ['slug' => 'flat'],
            [
                'name' => 'Flat Collection',
                'name_ar' => 'مجموعة فلات',
                'description' => 'Products that belong to the flat collection used for demonstration.',
                'is_active' => true,
            ]
        );

        $product = Product::updateOrCreate(
            ['sku' => 'seed-flat-001'],
            [
                'name' => 'Flat Lounge T-Shirt',
                'name_ar' => 'قميص مسطح',
                'slug' => 'flat-lounge-tshirt',
                'short_description' => 'A lightweight tee that is perfect for casual wear.',
                'description' => 'This starter product is seeded so the storefront product list always has at least one active item.',
                'price' => 110.00,
                'sale_price' => 95.00,
                'stock_quantity' => 100,
                'weight' => 0.45,
                'weight_unit' => 'kg',
                'is_active' => true,
                'is_featured' => true,
                'manage_stock' => true,
                'stock_status' => 'in_stock',
            ]
        );

        $product->categories()->syncWithoutDetaching([$category->id]);

        $variant = ProductVariant::updateOrCreate(
            ['sku' => 'seed-flat-001-variant'],
            [
                'product_id' => $product->id,
                'price' => 110.00,
                'sale_price' => 95.00,
                'stock_quantity' => 40,
                'is_active' => true,
            ]
        );

        $values = AttributeValue::whereHas('attribute', function ($query) {
            $query->whereIn('slug', ['color', 'size']);
        })
            ->limit(2)
            ->pluck('id');

        if ($values->isNotEmpty()) {
            $variant->attributeValues()->sync($values);
        }
    }
}
