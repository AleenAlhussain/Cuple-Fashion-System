"use client";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Loader from "@/layout/loader";

import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import StickyCheckout from "./common/stickyCheckout";
import Product4Image from "./product4Image";
import ProductAccordion from "./productAccordion";
import ProductColumn from "./productColumn";
import ProductDigital from "./productDigital";
import ProductThumbnailImage from "./productImageOutside";
import ProductSidebarLayout from "./productSidebarLayout";
import ProductSlider from "./productSlider";
import ProductSticky from "./productSticky";
import ProductThumbnail from "./productThumbnail";
import ProductVerticalTab from "./productVerticalTab";
import { useGetOneProduct } from "@/utils/api";
import { useTranslation } from "react-i18next";
import { resolveSwatchColor } from "@/utils/colorSwatch";

// Helper to get proper image URL (handles external URLs from cuple.ae)
const getProperImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (typeof imagePath === 'string' && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
    return imagePath;
  }
  const storageUrl = process.env.NEXT_PUBLIC_BACKEND_IMAGE_URL || process.env.IMAGE_URL || '';
  return `${storageUrl}${imagePath?.startsWith('/') ? '' : '/'}${imagePath}`;
};

// ===== Color-Based Gallery Logic =====
const norm = (s) => (s || "").toString().trim().toLowerCase();
const colorNorm = (s) => norm(s).replace(/[^a-z]/g, "");

function collapseRepeatedColorToken(value) {
  const token = colorNorm(value);
  if (!token || token.length % 2 !== 0) return token;

  const half = token.slice(0, token.length / 2);
  return half === token.slice(token.length / 2) ? half : token;
}

function colorsMatch(left, right) {
  const leftAliases = new Set(
    [colorNorm(left), collapseRepeatedColorToken(left)].filter(Boolean)
  );
  const rightAliases = new Set(
    [colorNorm(right), collapseRepeatedColorToken(right)].filter(Boolean)
  );

  for (const alias of leftAliases) {
    if (rightAliases.has(alias)) return true;
  }

  return false;
}

function parseImageMeta(url) {
  const u = (url || "").toString();
  const clean = u.split("?")[0];
  const filename = decodeURIComponent(clean.split("/").pop() || "");
  const extOk = /\.(webp|jpg|jpeg|png|avif)$/i.test(filename);

  if (!extOk) {
    return { url: u, color: "", pos: 999, key: norm(u) };
  }

  const base = filename.replace(/\.(webp|jpg|jpeg|png|avif)$/i, "");

  let m = base.match(/\((\d+)\)\s*$/);
  if (m) {
    const pos = parseInt(m[1], 10);
    const left = base.replace(/\((\d+)\)\s*$/, "").trim();
    const mColor = left.match(/-\s*([A-Za-z ]+)\s*$/);

    return {
      url: u,
      color: mColor ? colorNorm(mColor[1]) : "",
      pos: Number.isFinite(pos) ? pos : 999,
      key: norm(u),
    };
  }

  m = base.match(/-(\d+)\s*$/);
  if (m) {
    const pos = parseInt(m[1], 10);
    const left = base.replace(/-(\d+)\s*$/, "");
    const mColor = left.match(/-([A-Za-z][A-Za-z -]*)\s*$/);

    return {
      url: u,
      color: mColor ? colorNorm(mColor[1]) : "",
      pos: Number.isFinite(pos) ? pos : 999,
      key: norm(u),
    };
  }

  m = base.match(/-([A-Za-z][A-Za-z -]*?)(?:-)?(\d+)(?:-[A-Za-z0-9]+)*\s*$/);

  return {
    url: u,
    color: m ? colorNorm(m[1]) : "",
    pos: m ? parseInt(m[2], 10) || 999 : 999,
    key: norm(u),
  };
}

