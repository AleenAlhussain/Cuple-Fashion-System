# Product Variants API Integration

## Overview

This document describes the integration of the new `/website/product-variants` API response format into the product detail pages.

## Changes Made

### 1. API Route Enhancement (`src/app/api/product/[productId]/route.js`)

- Updated to support both numeric product IDs and article slugs
- Automatically detects if the parameter is numeric (product_id) or a string (article)
- Supports `?article=` query parameter for explicit article-based queries

**Example Usage:**

```javascript
// By numeric product ID
GET /api/product/4

// By article slug
GET /api/product/3338-012

// With query parameter
GET /api/product/123?article=3338-012
```

### 2. Data Transformer (`src/utils/transformers/productVariantsTransformer.js`)

Created a comprehensive transformer that converts the paginated product-variants API response into a format compatible with existing product detail components.

**Input Format (from API):**

```json
{
  "current_page": 1,
  "data": [
    {
      "id": 24,
      "size": "39",
      "article": "3338-012",
      "barcode": "S243338012SLH80039",
      "main_image": "product_variants/xxx.jpg",
      "warehouse_product_variants": [
        {
          "quantity": 0,
          "color": "Black",
          "color_code": "#000000",
          "price": "49.00",
          ...
        }
      ]
    }
  ]
}
```

**Output Format (transformed):**

```javascript
{
  id: 4,
  name: "3338-012",
  type: "classified",
  variations: [...],
  attributes: [
    {
      id: 1,
      name: "Color",
      style: "color",
      attribute_values: [...]
    },
    {
      id: 2,
      name: "Size",
      style: "radio",
      attribute_values: [...]
    }
  ],
  _isTransformed: true,
  ...
}
```

### 3. Product Detail Content (`src/components/productDetails/index.jsx`)

- Added automatic detection of new API response format using `isVariantsAPIResponse()`
- Transforms data using `transformProductVariantsResponse()` before setting state
- Maintains backward compatibility with existing product API format

### 4. Variant Selector Component (`src/components/productDetails/common/VariantSelector.jsx`)

New component specifically designed for the transformed product-variants data:

- Displays color swatches with hex color codes
- Shows size options as radio buttons
- Handles variant availability checking
- Automatically selects first available variant on load
- Updates product images when variant changes

**Features:**

- Color selection with visual color swatches
- Size selection with availability indicators
- Disabled state for out-of-stock combinations
- Active state highlighting for selected options
- Automatic variant matching based on color + size combination

### 5. Product Content Component (`src/components/productDetails/common/ProductContent.jsx`)

- Updated to use `VariantSelector` for transformed products
- Falls back to `ProductAttribute` for legacy products
- Improved data normalization for both formats

### 6. Product Information Component (`src/components/productDetails/common/ProductInformation.jsx`)

- Simplified data access logic
- Works with both old and transformed product structures
- Displays SKU, stock status, and quantity correctly

### 7. Thumbnail Image Component (`src/components/productDetails/productThumbnail/ThumbnailImage.jsx`)

- Enhanced to handle cases where only product_thumbnail is available
- Properly displays variant-specific images
- Falls back gracefully when no galleries exist

## API Response Structure

### Paginated Response

```json
{
  "current_page": 1,
  "data": [/* array of variants */],
  "first_page_url": "...",
  "from": 1,
  "last_page": 1,
  "last_page_url": "...",
  "links": [...],
  "next_page_url": null,
  "path": "...",
  "per_page": 15,
  "prev_page_url": null,
  "to": 4,
  "total": 4
}
```

### Variant Structure

Each variant in the `data` array contains:

- `id`: Variant ID
- `size`: Size value (e.g., "39", "40")
- `article`: Article/product code (e.g., "3338-012")
- `barcode`: Unique barcode (SKU)
- `main_image`: Image path relative to storage
- `is_active`: Variant status
- `product_id`: Parent product ID
- `warehouse_product_variants`: Array of warehouse-specific data
  - `quantity`: Available quantity
  - `color`: Color name
  - `color_code`: Hex color code (e.g., "#000000")
  - `price`: Price value
  - `warehouse`: Warehouse information

## How It Works

### Flow Diagram

```
User visits product page (e.g., /product/3338-012)
    ↓
ProductDetailContent receives params: "3338-012"
    ↓
API call to /api/product/3338-012
    ↓
API route detects non-numeric param → queries by article
    ↓
Backend returns paginated product-variants response
    ↓
isVariantsAPIResponse() detects new format
    ↓
transformProductVariantsResponse() converts to internal format
    ↓
Product state updated with transformed data
    ↓
Components render with proper variant data
    ↓
VariantSelector displays color/size options
    ↓
User selects color and size
    ↓
Matching variant found and set as selectedVariation
    ↓
Price, SKU, quantity, images update automatically
```

## Component Mapping

| Screen Element | Data Source                              | Component          |
| -------------- | ---------------------------------------- | ------------------ |
| Product Title  | `article` from variant                   | ProductContent     |
| Price (MRP)    | `warehouse_product_variants[0].price`    | ProductContent     |
| SKU            | `barcode` from selected variant          | ProductInformation |
| Stock Status   | Calculated from `quantity`               | ProductInformation |
| Quantity Left  | `warehouse_product_variants[0].quantity` | ProductInformation |
| Color Swatches | Extracted from all variants              | VariantSelector    |
| Size Options   | Extracted from all variants              | VariantSelector    |
| Product Images | `main_image` from selected variant       | ThumbnailImage     |

## Environment Variables

Make sure these are set in `next.config.mjs`:

```javascript
env: {
  BACKEND_PROD_URL: "https://api.cuple.shop/api/",
  BACKEND_IMAGE_URL: "https://api.cuple.shop/storage/",
}
```

## Testing

To test the integration:

1. Navigate to a product detail page using an article code:

   ```
   http://localhost:3000/product/3338-012
   ```

2. Verify the following:
   - ✅ Product title shows article code
   - ✅ Price displays correctly
   - ✅ Stock status is accurate
   - ✅ Color swatches appear with correct colors
   - ✅ Size options are displayed
   - ✅ Selecting different color/size combinations updates:
     - Product image
     - Price (if different)
     - Stock status
     - Quantity available
     - SKU/barcode
   - ✅ Out-of-stock combinations are disabled
   - ✅ Add to Cart uses selected variant data

## Backward Compatibility

The implementation maintains full backward compatibility:

- Existing product API format still works
- Legacy product pages continue functioning
- Only new variant-based products use the new selector
- Detection is automatic based on response structure

## Future Enhancements

Potential improvements:

1. Add variant images for each color (currently uses first image)
2. Support for multiple warehouses selection
3. Price range display when variants have different prices
4. Variant-specific descriptions
5. Bulk variant availability checking
6. Variant-based inventory management

## Troubleshooting

### Images not loading

- Check `BACKEND_IMAGE_URL` in `next.config.mjs`
- Verify image paths in API response
- Add image domain to `next.config.mjs` remotePatterns

### Variants not showing

- Check console for transformation errors
- Verify API response has `warehouse_product_variants`
- Ensure variants have valid color and size data

### Price not updating

- Verify selectedVariation is being set correctly
- Check that variant has `warehouse_product_variants[0].price`
- Look for console logs showing variant selection

## Support

For issues or questions, check:

1. Browser console for errors
2. Network tab for API responses
3. React DevTools for component state
4. Console logs in ProductDetailContent component
