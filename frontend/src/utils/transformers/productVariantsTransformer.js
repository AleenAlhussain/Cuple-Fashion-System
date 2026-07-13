import { placeHolderImage } from "@/components/widgets/Placeholder";

// Helper to get proper image URL (handles external URLs from cuple.ae)
const getProperImageUrl = (imagePath) => {
  if (!imagePath) return null;
  // If already a full URL, return as-is
  if (typeof imagePath === 'string' && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
    return imagePath;
  }
  // Otherwise prepend storage URL
  const storageUrl = process.env.NEXT_PUBLIC_BACKEND_IMAGE_URL || process.env.IMAGE_URL || 'https://api.cuple.shop/storage/';
  return `${storageUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

/**
 * Transform product-variants API response to the format expected by product detail components
 * @param {Object} variantsResponse - The API response from /website/product-variants
 * @returns {Object} Transformed product data compatible with existing components
 */
export const transformProductVariantsResponse = (variantsResponse) => {
  if (
    !variantsResponse ||
    !variantsResponse.data ||
    !Array.isArray(variantsResponse.data)
  ) {
    return null;
  }

  const variants = variantsResponse.data;

  if (variants.length === 0) {
    return null;
  }

  // Dynamic attribute extraction from variant's attributeValues relationship
  // Map: attributeId -> { attribute info, values map }
  const attributesMap = new Map();
  const variations = [];

  variants.forEach((variant) => {
    // Extract attributes from variant's attributeValues (from database relationship)
    if (variant.attribute_values && Array.isArray(variant.attribute_values)) {
      variant.attribute_values.forEach((attrValue) => {
        const attr = attrValue.attribute;
        if (!attr) return;

        // Initialize attribute in map if not exists
        if (!attributesMap.has(attr.id)) {
          attributesMap.set(attr.id, {
            id: attr.id,
            name: attr.name,
            slug: attr.slug,
            style: attr.style || (attr.slug === 'color' ? 'color' : 'radio'),
            valuesMap: new Map(),
          });
        }

        // Add value to attribute's values map
        const attrData = attributesMap.get(attr.id);
        if (!attrData.valuesMap.has(attrValue.id)) {
          attrData.valuesMap.set(attrValue.id, {
            id: attrValue.id,
            value: attrValue.value,
            hex_color: attrValue.color_code || attrValue.hex_color || null,
            attribute_id: attr.id,
          });
        }
      });
    }

    // Fallback: Also check for direct color/size fields (legacy data format)
    if (variant.color && variant.color_code && !attributesMap.has(1)) {
      attributesMap.set(1, {
        id: 1,
        name: "Color",
        slug: "color",
        style: "color",
        valuesMap: new Map(),
      });
    }
    if (variant.color && variant.color_code) {
      const colorId = `color_${variant.color.toLowerCase().replace(/\s+/g, "_")}`;
      if (!attributesMap.get(1)?.valuesMap.has(colorId)) {
        attributesMap.get(1)?.valuesMap.set(colorId, {
          id: colorId,
          value: variant.color,
          hex_color: variant.color_code,
          attribute_id: 1,
        });
      }
    }

    if (variant.size && !attributesMap.has(2)) {
      attributesMap.set(2, {
        id: 2,
        name: "Size",
        slug: "size",
        style: "radio",
        valuesMap: new Map(),
      });
    }
    if (variant.size) {
      const sizeId = `size_${variant.size}`;
      if (!attributesMap.get(2)?.valuesMap.has(sizeId)) {
        attributesMap.get(2)?.valuesMap.set(sizeId, {
          id: sizeId,
          value: variant.size,
          attribute_id: 2,
        });
      }
    }

    // Create variation entry
    const imageUrl = variant.main_image
      ? getProperImageUrl(variant.main_image)
      : variant.image_url
      ? getProperImageUrl(variant.image_url)
      : placeHolderImage;

    // Build variation galleries from variant main image + product media
    const variationGalleries = [];

    // Add variant's main image first
    if (imageUrl) {
      variationGalleries.push({
        id: `gallery_${variant.id}`,
        original_url: imageUrl,
        name: variant.article || `Variant ${variant.id}`,
        mime_type: "image/jpeg",
      });
    }

    // Build attribute_values for this variation from database relationship
    const variationAttributeValues = [];

    if (variant.attribute_values && Array.isArray(variant.attribute_values)) {
      variant.attribute_values.forEach((attrValue) => {
        const attr = attrValue.attribute;
        if (!attr) return;

        variationAttributeValues.push({
          id: attrValue.id,
          value: attrValue.value,
          hex_color: attrValue.color_code || attrValue.hex_color || null,
          attribute_id: attr.id,
        });
      });
    }

    // Fallback: Add legacy color/size if no attributeValues from database
    if (variationAttributeValues.length === 0) {
      if (variant.color) {
        variationAttributeValues.push({
          id: `color_${variant.color.toLowerCase().replace(/\s+/g, "_")}`,
          value: variant.color,
          hex_color: variant.color_code,
          attribute_id: 1,
        });
      }
      if (variant.size) {
        variationAttributeValues.push({
          id: `size_${variant.size}`,
          value: variant.size,
          attribute_id: 2,
        });
      }
    }

    variations.push({
      id: variant.id,
      title: variant.product?.title || variant.article,
      sku: variant.barcode || variant.sku,
      price: variant.price || variant.final_price,
      sale_price: variant.sale_price || variant.price || variant.final_price,
      discount: 0,
      quantity: variant.quantity || variant.stock_quantity || 0,
      stock_status: (variant.quantity || variant.stock_quantity || 0) > 0 ? "in_stock" : "out_of_stock",
      status: variant.is_active !== false,
      variation_image: {
        id: variant.id,
        original_url: imageUrl,
      },
      variation_galleries: variationGalleries,
      attribute_values: variationAttributeValues,
      // Store original variant data for reference
      _original: variant,
    });
  });

  // Build attributes array from the map (sorted: Color first, Size second, then others by ID)
  const attributes = Array.from(attributesMap.values())
    .sort((a, b) => {
      // Color comes first
      if (a.slug === 'color') return -1;
      if (b.slug === 'color') return 1;
      // Size comes second
      if (a.slug === 'size') return -1;
      if (b.slug === 'size') return 1;
      // Others sorted by ID
      return a.id - b.id;
    })
    .map((attr) => ({
      id: attr.id,
      name: attr.name,
      slug: attr.slug,
      style: attr.style,
      attribute_values: Array.from(attr.valuesMap.values()),
      selected_value: null,
    }));

  // Get first variant data as defaults
  const firstVariant = variants[0];

  // Build product galleries from variant main images + product media
  const productGalleries = [];

  // Add variant main images
  variants
    .filter((v) => v.main_image)
    .forEach((v) => {
      productGalleries.push({
        id: v.id,
        original_url: getProperImageUrl(v.main_image),
        name: v.article,
        mime_type: "image/jpeg",
      });
    });

  // Add product media images if available
  if (
    firstVariant.product?.media &&
    Array.isArray(firstVariant.product.media)
  ) {
    firstVariant.product.media.forEach((media) => {
      productGalleries.push({
        id: media.id,
        original_url: getProperImageUrl(media.url),
        name: `Product Media ${media.id}`,
        mime_type: "image/jpeg",
      });
    });
  }

  // Build transformed product object
  const transformedProduct = {
    id: firstVariant.id,
    name: firstVariant.product?.title || firstVariant.article,
    slug: firstVariant.product?.article || firstVariant.article,
    sku: firstVariant.barcode,
    type: "classified", // Product type that supports variants
    price: firstVariant?.price || 0,
    sale_price: firstVariant?.price || 0,
    discount: 0,
    quantity: firstVariant?.quantity || 0,
    stock_status: firstVariant?.quantity > 0 ? "in_stock" : "out_of_stock",
    status: firstVariant.is_active === 1,
    rating_count: 0,
    reviews_count: 0,
    is_external: false,
    is_sale_enable: false,
    is_trending: false,
    is_featured: false,
    article: firstVariant.article,
    categories: firstVariant?.categories || [],
    short_description: firstVariant.product?.short_description || "",
    description: firstVariant.product?.description || "",
    product_thumbnail: {
      id: firstVariant.id,
      original_url: firstVariant.main_image
        ? getProperImageUrl(firstVariant.main_image)
        : null,
    },
    product_galleries: productGalleries,
    media: firstVariant.product?.media || [], // Include original media array
    variations,
    attributes,
    tags: [],
    cross_sell_products: [],
    related_products: [],
    // Enable social share on transformed products (parity with legacy product payload)
    social_share:
      variantsResponse?.social_share ??
      variantsResponse?.data?.[0]?.social_share ??
      true,

    // Store original response for reference
    _originalResponse: variantsResponse,
    _isTransformed: true,
  };

  return transformedProduct;
};

/**
 * Check if a product data object is from the new variants API
 * @param {Object} productData - Product data object
 * @returns {boolean}
 */
export const isVariantsAPIResponse = (productData) => {
  return (
    productData &&
    typeof productData === "object" &&
    "data" in productData &&
    Array.isArray(productData.data) &&
    // "meta" in productData &&
    // "current_page" in productData.meta &&
    productData.data.length > 0
  );
};
