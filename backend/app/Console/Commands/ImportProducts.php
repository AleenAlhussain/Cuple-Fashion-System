<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductImage;
use App\Models\Category;
use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Country;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportProducts extends Command
{
    protected $signature = 'import:products {file} {--country=*} {--fresh : Clear existing products before import}';
    protected $description = 'Import products from Excel/CSV file';

    protected $products = [];

    public function handle()
    {
        $filePath = $this->argument('file');

        if (!file_exists($filePath)) {
            $this->error("File not found: {$filePath}");
            return 1;
        }

        if ($this->option('fresh')) {
            $this->warn("Clearing existing products...");
            DB::statement('PRAGMA foreign_keys = OFF');
            ProductVariant::query()->delete();
            ProductImage::query()->delete();
            DB::table('category_product')->delete();
            DB::table('country_product')->delete();
            Product::query()->delete();
            DB::statement('PRAGMA foreign_keys = ON');
            $this->info("Cleared.");
        }

        $this->info("Reading file: {$filePath}");

        try {
            $spreadsheet = IOFactory::load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();
            $rawRows = $worksheet->toArray();
        } catch (\Exception $e) {
            $this->error("Failed to read file: " . $e->getMessage());
            return 1;
        }

        if (count($rawRows) < 2) {
            $this->error("File is empty or has no data rows.");
            return 1;
        }

        // Process headers - handle duplicate columns by using index-based approach
        $headerRow = $rawRows[0];
        $columnMap = [];
        foreach ($headerRow as $idx => $header) {
            $h = strtolower(trim(str_replace([' ', '-'], '_', $header ?? '')));
            if ($h && !isset($columnMap[$h])) {
                $columnMap[$h] = $idx;
            }
        }

        $this->info("Found columns: " . implode(', ', array_keys($columnMap)));
        $this->info("Total rows: " . (count($rawRows) - 1));

        $countryIds = $this->option('country');
        if (empty($countryIds)) {
            $countryIds = Country::pluck('id')->toArray();
        }
        $this->info("Assigning to countries: " . implode(', ', $countryIds));

        // Get or create attributes
        $sizeAttr = Attribute::firstOrCreate(['slug' => 'size'], ['name' => 'Size']);
        $colorAttr = Attribute::firstOrCreate(['slug' => 'color'], ['name' => 'Color']);

        $bar = $this->output->createProgressBar(count($rawRows) - 1);
        $bar->start();

        $productsCreated = 0;
        $variantsCreated = 0;
        $currentProduct = null;
        $currentArticle = null;

        DB::beginTransaction();
        try {
            // Skip header row
            for ($i = 1; $i < count($rawRows); $i++) {
                $row = $rawRows[$i];

                // Get values using column map
                $article = $this->getCol($row, $columnMap, 'article');
                $barcode = $this->getCol($row, $columnMap, 'barcode');
                $title = $this->getCol($row, $columnMap, 'title');
                $color = $this->getCol($row, $columnMap, 'color');
                $size = $this->getCol($row, $columnMap, 'size');
                $inventory = (int) $this->getCol($row, $columnMap, 'inventory');
                $price = (float) $this->getCol($row, $columnMap, 'price');
                $category = $this->getCol($row, $columnMap, 'category');
                $imageLinks = $this->getCol($row, $columnMap, 'image_link');
                $shortDesc = $this->getCol($row, $columnMap, 'short_description');
                $description = $this->getCol($row, $columnMap, 'description');

                // If row has a Title, it's a main product row
                if ($title && $article) {
                    $currentArticle = $article;

                    // Check if product already exists
                    if (!isset($this->products[$article])) {
                        $product = Product::where('sku', $article)->first();

                        if (!$product) {
                            $product = Product::create([
                                'name' => $title,
                                'sku' => $article,
                                'slug' => Str::slug($title) . '-' . Str::random(6),
                                'short_description' => $shortDesc,
                                'description' => $description,
                                'price' => $price ?: 0,
                                'stock_quantity' => 0,
                                'stock_status' => 'out_of_stock',
                                'is_active' => true,
                                'is_featured' => false,
                                'manage_stock' => true,
                            ]);

                            $product->countries()->sync($countryIds);

                            // Handle category
                            if ($category) {
                                $cat = Category::firstOrCreate(
                                    ['slug' => Str::slug($category)],
                                    ['name' => $category, 'is_active' => true]
                                );
                                $product->categories()->sync([$cat->id]);
                            }

                            // Handle multiple images (comma or newline separated)
                            if ($imageLinks) {
                                $images = preg_split('/[,\n]+/', $imageLinks);
                                foreach ($images as $idx => $imageUrl) {
                                    $imageUrl = trim($imageUrl);
                                    if ($imageUrl) {
                                        ProductImage::create([
                                            'product_id' => $product->id,
                                            'image' => $imageUrl,
                                            'is_primary' => $idx === 0,
                                            'sort_order' => $idx,
                                        ]);
                                    }
                                }
                            }

                            $productsCreated++;
                        }

                        $this->products[$article] = $product;
                    }

                    $currentProduct = $this->products[$article];
                }
                // Variant row - has article and size/color but no title
                elseif ($article && ($color || $size)) {
                    // Update current article if different
                    if ($article !== $currentArticle) {
                        $currentArticle = $article;
                        if (isset($this->products[$article])) {
                            $currentProduct = $this->products[$article];
                        } else {
                            $currentProduct = Product::where('sku', $article)->first();
                            if ($currentProduct) {
                                $this->products[$article] = $currentProduct;
                            }
                        }
                    }

                    if ($currentProduct) {
                        $variantSku = $barcode ?: ($article . '-' . ($size ?: 'X') . '-' . ($color ?: 'X'));

                        // Check if variant exists
                        $variant = ProductVariant::where('sku', $variantSku)->first();

                        if (!$variant) {
                            $variant = $currentProduct->variants()->create([
                                'sku' => $variantSku,
                                'price' => $price ?: $currentProduct->price,
                                'stock_quantity' => $inventory,
                                'is_active' => true,
                            ]);

                            $attributeValueIds = [];

                            if ($size) {
                                $sizeValue = AttributeValue::firstOrCreate(
                                    ['attribute_id' => $sizeAttr->id, 'value' => (string) $size],
                                    ['sort_order' => 0]
                                );
                                $attributeValueIds[] = $sizeValue->id;
                            }

                            if ($color) {
                                $colorValue = AttributeValue::firstOrCreate(
                                    ['attribute_id' => $colorAttr->id, 'value' => ucfirst(strtolower($color))],
                                    ['sort_order' => 0]
                                );
                                $attributeValueIds[] = $colorValue->id;
                            }

                            if (!empty($attributeValueIds)) {
                                $variant->attributeValues()->sync($attributeValueIds);
                            }

                            $variantsCreated++;

                            // Update product total stock
                            $currentProduct->increment('stock_quantity', $inventory);
                            if ($currentProduct->stock_quantity > 0) {
                                $currentProduct->update(['stock_status' => 'in_stock']);
                            }
                            // Set product price from first variant if not set
                            if (!$currentProduct->price && $price) {
                                $currentProduct->update(['price' => $price]);
                            }
                        }
                    }
                }

                $bar->advance();
            }

            DB::commit();
            $bar->finish();

            $this->newLine(2);
            $this->info("Import completed!");
            $this->info("  Products created: {$productsCreated}");
            $this->info("  Variants created: {$variantsCreated}");

            return 0;
        } catch (\Exception $e) {
            DB::rollBack();
            $bar->finish();
            $this->newLine();
            $this->error("Import failed: " . $e->getMessage());
            return 1;
        }
    }

    protected function getCol(array $row, array $columnMap, string $key): string
    {
        if (!isset($columnMap[$key])) {
            return '';
        }
        $idx = $columnMap[$key];
        return trim((string) ($row[$idx] ?? ''));
    }
}
