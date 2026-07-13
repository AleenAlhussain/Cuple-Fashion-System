import { descriptionSchema, discountSchema, dropDownScheme, ifTypeSimpleSchema, nameSchema, variationSchema, watermarkImageSchema, testSchema } from "../../../utils/validation/ValidationSchemas";

export const ProductValidationSchema = {
  name: nameSchema,
  // Make short_description and description optional for simpler editing
  // short_description: nameSchema,
  // description: descriptionSchema,
  stock_status: nameSchema,
  sku: ifTypeSimpleSchema,
  quantity: ifTypeSimpleSchema,
  price: ifTypeSimpleSchema, // if (type == simple)
  discount: discountSchema, // if (type == simple)
  // categories: dropDownScheme, // Make categories optional
  // variations: variationSchema, // Variation validation causes issues with existing data
  watermark_image_id:watermarkImageSchema,
  wholesale_prices: testSchema
};

export function ProductInitValues(oldData, updateId) {
  // Support both 'variations' and 'variants' field names from API
  // Map backend field names to frontend form field names
  const rawVariations = oldData?.variations || oldData?.variants || [];
  const storageUrl = process.env.storageURL || process.env.NEXT_PUBLIC_STORAGE_URL || 'https://api.cuple.shop/storage';

  // Helper to convert image path/string to object format for FileUploadField
  const formatVariationImage = (v) => {
    // If already an object with original_url, use it
    if (v.variation_image && typeof v.variation_image === 'object' && v.variation_image.original_url) {
      return v.variation_image;
    }
    // Check for image_url (full URL from backend accessor)
    if (v.image_url && typeof v.image_url === 'string') {
      return {
        id: v.id || v.variation_image_id || null,
        original_url: v.image_url,
        file_name: v.image ? v.image.split('/').pop() : 'variation-image',
      };
    }
    // If image is a string path, convert to object
    const imagePath = v.variation_image || v.image;
    if (imagePath && typeof imagePath === 'string') {
      const imageUrl = imagePath.startsWith('http') ? imagePath : `${storageUrl}/${imagePath}`;
      return {
        id: v.id || v.variation_image_id || null,
        original_url: imageUrl,
        file_name: imagePath.split('/').pop(),
      };
    }
    return null;
  };

  const variationsData = rawVariations.map(v => ({
    ...v,
    // Map variant_name to name for form validation compatibility
    name: v.name || v.variant_name || '',
    // Map stock_quantity to quantity for form compatibility (as string for validation)
    quantity: String(v.quantity || v.stock_quantity || 0),
    // Ensure price is string for validation
    price: String(v.price || ''),
    // Ensure sku is present as string
    sku: String(v.sku || ''),
    // Ensure status is boolean
    status: v.status !== undefined ? Boolean(v.status) : (v.is_active !== undefined ? Boolean(v.is_active) : true),
    // Map image to variation_image object for FileUploadField compatibility
    variation_image: formatVariationImage(v),
    variation_image_id: v.variation_image_id || v.image_id || (v.image ? v.id : null),
  }));

  const attr_combination = () => {
    let attributes = oldData?.attributes?.map((value) => value?.id);
    if (!attributes || attributes.length === 0) return [{}];

    let variants = attributes?.map((attr, i) => {
      let matchingVariations = variationsData.filter((variation) => {
        return variation.attribute_values?.some((attrVal) => attrVal?.attribute_id == attr);
      });

      let attributeValues = matchingVariations?.reduce((acc, variation) => {
        let values = variation.attribute_values?.filter((attrVal) => attrVal?.attribute_id == attr).map((attrVal) => attrVal?.id);
        return values ? [...new Set([...acc, ...values])] : acc;
      }, []);
      return oldData?.attributes?.[i] && attributeValues.length > 0 ? { name: oldData?.attributes[i], values: attributeValues } : false;
    });
    return variants?.filter((elem) => elem !== false);
  };
  return {
    // General - Always use variable product type
    product_type: "variable",
    store_id: updateId ? Number(oldData?.store_id) || "" : "",
    name: updateId ? oldData?.name || "" : "",
    name_ar: updateId ? oldData?.name_ar || "" : "",
    short_description: updateId ? oldData?.short_description || "" : "",
    short_description_ar: updateId ? oldData?.short_description_ar || "" : "",
    description: updateId ? oldData?.description || "" : "",
    description_ar: updateId ? oldData?.description_ar || "" : "",

    // Product Images
    product_thumbnail: updateId ? oldData?.product_thumbnail || "" : "",
    product_thumbnail_id: updateId ? oldData?.product_thumbnail?.id || "" : "",
    size_chart_image: updateId ? oldData?.size_chart_image || "" : "",
    size_chart_image_id: updateId ? oldData?.size_chart_image?.id || "" : "",
    product_galleries: updateId ? oldData?.product_galleries?.map((img) => img) || "" : "",
    product_galleries_id: updateId ? oldData?.product_galleries?.map((elem) => elem.id) || "" : "",
    watermark: updateId ?  oldData?.watermark ? false : false : false,
    watermark_position: updateId ? "center" : "center",
    watermark_image: updateId ? "" : "",
    watermark_image_id: updateId ?  "" : "",
    // Always use variable type
    type: "variable",
    stock_status: updateId ? oldData?.stock_status || "" : "in_stock",
    sku: updateId ? oldData?.sku || "" : "",
    // Support both 'quantity' and 'stock_quantity' field names
    quantity: updateId ? (oldData?.quantity || oldData?.stock_quantity || "") : "",
    price: updateId ? oldData?.price || "" : "",
    discount: updateId ? oldData?.discount || "" : "",
    sale_price: updateId ? oldData?.sale_price || "" : "0.00",
    wholesale_price_type : updateId ? oldData?.wholesale_price_type || "" : "",
    wholesale_prices:  updateId ? oldData?.wholesales || [] : [],
    // Variation - support both field names
    variations: updateId ? variationsData : [],
    combination: updateId ? attr_combination() : [{}],
    attributes_ids: updateId ? oldData?.attributes?.map((elem) => elem.id) || [] : [],
    variation_image_id: "",
    deleted_variant_ids: [], // Track deleted variant IDs for backend deletion
    // Setup
    is_sale_enable: updateId ? oldData?.is_sale_enable ? true : false : false,
    sale_starts_at: updateId ? oldData?.sale_starts_at || null : null,
    sale_expired_at: updateId ? oldData?.sale_expired_at || null : null,
    unit: updateId ? oldData?.unit || "" : "",
    tags: updateId ? oldData?.tags?.map((item) => item.id) || [] : [],
    categories: updateId ? oldData?.categories?.map((item) => item.id) || [] : [],
    brand_id : updateId ? oldData?.brand_id : '',
    is_random_related_products: updateId ? Boolean(Number(oldData?.is_random_related_products)) : true,
    // Support both camelCase (from backend) and snake_case field names
    // Store as array of objects for the select component to properly display
    related_products: updateId ? (oldData?.relatedProducts || oldData?.related_products || []).map((elem) => elem.id) : [],
    cross_sell_products: updateId ? (oldData?.crossSellProducts || oldData?.cross_sell_products || []).map((elem) => elem.id) : [],
    upsell_products: updateId ? (oldData?.upsellProducts || oldData?.upsell_products || []).map((elem) => elem.id) : [],

    // SEO
    meta_title: updateId ? oldData?.meta_title || "" : "",
    meta_description: updateId ? oldData?.meta_description || "" : "",
    product_meta_image_id: updateId ? oldData?.product_meta_image_id?.id || "" : "",
    product_meta_image: updateId ? oldData?.product_meta_image || "" : "",
    // Shipping Tax
    is_free_shipping: updateId ? Boolean(Number(oldData?.is_free_shipping)) : "",
    weight: updateId ? oldData?.weight || "" : "",
    estimated_delivery_text: updateId ? oldData?.estimated_delivery_text : "",
    is_return: updateId ? Boolean(oldData?.is_return) : true,
    return_policy_text: updateId ? oldData?.return_policy_text : "",

    // Status - support both 'status' and 'is_active' field names
    is_featured: updateId ? Boolean(oldData?.is_featured) : false,
    safe_checkout: updateId ? Boolean(oldData?.safe_checkout) : true,
    secure_checkout: updateId ? Boolean(oldData?.secure_checkout) : true,
    social_share: updateId ? Boolean(oldData?.social_share) : true,
    encourage_order: updateId ? Boolean(oldData?.encourage_order) : true,
    encourage_view: updateId ? Boolean(oldData?.encourage_view) : true,
    is_trending: updateId ? Boolean(oldData?.is_trending) : false,
    status: updateId ? Boolean(oldData?.status ?? oldData?.is_active) : true
  };
}
