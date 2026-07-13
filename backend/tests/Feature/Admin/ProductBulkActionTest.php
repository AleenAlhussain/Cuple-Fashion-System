<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductBulkActionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);
    }

    /** @test */
    public function it_adds_categories_in_bulk_without_removing_existing_categories_by_default(): void
    {
        $product = $this->createProduct();
        $existingCategory = $this->createCategory('Existing Category');
        $newCategory = $this->createCategory('New Category');

        $product->categories()->attach($existingCategory->id);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/product/bulk-action', [
            'action' => 'set_category',
            'ids' => [$product->id],
            'data' => [
                'category_ids' => [$newCategory->id],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $product->refresh();

        $this->assertEqualsCanonicalizing(
            [$existingCategory->id, $newCategory->id],
            $product->categories()->pluck('categories.id')->all()
        );
    }

    /** @test */
    public function it_can_still_replace_categories_in_bulk_when_set_mode_is_requested(): void
    {
        $product = $this->createProduct();
        $existingCategory = $this->createCategory('Existing Category');
        $replacementCategory = $this->createCategory('Replacement Category');

        $product->categories()->attach($existingCategory->id);

        $response = $this->actingAs($this->admin)->postJson('/api/admin/product/bulk-action', [
            'action' => 'set_category',
            'ids' => [$product->id],
            'data' => [
                'category_mode' => 'set',
                'category_ids' => [$replacementCategory->id],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $product->refresh();

        $this->assertSame(
            [$replacementCategory->id],
            $product->categories()->pluck('categories.id')->all()
        );
    }

    private function createProduct(): Product
    {
        $suffix = Str::lower(Str::random(10));

        return Product::create([
            'name' => 'Bulk Product ' . $suffix,
            'slug' => 'bulk-product-' . $suffix,
            'sku' => 'BULK-' . Str::upper(Str::random(8)),
            'price' => 99.99,
        ]);
    }

    private function createCategory(string $name): Category
    {
        $suffix = Str::lower(Str::random(8));

        return Category::create([
            'name' => $name,
            'slug' => Str::slug($name) . '-' . $suffix,
        ]);
    }
}
