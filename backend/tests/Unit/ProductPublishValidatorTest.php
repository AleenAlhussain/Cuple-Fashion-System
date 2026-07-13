<?php

namespace Tests\Unit;

use App\Models\AttributeValue;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Services\ProductPublishValidator;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Tests\TestCase;

class ProductPublishValidatorTest extends TestCase
{
    public function test_it_returns_all_required_errors_for_incomplete_simple_product(): void
    {
        $product = new Product([
            'type' => 'simple',
            'price' => 0,
            'stock_quantity' => null,
            'stock_status' => null,
            'sku' => '',
        ]);

        $product->setRelation('images', new EloquentCollection());
        $product->setRelation('categories', new EloquentCollection());
        $product->setRelation('variants', new EloquentCollection());

        $result = app(ProductPublishValidator::class)->validate($product);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('image', $result['errors']);
        $this->assertArrayHasKey('price', $result['errors']);
        $this->assertArrayHasKey('stock', $result['errors']);
        $this->assertArrayHasKey('category', $result['errors']);
        $this->assertArrayHasKey('attributes', $result['errors']);
        $this->assertArrayHasKey('sku', $result['errors']);
    }

    public function test_it_accepts_a_complete_variant_product(): void
    {
        $product = new Product([
            'type' => 'variable',
            'price' => 0,
            'stock_quantity' => 0,
            'stock_status' => 'in_stock',
            'sku' => 'PARENT-001',
            'has_variants' => true,
        ]);

        $image = new ProductImage(['image' => 'products/p-1.jpg', 'is_primary' => true]);
        $category = new Category(['id' => 1, 'name' => 'Shoes']);

        $variantOne = new ProductVariant([
            'sku' => 'SKU-RED-37',
            'price' => 120,
            'stock_quantity' => 2,
            'is_active' => true,
        ]);
        $variantOne->setRelation('attributeValues', new EloquentCollection([
            new AttributeValue(['id' => 11, 'attribute_id' => 1, 'value' => 'Red']),
        ]));

        $variantTwo = new ProductVariant([
            'sku' => 'SKU-RED-38',
            'price' => 130,
            'stock_quantity' => 3,
            'is_active' => true,
        ]);
        $variantTwo->setRelation('attributeValues', new EloquentCollection([
            new AttributeValue(['id' => 12, 'attribute_id' => 2, 'value' => '38']),
        ]));

        $product->setRelation('images', new EloquentCollection([$image]));
        $product->setRelation('categories', new EloquentCollection([$category]));
        $product->setRelation('variants', new EloquentCollection([$variantOne, $variantTwo]));

        $result = app(ProductPublishValidator::class)->validate($product);

        $this->assertTrue($result['valid']);
        $this->assertSame([], $result['errors']);
        $this->assertSame([], $result['reasons']);
    }

    public function test_it_returns_bulk_reason_for_missing_variant_sku(): void
    {
        $product = new Product([
            'type' => 'variable',
            'price' => 0,
            'stock_quantity' => 0,
            'stock_status' => 'in_stock',
            'has_variants' => true,
        ]);

        $image = new ProductImage(['image' => 'products/p-2.jpg', 'is_primary' => true]);
        $category = new Category(['id' => 2, 'name' => 'Bags']);
        $variant = new ProductVariant([
            'sku' => '',
            'price' => 99,
            'stock_quantity' => 1,
            'is_active' => true,
        ]);
        $variant->setRelation('attributeValues', new EloquentCollection([
            new AttributeValue(['id' => 21, 'attribute_id' => 3, 'value' => 'Brown']),
        ]));

        $product->setRelation('images', new EloquentCollection([$image]));
        $product->setRelation('categories', new EloquentCollection([$category]));
        $product->setRelation('variants', new EloquentCollection([$variant]));

        $result = app(ProductPublishValidator::class)->validate($product);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('sku', $result['errors']);
        $this->assertContains('Missing SKU', $result['reasons']);
    }
}
