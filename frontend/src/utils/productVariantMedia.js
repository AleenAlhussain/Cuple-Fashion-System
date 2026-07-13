import { placeHolderImage } from "@/components/widgets/Placeholder";

const norm = (value) => (value || "").toString().trim().toLowerCase();
const colorNorm = (value) => norm(value).replace(/[^a-z]/g, "");

const collapseRepeatedToken = (value) => {
  const token = colorNorm(value);
  if (!token || token.length % 2 !== 0) return token;

  const half = token.slice(0, token.length / 2);
  return half === token.slice(token.length / 2) ? half : token;
};

const buildColorAliases = (value) => {
  const token = colorNorm(value);
  const collapsed = collapseRepeatedToken(value);
  return new Set([token, collapsed].filter(Boolean));
};

const colorsMatch = (left, right) => {
  const leftAliases = buildColorAliases(left);
  const rightAliases = buildColorAliases(right);

  for (const alias of leftAliases) {
    if (rightAliases.has(alias)) return true;
  }

  return false;
};

export const getVariantAttributeValues = (variation) =>
  variation?.attribute_values || variation?.attributeValues || [];

export const matchesAttributeKey = (attribute, attributeKey) => {
  const slug = attribute?.slug?.toLowerCase?.() || "";
  const name = attribute?.name?.toLowerCase?.() || "";
  return slug === attributeKey || name === attributeKey;
};

export const getVariationAttribute = (variation, product, attributeKey) =>
  getVariantAttributeValues(variation).find((item) => {
    const linkedAttribute = product?.attributes?.find(
      (attribute) => String(attribute?.id) === String(item?.attribute_id)
    );

    return (
      matchesAttributeKey(item?.attribute, attributeKey) ||
      matchesAttributeKey(linkedAttribute, attributeKey)
    );
  }) || null;

export const getSelectedAttributeValueFromIds = (product, variantIds, attributeKey) => {
  const attribute = product?.attributes?.find((item) =>
    matchesAttributeKey(item, attributeKey)
  );

  if (!attribute) return "";

  const selectedValue = attribute?.attribute_values?.find((value) =>
    (variantIds || []).some((selectedId) => String(selectedId) === String(value?.id))
  );

  return selectedValue?.value || attribute?.selected_value || "";
};

export const dedupeMediaByUrl = (items = []) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = item?.original_url || item?.url || "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const parseImageMeta = (url) => {
  const rawUrl = (url || "").toString();
  const clean = rawUrl.split("?")[0];
  const filename = decodeURIComponent(clean.split("/").pop() || "");
  const extensionSupported = /\.(webp|jpg|jpeg|png|avif)$/i.test(filename);

  if (!extensionSupported) {
    return { url: rawUrl, color: "", pos: 999, key: norm(rawUrl) };
  }

  const base = filename.replace(/\.(webp|jpg|jpeg|png|avif)$/i, "");

  let matched = base.match(/\((\d+)\)\s*$/);
  if (matched) {
    const pos = parseInt(matched[1], 10);
    const left = base.replace(/\((\d+)\)\s*$/, "").trim();
    const colorMatch = left.match(/-\s*([A-Za-z ]+)\s*$/);

    return {
      url: rawUrl,
      color: colorMatch ? colorNorm(colorMatch[1]) : "",
      pos: Number.isFinite(pos) ? pos : 999,
      key: norm(rawUrl),
    };
  }

  matched = base.match(/-(\d+)\s*$/);
  if (matched) {
    const pos = parseInt(matched[1], 10);
    const left = base.replace(/-(\d+)\s*$/, "");
    const colorMatch = left.match(/-([A-Za-z][A-Za-z -]*)\s*$/);

    return {
      url: rawUrl,
      color: colorMatch ? colorNorm(colorMatch[1]) : "",
      pos: Number.isFinite(pos) ? pos : 999,
      key: norm(rawUrl),
    };
  }

  matched = base.match(/-([A-Za-z][A-Za-z -]*?)(?:-)?(\d+)(?:-[A-Za-z0-9]+)*\s*$/);
  if (matched) {
    const pos = parseInt(matched[2], 10);

    return {
      url: rawUrl,
      color: colorNorm(matched[1]),
      pos: Number.isFinite(pos) ? pos : 999,
      key: norm(rawUrl),
    };
  }

  return { url: rawUrl, color: "", pos: 999, key: norm(rawUrl) };
};

const dedupeByUrl = (urls) => {
  const seen = new Set();
  return urls.filter((url) => {
    const key = norm(url);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeGalleryOrder = (rawGalleries) => {
  const urls = (rawGalleries || [])
    .map((image) => image?.url || image?.image_url || image?.original_url || image)
    .filter(Boolean);

  const uniqueUrls = dedupeByUrl(urls);
  const metadata = uniqueUrls.map(parseImageMeta);
  const hasAnyPosition = metadata.some((item) => item.pos !== 999);

  if (!hasAnyPosition) return uniqueUrls;

  return metadata
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
};

export const buildColorOnlyGallery = (
  product,
  selectedColor,
  { strict = false, variationImageUrl = "" } = {}
) => {
  const colorKey = colorNorm(selectedColor);
  const orderedUrls = normalizeGalleryOrder(product?.product_galleries);

  if (!colorKey && !variationImageUrl) return orderedUrls;

  const matched = orderedUrls
    .map(parseImageMeta)
    .filter((item) => item.color && colorsMatch(item.color, colorKey))
    .map((item) => item.url);

  if (matched.length) {
    return matched;
  }

  const variationToken = parseImageMeta(variationImageUrl)?.color || "";
  const variationMatched = orderedUrls
    .map(parseImageMeta)
    .filter((item) => item.color && colorsMatch(item.color, variationToken))
    .map((item) => item.url);

  if (variationMatched.length) {
    return variationMatched;
  }

  if (strict) {
    return [];
  }

  return orderedUrls;
};

export const mapUrlsToMedia = (urls = [], namePrefix = "Product Image") =>
  urls.map((url, index) => ({
    id: `gallery-${index}`,
    original_url: url,
    name: `${namePrefix} ${index + 1}`,
    mime_type: "image/jpeg",
  }));

export const getColorSpecificMedia = (
  product,
  selectedColor,
  { strictGalleryMatch = false } = {}
) => {
  const variations = product?.variations || product?.variants || [];

  const variationMedia = dedupeMediaByUrl(
    variations
      .filter((variation) => {
        const variationColor =
          getVariationAttribute(variation, product, "color")?.value || "";
        return variationColor && norm(variationColor) === norm(selectedColor);
      })
      .flatMap((variation) => {
        if (variation?.variation_galleries?.length) {
          return variation.variation_galleries;
        }

        if (variation?.variation_image?.original_url) {
          return [variation.variation_image];
        }

        return [];
      })
  );

  if (variationMedia.length) {
    return variationMedia;
  }

  const colorGalleryUrls = buildColorOnlyGallery(product, selectedColor, {
    strict: strictGalleryMatch,
  });

  if (colorGalleryUrls.length) {
    return mapUrlsToMedia(colorGalleryUrls, selectedColor || "Product Image");
  }

  return [];
};

export const getFallbackMedia = (product) => {
  if (product?.product_thumbnail?.original_url) {
    return [product.product_thumbnail];
  }

  if (product?.product_galleries?.length) {
    return [product.product_galleries[0]];
  }

  return [
    {
      id: "placeholder",
      original_url: placeHolderImage,
      name: "Placeholder",
      mime_type: "image/jpeg",
    },
  ];
};