function dedupeByUrl(urls) {
  const seen = new Set();
  return urls.filter((u) => {
    const k = norm(u);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function normalizeGalleryOrder(rawGalleries) {
  const urls = (rawGalleries || [])
    .map((img) => img?.url || img?.image_url || img?.original_url || img)
    .filter(Boolean);

  const unique = dedupeByUrl(urls);
  const metas = unique.map(parseImageMeta);
  const hasAnyPos = metas.some((item) => item.pos !== 999);

  if (!hasAnyPos) return unique;

  return metas
    .slice()
    .sort((left, right) => {
      if (left.pos === 999 && right.pos === 999) return 0;
      if (left.pos === 999) return 1;
      if (right.pos === 999) return -1;

      if (!left.color && !right.color) return left.pos - right.pos;
      if (left.color && !right.color) return -1;
      if (!left.color && right.color) return 1;
      if (left.color < right.color) return -1;
      if (left.color > right.color) return 1;
      return left.pos - right.pos;
    })
    .map((item) => item.url);
}

function buildColorOnlyGallery(product, selectedColor, variationImageUrl = "") {
  const colorKey = colorNorm(selectedColor);
  const orderedUrls = normalizeGalleryOrder(product?.product_galleries);

  if (!colorKey) {
    return orderedUrls;
  }

  const matchedByColor = orderedUrls
    .map(parseImageMeta)
    .filter((x) => x.color && colorsMatch(x.color, colorKey))
    .map((x) => x.url);

  if (matchedByColor.length) {
    return matchedByColor;
  }

  const variationToken = parseImageMeta(variationImageUrl)?.color || "";
  const matchedByVariationToken = orderedUrls
    .map(parseImageMeta)
    .filter((x) => x.color && colorsMatch(x.color, variationToken))
    .map((x) => x.url);

  return matchedByVariationToken;
}

// Transform backend product data to format expected by VariantSelector
const transformProductForVariants = (product) => {
  if (!product) return product;

  // For simple products without variants, ensure proper status fields
  if (!product.variants || product.variants.length === 0) {
    return {
      ...product,
      type: 'simple',
      status: product.is_active !== false ? 1 : 0,
      stock_status: product.stock_status || 'in_stock', // default to in_stock if not managed
      quantity: product.stock_quantity ?? 0,
      _isTransformed: true,
    };
  }

  // Dynamic attribute extraction - Map: attributeId -> { attribute info, values map }
  const attributesMap = new Map();
  const variations = [];

  product.variants.forEach((variant) => {
    // Extract attribute values from variant
    const attributeValues = variant.attribute_values || [];

    // Build attributesMap dynamically from ALL attributes
    attributeValues.forEach((av) => {
      const attr = av.attribute;
      if (!attr) return;

      const attrId = attr.id || av.attribute_id;
      const attrSlug = attr.slug?.toLowerCase() || '';

      // Initialize attribute in map if not exists
      if (!attributesMap.has(attrId)) {
        // Determine style based on attribute slug or explicitly set style
        let style = attr.style || 'radio'; // default to radio
        if (attrSlug === 'color') style = 'color';
        else if (attr.style === 'dropdown') style = 'dropdown';
        else if (attr.style === 'color') style = 'color';

        attributesMap.set(attrId, {
          id: attrId,
          name: attr.name,
          slug: attrSlug,
          style: style,
          valuesMap: new Map(),
        });
      }

      // Add value to attribute's values map
      const attrData = attributesMap.get(attrId);
      if (!attrData.valuesMap.has(av.id)) {
        const isColorAttribute = attrSlug === "color";
        attrData.valuesMap.set(av.id, {
          id: av.id,
          value: av.value,
          hex_color: isColorAttribute
            ? resolveSwatchColor({
                colorCode: av.color_code,
                hexColor: av.hex_color,
                value: av.value,
              })
            : null,
          attribute_id: attrId,
        });
      }
    });

    // Find color attribute for this variant (for image matching)
    const colorAttr = attributeValues.find((av) => {
      const attrName = av.attribute?.name?.toLowerCase() || '';
      const attrSlug = av.attribute?.slug?.toLowerCase() || '';
      return attrName === 'color' || attrSlug === 'color';
    });

    const rawVariantImage =
      variant?.variation_image?.original_url ||
      variant?.image_url ||
      variant?.image ||
      variant?.main_image ||
      null;
    const resolvedVariantImageUrl = getProperImageUrl(rawVariantImage);
    const colorGalleryUrls = buildColorOnlyGallery(
      product,
      colorAttr?.value,
      rawVariantImage
    );
    const variationGalleryMap = new Map();

    if (resolvedVariantImageUrl) {
      variationGalleryMap.set(resolvedVariantImageUrl, {
        id: `${variant.id}-primary`,
        original_url: resolvedVariantImageUrl,
        name: `${colorAttr?.value || "Variant"} Image 1`,
        mime_type: "image/jpeg",
      });
    }

    colorGalleryUrls.forEach((url, idx) => {
      const imgUrl = getProperImageUrl(url);
      if (!imgUrl || variationGalleryMap.has(imgUrl)) return;

      variationGalleryMap.set(imgUrl, {
        id: `${variant.id}-color-${idx}`,
        original_url: imgUrl,
        name: `${colorAttr?.value || "Variant"} Image ${variationGalleryMap.size + 1}`,
        mime_type: "image/jpeg",
      });
    });

    const variationGalleries = Array.from(variationGalleryMap.values());

    // Get primary variant image for variation_image
    const primaryImageUrl =
      resolvedVariantImageUrl || variationGalleries[0]?.original_url || null;

    // Determine stock status - variant is in stock if quantity > 0 OR if stock is not managed (undefined) and variant is active
    const hasStockDefined = variant.stock_quantity !== undefined && variant.stock_quantity !== null;
    const stockQty = variant.stock_quantity ?? 0;
    const isInStock = hasStockDefined ? stockQty > 0 : variant.is_active !== false;

    // Helper to get effective price (use sale_price only if > 0)
    const getPrice = (salePrice, regularPrice, fallback) => {
      const sale = parseFloat(salePrice) || 0;
      const regular = parseFloat(regularPrice) || 0;
      return sale > 0 ? sale : (regular > 0 ? regular : (parseFloat(fallback) || 0));
    };

    // Create variation entry
    variations.push({
      id: variant.id,
      title: product.name,
      sku: variant.sku,
      price: variant.price || product.price,
      sale_price: getPrice(variant.sale_price, variant.price, product.price),
      discount: 0,
      quantity: stockQty,
      stock_quantity: stockQty,
      stock_status: isInStock ? 'in_stock' : 'out_of_stock',
      status: variant.is_active !== false,
      is_active: variant.is_active !== false,
      variation_image: primaryImageUrl ? { id: variant.id, original_url: primaryImageUrl } : null,
      variation_galleries: variationGalleries,
      attribute_values: attributeValues.map((av) => {
        const avSlug = av.attribute?.slug?.toLowerCase() || "";
        const avName = av.attribute?.name?.toLowerCase() || "";
        const isColorAttribute = avSlug === "color" || avName === "color";

        return {
          id: av.id,
          value: av.value,
          hex_color: isColorAttribute
            ? resolveSwatchColor({
                colorCode: av.color_code,
                hexColor: av.hex_color,
                value: av.value,
              })
            : null,
          attribute_id: av.attribute_id || av.attribute?.id,
          attribute: av.attribute
            ? {
                id: av.attribute.id,
                name: av.attribute.name,
                slug: av.attribute.slug,
                style: av.attribute.style,
              }
            : null,
        };
      }),
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

  // Return transformed product
  return {
    ...product,
    variations,
    attributes,
    type: 'classified',
    status: product.is_active !== false ? 1 : 0,
    stock_status: 'in_stock', // For products with variants, stock is checked per variant
    _isTransformed: true,
  };
};

const ProductDetailContent = ({ params }) => {
  const router = useRouter();
  const { i18n } = useTranslation("common");
  const lang = i18n.language;
  const { themeOption } = useContext(ThemeOptionContext);
  const searchParams = useSearchParams();
  const queryProductLayout = searchParams.get("layout");

  // Getting Product Layout
  const isProductLayout = useMemo(() => {
    return queryProductLayout
      ? queryProductLayout
      : themeOption?.product?.product_layout ?? "product_thumbnail";
  }, [queryProductLayout, themeOption]);

  const [productState, setProductState] = useState({
    product: null,
    attributeValues: [],
    productQty: 1,
    selectedVariation: null,
    variantIds: [],
    statusIds: [],
  });

  // Fetch product data - the API returns everything including variants
  const {
    data: productResponse,
    isLoading,
    refetch,
  } = useGetOneProduct({ id: params });

  // Refetch when params change
  useEffect(() => {
    if (params) {
      refetch();
    }
  }, [params, refetch]);

  // Clear stale product data immediately when navigating to a different
  // product, so the previous product's details don't flash/persist while
  // the new one is loading.
  useEffect(() => {
    setProductState((prev) => ({
      ...prev,
      product: null,
      selectedVariation: null,
      variantIds: [],
      attributeValues: [],
    }));
  }, [params]);

  // Set product data when API response comes back
  useEffect(() => {
    if (productResponse?.data) {
      const rawProduct = productResponse.data;

      // Transform the product to include variations/attributes for VariantSelector
      const product = transformProductForVariants(rawProduct);

      // Set the first variation as selected if variations exist
      const firstVariation = product.variations?.[0] || null;

      setProductState((prev) => ({
        ...prev,
        product: product,
        selectedVariation: firstVariation,
        variantIds: firstVariation?.attribute_values?.map((av) => av.id) || [],
        attributeValues: firstVariation?.attribute_values || [],
      }));
    }
  }, [productResponse]);

  // Handle scroll for sticky cart
  useEffect(() => {
    const handleScroll = () => {
      const button = document.querySelector(".scroll-button");
      if (button) {
        const buttonRect = button.getBoundingClientRect();
        if (buttonRect.bottom < window.innerHeight && buttonRect.bottom < 0) {
          document.body.classList.add("stickyCart");
        } else {
          document.body.classList.remove("stickyCart");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.classList?.remove("stickyCart");
    };
  }, []);

  if (isLoading || !productState.product) return <Loader />;

  const showProductLayout = {
    product_thumbnail: (
      <ProductThumbnail
        productState={productState}
        setProductState={setProductState}
      />
    ),
    product_images: (
      <Product4Image
        productState={productState}
        setProductState={setProductState}
      />
    ),
    product_sticky: (
      <ProductSticky
        productState={productState}
        setProductState={setProductState}
      />
    ),
    product_slider: (
      <ProductSlider
        productState={productState}
        setProductState={setProductState}
      />
    ),
    product_digital: (
      <ProductDigital
        productState={productState}
        setProductState={setProductState}
      />
    ),
    product_accordion: (
      <ProductAccordion
        productState={productState}
        setProductState={setProductState}
      />
    ),
    product_no_sidebar: (
      <ProductThumbnail
        productState={productState}
        setProductState={setProductState}
      />
    ),
    vertical_tab: (
      <ProductVerticalTab
        productState={productState}
        setProductState={setProductState}
      />
    ),
    product_thumbnail_left_image: (
      <ProductThumbnailImage
        direction="left"
        productState={productState}
        setProductState={setProductState}
      />
    ),
    product_thumbnail_right_image: (
      <ProductThumbnailImage
        direction="right"
        productState={productState}
        setProductState={setProductState}
      />
    ),
    product_thumbnail_image_outside: (
      <ProductThumbnailImage
        productState={productState}
        setProductState={setProductState}
      />
    ),
    product_sidebar_left: (
      <ProductSidebarLayout
        productState={productState}
        setProductState={setProductState}
        direction="left"
      />
    ),
    product_sidebar_right: (
      <ProductSidebarLayout
        productState={productState}
        setProductState={setProductState}
        direction="right"
      />
    ),
    product_column_thumbnail: (
      <ProductColumn
        productState={productState}
        setProductState={setProductState}
        direction="bottom"
      />
    ),
  };

  return (
    <>
      <Breadcrumbs
        title={lang === 'ar' && productState.product?.name_ar ? productState.product.name_ar : productState.product?.name}
        subNavigation={[
          { name: "Product" },
          { name: lang === 'ar' && productState.product?.name_ar ? productState.product.name_ar : productState.product?.name },
        ]}
      />
      {showProductLayout[isProductLayout]}
      {productState.product && (
        <StickyCheckout
          ProductData={productState.product}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

export default ProductDetailContent;
