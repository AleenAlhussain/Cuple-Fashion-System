"use client";

import ThemeOptionContext from "@/context/themeOptionsContext";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { useGetProducts } from "@/utils/api";
import Loader from "@/layout/loader";
import { useCartState } from "@/states";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import Image from "next/image";
import { useContext, useEffect, useMemo, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { useTranslation } from "react-i18next";
import { RiAddLine, RiRestartLine, RiSubtractLine } from "react-icons/ri";
import {
  getColorSpecificMedia,
  getFallbackMedia,
  getVariationAttribute,
  getVariantAttributeValues,
  matchesAttributeKey,
} from "@/utils/productVariantMedia";
import styles from "./MatchiMatchi.module.scss";

const normalizeMatchiItems = (items, legacyProductIds = []) => {
  const sourceItems = Array.isArray(items) ? items : legacyProductIds;

  return (Array.isArray(sourceItems) ? sourceItems : [])
    .map((item, index) => {
      const isPrimitive = typeof item === "number" || typeof item === "string";
      const productId = Number(
        isPrimitive ? item : item?.product_id ?? item?.productId ?? item?.id
      );

      if (!Number.isInteger(productId) || productId <= 0) {
        return null;
      }

      return {
        key: isPrimitive
          ? `matchi-${productId}-${index + 1}`
          : item?.id || `matchi-${productId}-${index + 1}`,
        product_id: productId,
        match_type: isPrimitive
          ? ""
          : item?.match_type ??
            item?.matchType ??
            (item?.preview_zone === "hand"
              ? "bag"
              : item?.preview_zone === "foot"
              ? "shoes"
              : ""),
        color_attribute_value_id: isPrimitive
          ? null
          : Number(item?.color_attribute_value_id ?? item?.colorAttributeValueId ?? 0) || null,
        color_name: isPrimitive ? "" : item?.color_name ?? item?.color ?? "",
        color_name_ar: isPrimitive ? "" : item?.color_name_ar ?? item?.colorAr ?? "",
        color_hex: isPrimitive ? "" : item?.color_hex ?? item?.color_code ?? "",
        overlay_image_id: isPrimitive
          ? null
          : Number(item?.overlay_image_id ?? item?.overlayImageId ?? 0) || null,
        overlay_image_url: isPrimitive
          ? ""
          : item?.overlay_image_url ?? item?.overlayImageUrl ?? "",
        preview_zone: isPrimitive ? "auto" : item?.preview_zone ?? item?.previewZone ?? "auto",
        overlay_scale: isPrimitive
          ? 100
          : Number(item?.overlay_scale ?? item?.overlayScale ?? 100) || 100,
        overlay_offset_x: isPrimitive
          ? 0
          : Number(item?.overlay_offset_x ?? item?.overlayOffsetX ?? 0) || 0,
        overlay_offset_y: isPrimitive
          ? 0
          : Number(item?.overlay_offset_y ?? item?.overlayOffsetY ?? 0) || 0,
        overlay_rotation: isPrimitive
          ? 0
          : Number(item?.overlay_rotation ?? item?.overlayRotation ?? 0) || 0,
      };
    })
    .filter(Boolean);
};

const normalizeMatchiPairImages = (pairImages, availableItems = []) => {
  const validItemIds = new Set(
    (Array.isArray(availableItems) ? availableItems : []).map((item) => String(item?.key))
  );
  const seenPairs = new Set();

  return (Array.isArray(pairImages) ? pairImages : [])
    .map((pairImage, index) => {
      const firstItemId = String(
        pairImage?.first_item_id ?? pairImage?.firstItemId ?? ""
      ).trim();
      const secondItemId = String(
        pairImage?.second_item_id ?? pairImage?.secondItemId ?? ""
      ).trim();
      const firstItem = (Array.isArray(availableItems) ? availableItems : []).find(
        (item) => String(item?.key) === firstItemId
      );
      const secondItem = (Array.isArray(availableItems) ? availableItems : []).find(
        (item) => String(item?.key) === secondItemId
      );

      if (
        !firstItemId ||
        !secondItemId ||
        firstItemId === secondItemId ||
        (validItemIds.size &&
          (!validItemIds.has(firstItemId) || !validItemIds.has(secondItemId))) ||
        (firstItem?.match_type &&
          secondItem?.match_type &&
          firstItem.match_type === secondItem.match_type)
      ) {
        return null;
      }

      const signature = [firstItemId, secondItemId].sort().join("::");
      if (seenPairs.has(signature)) {
        return null;
      }

      seenPairs.add(signature);

      return {
        id: pairImage?.id || `matchi-pair-${index + 1}`,
        first_item_id: firstItemId,
        second_item_id: secondItemId,
        preview_image_id:
          pairImage?.preview_image_id ?? pairImage?.previewImageId ?? null,
        preview_image_url:
          pairImage?.preview_image_url ?? pairImage?.previewImageUrl ?? "",
        title: pairImage?.title ?? "",
        title_ar: pairImage?.title_ar ?? pairImage?.titleAr ?? "",
        description: pairImage?.description ?? "",
        description_ar:
          pairImage?.description_ar ?? pairImage?.descriptionAr ?? "",
        original_price:
          pairImage?.original_price ?? pairImage?.originalPrice ?? "",
        sale_price:
          pairImage?.sale_price ?? pairImage?.salePrice ?? "",
      };
    })
    .filter(Boolean);
};

const readLocalized = (isArabic, primary, secondary, fallback = "") =>
  isArabic ? primary || secondary || fallback : secondary || primary || fallback;

const getProductsFromResponse = (response) =>
  Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.data?.data)
    ? response.data.data
    : [];

const getColorLabel = (item, isArabic) =>
  readLocalized(
    isArabic,
    item?.color_name_ar,
    item?.color_name,
    item?.color_name || item?.color_name_ar || ""
  );

const getProductName = (product, isArabic) =>
  readLocalized(
    isArabic,
    product?.name_ar,
    product?.name,
    product?.slug || `#${product?.id}`
  );

const getPricing = (entity) => {
  const regularPrice = Number(
    entity?.price ?? entity?.min_price ?? entity?.display_price ?? 0
  );
  const saleCandidate = Number(
    entity?.sale_price ?? entity?.min_sale_price ?? entity?.display_sale_price ?? 0
  );
  const hasSale =
    Number.isFinite(saleCandidate) &&
    saleCandidate > 0 &&
    Number.isFinite(regularPrice) &&
    regularPrice > 0 &&
    saleCandidate < regularPrice;

  return {
    current: hasSale ? saleCandidate : regularPrice,
    original: hasSale ? regularPrice : null,
  };
};

const formatPrice = (value) => `AED ${Number(value || 0).toFixed(2)}`;

const buildMatchiBundlePriceMap = (items, bundleTotal) => {
  const preparedItems = Array.isArray(items) ? items : [];
  const targetTotal = Number(bundleTotal || 0);

  if (!preparedItems.length || targetTotal <= 0) {
    return new Map();
  }

  const baseTotal = preparedItems.reduce((sum, item) => {
    const pricing = getPricing(item?.selectedVariation || item?.product);
    return sum + Number(pricing?.current || 0);
  }, 0);

  if (baseTotal <= 0 || targetTotal >= baseTotal) {
    return new Map();
  }

  const priceMap = new Map();
  let allocated = 0;

  preparedItems.forEach((item, index) => {
    const pricing = getPricing(item?.selectedVariation || item?.product);
    const basePrice = Number(pricing?.current || 0);
    const isLast = index === preparedItems.length - 1;
    const allocatedPrice = isLast
      ? Number((targetTotal - allocated).toFixed(2))
      : Number(((basePrice / baseTotal) * targetTotal).toFixed(2));

    allocated += allocatedPrice;

    priceMap.set(item.key, {
      basePrice,
      customPrice: allocatedPrice,
    });
  });

  return priceMap;
};

const getMatchTypeLabel = (type, tx) =>
  type === "bag"
    ? tx("Bag", "Bag")
    : type === "shoes"
    ? tx("Shoes", "Shoes")
    : tx("Type", "Type");

const inferMatchTypeFromProduct = (product) => {
  const haystack = [
    product?.name,
    product?.name_ar,
    product?.slug,
    ...(product?.categories || []).flatMap((category) => [
      category?.name,
      category?.name_ar,
      category?.slug,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /(bag|handbag|clutch|wallet|purse|hobo|tote|satchel|crossbody|backpack|mini bag|حقائب|حقيبة)/.test(
      haystack
    )
  ) {
    return "bag";
  }

  if (
    /(shoe|shoes|heel|heels|slipper|slippers|sandal|sandals|boot|boots|flat|mule|loafer|sneaker|footwear|أحذية|حذاء|شبشب|صندل|بوت|كعب)/.test(
      haystack
    )
  ) {
    return "shoes";
  }

  return "";
};

const buildOrderedMatchiGroups = (items, pairImages) => {
  const pairImageMap = new Map(
    (Array.isArray(pairImages) ? pairImages : []).map((pairImage) => [
      [String(pairImage?.first_item_id || ""), String(pairImage?.second_item_id || "")]
        .sort()
        .join("::"),
      pairImage,
    ])
  );
  const groups = [];

  for (let index = 0; index < (Array.isArray(items) ? items.length : 0); index += 2) {
    const firstItem = items[index];
    const secondItem = items[index + 1];

    if (!firstItem || !secondItem) {
      continue;
    }

    const pairConfig =
      pairImageMap.get(
        [String(firstItem?.key || ""), String(secondItem?.key || "")].sort().join("::")
      ) || null;

    groups.push({
      id: pairConfig?.id || `matchi-group-${Math.floor(index / 2) + 1}`,
      firstItem,
      secondItem,
      pairConfig,
      hasValidTypes:
        [firstItem?.match_type, secondItem?.match_type].includes("bag") &&
        [firstItem?.match_type, secondItem?.match_type].includes("shoes"),
    });
  }

  return groups;
};

const getConfiguredItemImage = (product, item, isArabic) => {
  const colorName = getColorLabel(item, isArabic);
  const colorMedia = colorName
    ? getColorSpecificMedia(product, colorName, { strictGalleryMatch: false })
    : [];
  const media = colorMedia.length ? colorMedia : getFallbackMedia(product);
  return media?.[0]?.original_url || null;
};

const getSizeOptionsForItem = (product, item) => {
  const variations = product?.variations || product?.variants || [];
  const colorId = Number(item?.color_attribute_value_id || 0);
  const seen = new Set();

  return variations
    .filter((variation) => {
      if (!colorId) return false;

      return getVariantAttributeValues(variation).some(
        (attributeValue) => String(attributeValue?.id) === String(colorId)
      );
    })
    .filter((variation) => {
      const stockStatus = variation?.stock_status;
      const quantity = Number(
        variation?.quantity ?? variation?.stock_quantity ?? 0
      );
      const isEnabled =
        variation?.status !== false && variation?.is_active !== false;

      return isEnabled && stockStatus !== "out_of_stock" && quantity > 0;
    })
    .map((variation) => {
      const sizeAttribute = getVariationAttribute(variation, product, "size");
      if (!sizeAttribute?.id || seen.has(sizeAttribute.id)) return null;
      seen.add(sizeAttribute.id);

      return {
        id: Number(sizeAttribute.id),
        label: sizeAttribute?.value || "",
        variation,
      };
    })
    .filter(Boolean);
};

const buildMatchiQuickViewProduct = (product, item) => {
  if (!product) return null;

  const colorId = Number(item?.color_attribute_value_id || 0);
  const lockedColorName = item?.color_name || item?.color_name_ar || "";
  const lockedColorMedia = lockedColorName
    ? getColorSpecificMedia(product, lockedColorName, {
        strictGalleryMatch: false,
      })
    : [];
  const variations = (product?.variations || product?.variants || [])
    .filter((variation) =>
      colorId
        ? getVariantAttributeValues(variation).some(
            (attributeValue) => String(attributeValue?.id) === String(colorId)
          )
        : true
    )
    .map((variation) => {
      const nextAttributeValues = getVariantAttributeValues(variation).filter(
        (attributeValue) =>
          !matchesAttributeKey(attributeValue?.attribute, "color")
      );
      const quantity = Number(
        variation?.quantity ?? variation?.stock_quantity ?? 0
      );

      return {
        ...variation,
        status: variation?.status ?? variation?.is_active !== false,
        is_active: variation?.is_active ?? variation?.status !== false,
        quantity,
        stock_quantity: quantity,
        stock_status:
          variation?.stock_status || (quantity > 0 ? "in_stock" : "out_of_stock"),
        attribute_values: nextAttributeValues,
        attributeValues: nextAttributeValues,
      };
    });

  const availableSizeIds = Array.from(
    new Set(
      variations.flatMap((variation) =>
        getVariantAttributeValues(variation)
          .filter((attributeValue) =>
            matchesAttributeKey(attributeValue?.attribute, "size")
          )
          .map((attributeValue) => attributeValue?.id)
      )
    )
  );

  const preparedAttributes = (product?.attributes || [])
    .filter((attribute) => !matchesAttributeKey(attribute, "color"))
    .map((attribute) => {
      if (matchesAttributeKey(attribute, "size")) {
        return {
          ...attribute,
          attribute_values: (attribute?.attribute_values || []).filter((value) =>
            availableSizeIds.some((sizeId) => String(sizeId) === String(value?.id))
          ),
        };
      }

      return attribute;
    });

  return {
    ...product,
    attributes: preparedAttributes,
    variations,
    variants: variations,
    matchi_locked_media: lockedColorMedia.length
      ? lockedColorMedia
      : getFallbackMedia(product),
    matchi_locked_color_name: item?.color_name || "",
    matchi_locked_color_name_ar: item?.color_name_ar || "",
    matchi_locked_color_hex: item?.color_hex || "",
  };
};

const MatchiMatchiPage = () => {
  const { themeOption, isLoading: themeLoading, setCartCanvas } = useContext(ThemeOptionContext);
  const { t, i18n } = useTranslation("common");
  const [selectedVariantsByItemKey, setSelectedVariantsByItemKey] = useState({});
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isAddingPair, setIsAddingPair] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const addToCart = useCartState((state) => state.addToCart);

  const tx = (key, fallback) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const isArabic = (i18n.language || "").startsWith("ar");
  const config = themeOption?.matchi_matchi || {};
  const matchItems = useMemo(
    () => normalizeMatchiItems(config?.items, config?.product_ids),
    [config?.items, config?.product_ids]
  );
  const pairImages = useMemo(
    () => normalizeMatchiPairImages(config?.pair_images, matchItems),
    [config?.pair_images, matchItems]
  );
  const productIds = useMemo(
    () =>
      Array.from(
        new Set(matchItems.map((item) => Number(item?.product_id)).filter(Boolean))
      ),
    [matchItems]
  );

  const { data: productsResponse, isLoading: productsLoading } = useGetProducts(
    {
      ids: productIds.join(","),
      status: 1,
      paginate: Math.max(productIds.length, 1),
    },
    {
      enabled: productIds.length > 0,
      refetchOnWindowFocus: false,
    }
  );

  const rawProducts = getProductsFromResponse(productsResponse);
  const items = useMemo(
    () =>
      matchItems
        .map((item) => {
          const product = rawProducts.find(
            (entry) => Number(entry?.id) === Number(item?.product_id)
          );

          if (!product) return null;

          const inferredMatchType = inferMatchTypeFromProduct(product);
          const effectiveMatchType =
            inferredMatchType || (item?.match_type === "bag" || item?.match_type === "shoes"
              ? item.match_type
              : "");

          return {
            ...item,
            match_type: effectiveMatchType,
            configured_match_type: item?.match_type || "",
            product,
            preparedProduct: buildMatchiQuickViewProduct(product, item),
            sizeOptions: getSizeOptionsForItem(product, item),
            imageUrl: getConfiguredItemImage(product, item, isArabic),
          };
        })
        .filter(Boolean),
    [matchItems, rawProducts, isArabic]
  );

  useEffect(() => {
    setSelectedVariantsByItemKey((previous) =>
      {
        const next = {};
        const itemMap = new Map(items.map((item) => [item.key, item]));
        let hasChanges = false;

        Object.entries(previous).forEach(([key, variation]) => {
          const item = itemMap.get(key);
          if (
            item &&
            item.sizeOptions.some((sizeOption) => sizeOption?.variation?.id === variation?.id)
          ) {
            next[key] = variation;
          } else {
            hasChanges = true;
          }
        });

        items.forEach((item) => {
          if (!next[item.key] && item.sizeOptions.length === 1) {
            next[item.key] = item.sizeOptions[0].variation;
            hasChanges = true;
          }
        });

        if (
          !hasChanges &&
          Object.keys(previous).length === Object.keys(next).length
        ) {
          return previous;
        }

        return next;
      }
    );
  }, [items]);

  const pairGroups = useMemo(
    () => buildOrderedMatchiGroups(items, pairImages),
    [items, pairImages]
  );

  useEffect(() => {
    if (!pairGroups.length) {
      setActiveGroupId(null);
      return;
    }

    if (!pairGroups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(pairGroups[0].id);
    }
  }, [activeGroupId, pairGroups]);

  const getResolvedVariation = (item) => {
    if (!item) return null;
    return (
      selectedVariantsByItemKey[item.key] ||
      (item.sizeOptions.length === 1 ? item.sizeOptions[0].variation : null)
    );
  };

  const getGroupItems = (group) =>
    [group?.firstItem, group?.secondItem].filter(Boolean);

  const isGroupReady = (group) =>
    Boolean(group?.hasValidTypes) &&
    getGroupItems(group).every((item) =>
      item.sizeOptions.length ? Boolean(getResolvedVariation(item)) : true
    );

  const getGroupDisplayPricing = (group) => {
    const configuredOriginal = Number(group?.pairConfig?.original_price || 0);
    const configuredSale = Number(group?.pairConfig?.sale_price || 0);

    if (configuredSale > 0 && configuredOriginal > 0 && configuredSale < configuredOriginal) {
      return {
        current: configuredSale,
        original: configuredOriginal,
        isConfigured: true,
      };
    }

    if (configuredOriginal > 0) {
      return {
        current: configuredOriginal,
        original: null,
        isConfigured: true,
      };
    }

    return {
      current: getGroupItems(group).reduce(
        (sum, item) =>
          sum + Number(getPricing(getResolvedVariation(item) || item?.product).current || 0),
        0
      ),
      original: null,
      isConfigured: false,
    };
  };

  const activeGroup = useMemo(
    () => pairGroups.find((group) => group.id === activeGroupId) || null,
    [activeGroupId, pairGroups]
  );
  const activeGroupItems = useMemo(
    () =>
      getGroupItems(activeGroup).map((item) => ({
        ...item,
        selectedVariation: getResolvedVariation(item),
      })),
    [activeGroup, selectedVariantsByItemKey]
  );
  const activeGroupPricing = useMemo(
    () => getGroupDisplayPricing(activeGroup),
    [activeGroup, selectedVariantsByItemKey]
  );
  const pairTotal = useMemo(
    () => activeGroupPricing.current || 0,
    [activeGroupPricing]
  );
  const selectedPairImage = activeGroup?.pairConfig || null;
  const pairHeadline = readLocalized(
    isArabic,
    selectedPairImage?.title_ar,
    selectedPairImage?.title,
    tx("MatchiLookReady", "A complete look, ready to shop together")
  );
  const pairSummary = readLocalized(
    isArabic,
    selectedPairImage?.description_ar,
    selectedPairImage?.description,
    tx(
      "MatchiLookSummary",
      "We paired these two picks to give your outfit a stronger finish. Add both in one step or review each product before checkout."
    )
  );

  const pageTitle = readLocalized(
    isArabic,
    config?.title_ar,
    config?.title,
    tx("MatchiMatchi", "Matchi Matchi")
  );
  const pageSubtitle = readLocalized(
    isArabic,
    config?.subtitle_ar,
    config?.subtitle,
    tx("MatchiMatchiIntro", "Pick two favorites and preview the perfect pairing.")
  );
  const pageDescription = readLocalized(
    isArabic,
    config?.description_ar,
    config?.description,
    tx(
      "MatchiMatchiDescription",
      "Explore a curated selection and discover combinations that work beautifully together."
    )
  );

  useEffect(() => {
    if (!previewOpen) {
      setPreviewZoom(1);
    }
  }, [previewOpen, selectedPairImage?.preview_image_url]);

  const updateSelectedSize = (itemKey, variation) => {
    setSelectedVariantsByItemKey((previous) => ({
      ...previous,
      [itemKey]: variation,
    }));
  };

  const openGroupPreview = (group) => {
    if (!group?.hasValidTypes) {
      ToastNotification(
        "error",
        tx(
          "MatchiGroupTypeInvalid",
          "This Matchi group needs one bag and one shoes product in admin."
        )
      );
      return;
    }

    if (!isGroupReady(group)) {
      ToastNotification(
        "error",
        tx(
          "MatchiSelectPairSizesFirst",
          "Please choose the required sizes for both products before previewing this Matchi set."
        )
      );
      return;
    }

    setActiveGroupId(group.id);
    setPreviewOpen(true);
  };

  const addBothToCart = async () => {
    if (!activeGroup || activeGroupItems.length !== 2 || isAddingPair) return;

    setIsAddingPair(true);

    try {
      const bundlePriceMap = buildMatchiBundlePriceMap(
        activeGroupItems,
        activeGroupPricing?.isConfigured ? activeGroupPricing.current : 0
      );
      const bundleKey =
        selectedPairImage?.id || activeGroup?.id || `matchi-bundle-${Date.now()}`;

      activeGroupItems.forEach((item) => {
        const bundlePricing = bundlePriceMap.get(item.key);

        addToCart(item.product, 1, item.selectedVariation, {
          matchi_bundle_key: bundleKey,
          matchi_bundle_sale_total: activeGroupPricing?.isConfigured
            ? activeGroupPricing.current
            : null,
          matchi_bundle_original_total: activeGroupPricing?.original || null,
          matchi_pair_id: selectedPairImage?.id || activeGroup?.id || null,
          custom_price: bundlePricing?.customPrice || null,
        });
      });

      setCartCanvas?.(true);
      setPreviewOpen(false);
      ToastNotification(
        "success",
        tx("MatchiPairAdded", "Your matching pair has been added to cart.")
      );
    } catch (error) {
      ToastNotification(
        "error",
        tx("MatchiPairAddFailed", "Unable to add the selected pair right now.")
      );
    } finally {
      setIsAddingPair(false);
    }
  };

  const zoomInPreview = () => {
    setPreviewZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))));
  };

  const zoomOutPreview = () => {
    setPreviewZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))));
  };

  const resetPreviewZoom = () => {
    setPreviewZoom(1);
  };

  if (themeLoading || (productIds.length > 0 && productsLoading)) {
      return <Loader />;
  }

  return (
    <>
      <Breadcrumbs title={pageTitle} subNavigation={[{ name: pageTitle }]} />
      <section className={`section-b-space ${styles.pageSection}`}>
        <div className="container">
          <div className={styles.heroCard}>
            <div className={styles.heroEyebrow}>{tx("MatchiMatchi", "Matchi Matchi")}</div>
            <h1 className={styles.heroTitle}>{pageTitle}</h1>
            <p className={styles.heroSubtitle}>{pageSubtitle}</p>
            <p className={styles.heroDescription}>{pageDescription}</p>
          </div>

          {!config?.enabled || pairGroups.length < 1 ? (
            <div className={styles.emptyState}>
              <h3 className="mb-3">
                {tx("MatchiMatchiUnavailable", "Matchi Matchi is not available right now.")}
              </h3>
              <p className="text-muted mb-0">
                {tx(
                  "MatchiMatchiUnavailableDesc",
                  "We’re preparing new pairings for this page. Please check back soon."
                )}
              </p>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {pairGroups.map((group, groupIndex) => {
                  const groupPricing = getGroupDisplayPricing(group);
                  const groupItems = getGroupItems(group);
                  const isActiveGroup = activeGroupId === group.id;
                  const groupTitle = readLocalized(
                    isArabic,
                    group?.pairConfig?.title_ar,
                    group?.pairConfig?.title,
                    tx("MatchiLookReady", "A complete look, ready to shop together")
                  );
                  const groupSummary = readLocalized(
                    isArabic,
                    group?.pairConfig?.description_ar,
                    group?.pairConfig?.description,
                    tx(
                      "MatchiLookSummary",
                      "We paired these two picks to give your outfit a stronger finish. Add both in one step or review each product before checkout."
                    )
                  );

                  return (
                    <article
                      className={`${styles.card} ${isActiveGroup ? styles.groupCardActive : ""}`}
                      key={group.id}
                    >
                      <div className={styles.cardImageWrap}>
                        <div className={styles.cardImageGrid}>
                          {groupItems.map((item) => {
                            const itemName = getProductName(item.product, isArabic);
                            const itemColor = getColorLabel(item, isArabic);

                            return (
                              <div className={styles.cardImageTile} key={item.key}>
                                <div className={styles.cardImageTileMedia}>
                                  {item.imageUrl ? (
                                    <Image
                                      src={item.imageUrl}
                                      alt={`${itemName}${itemColor ? ` - ${itemColor}` : ""}`}
                                      fill
                                      sizes="(max-width: 767px) 50vw, 180px"
                                      className={styles.cardImage}
                                    />
                                  ) : (
                                    <div className={styles.placeholderText}>
                                      {tx("NoImage", "No image")}
                                    </div>
                                  )}
                                </div>
                                <div className={styles.cardImageTileMeta}>
                                  <span className={styles.itemTypeBadge}>
                                    {getMatchTypeLabel(item.match_type, tx)}
                                  </span>
                                  {itemColor ? (
                                    <span className={styles.cardImageTileColor}>{itemColor}</span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className={styles.cardBody}>
                        <div className={styles.selectionLabel}>
                          {tx("MatchiPair", "Matchi Pair")} #{groupIndex + 1}
                        </div>
                        <h3 className={styles.cardTitle}>{groupTitle}</h3>

                        <p className={styles.selectionHint}>{groupSummary}</p>

                        <div className={styles.priceRow}>
                          <span className={styles.currentPrice}>
                            {formatPrice(groupPricing.current)}
                          </span>
                          {groupPricing.original ? (
                            <span className={styles.oldPrice}>
                              {formatPrice(groupPricing.original)}
                            </span>
                          ) : null}
                        </div>

                        <div className={styles.pairItemsList}>
                          {groupItems.map((item) => {
                            const selectedVariation = getResolvedVariation(item);

                            return (
                              <div className={styles.pairItemCard} key={item.key}>
                                <div className={styles.pairItemTop}>
                                  <div className={styles.pairItemName}>
                                    {getProductName(item.product, isArabic)}
                                  </div>
                                  <div className={styles.itemColorRow}>
                                    <span className={styles.itemTypeBadge}>
                                      {getMatchTypeLabel(item.match_type, tx)}
                                    </span>
                                    <span className={styles.itemColorValue}>
                                      {getColorLabel(item, isArabic)}
                                    </span>
                                  </div>
                                </div>
                                <div className={styles.sizePickerWrap}>
                                  <div className={styles.sizePickerLabel}>
                                    {tx("Size", "Size")}
                                  </div>
                                  <div className={styles.sizePickerGrid}>
                                    {item.sizeOptions.map((sizeOption) => (
                                      <button
                                        type="button"
                                        key={sizeOption.id}
                                        className={`${styles.sizePill} ${
                                          selectedVariation?.id === sizeOption?.variation?.id
                                            ? styles.sizePillActive
                                            : ""
                                        }`}
                                        onClick={() =>
                                          updateSelectedSize(item.key, sizeOption.variation)
                                        }
                                      >
                                        {sizeOption.label}
                                      </button>
                                    ))}
                                  </div>
                                  {!selectedVariation ? (
                                    <div className={styles.sizeHint}>
                                      {tx(
                                        "MatchiSelectSizeFirst",
                                        "Select a size before continuing with this Matchi pair."
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {!group.hasValidTypes ? (
                          <div className={styles.sizeHint}>
                            {tx(
                              "MatchiGroupTypeInvalid",
                              "This Matchi group needs one bag and one shoes product in admin."
                            )}
                          </div>
                        ) : null}

                        <div className={styles.cardActions}>
                          <button
                            type="button"
                            className={`${styles.cardButton} ${isActiveGroup ? styles.cardButtonActive : ""}`}
                            onClick={() => openGroupPreview(group)}
                            disabled={!group.hasValidTypes || !isGroupReady(group)}
                          >
                            {isActiveGroup
                              ? tx("PreviewMatch", "Preview Match")
                              : tx("SelectMatchiGroup", "Select Matchi Set")}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      <Modal
        isOpen={previewOpen}
        toggle={() => setPreviewOpen(false)}
        centered
        className={styles.previewModal}
        contentClassName={styles.previewModalContent}
      >
        <ModalBody className={styles.previewBody}>
          <div className={styles.previewHeader}>
            <div>
              <h3 className={styles.previewTitle}>
                {tx("PreviewMatch", "Preview Match")}
              </h3>
              <p className={styles.previewText}>
                {tx(
                  "PreviewMatchHint",
                  "Here is how your selected pair looks together."
                )}
              </p>
            </div>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => setPreviewOpen(false)}
            >
              {tx("Close", "Close")}
            </button>
          </div>

          <div className={styles.previewShowcase}>
            <div className={styles.previewVisualCard}>
              <div className={styles.previewBadge}>
                {tx("StyledTogether", "Styled Together")}
              </div>
              {selectedPairImage?.preview_image_url ? (
                <div className={styles.previewZoomTools}>
                  <button
                    type="button"
                    className={styles.previewZoomButton}
                    onClick={zoomOutPreview}
                    disabled={previewZoom <= 1}
                    aria-label={tx("ZoomOut", "Zoom out")}
                    title={tx("ZoomOut", "Zoom out")}
                  >
                    <RiSubtractLine />
                  </button>
                  <div className={styles.previewZoomLevel}>
                    {Math.round(previewZoom * 100)}%
                  </div>
                  <button
                    type="button"
                    className={styles.previewZoomButton}
                    onClick={zoomInPreview}
                    disabled={previewZoom >= 3}
                    aria-label={tx("ZoomIn", "Zoom in")}
                    title={tx("ZoomIn", "Zoom in")}
                  >
                    <RiAddLine />
                  </button>
                  <button
                    type="button"
                    className={`${styles.previewZoomButton} ${styles.previewZoomReset}`}
                    onClick={resetPreviewZoom}
                    disabled={previewZoom === 1}
                    aria-label={tx("ResetZoom", "Reset zoom")}
                    title={tx("ResetZoom", "Reset zoom")}
                  >
                    <RiRestartLine />
                  </button>
                </div>
              ) : null}
              <div className={styles.previewImageStage}>
                <div className={styles.previewSceneGlow} />
                <div className={styles.previewSceneArch} />
                <div className={styles.previewSceneFloor} />
                {selectedPairImage?.preview_image_url ? (
                  <div className={styles.previewPairImageWrap}>
                    <Image
                      src={selectedPairImage.preview_image_url}
                      alt={tx("StyledPairPreview", "Styled pair preview")}
                      fill
                      sizes="(max-width: 991px) 80vw, 520px"
                      className={styles.previewPairImage}
                      style={{ transform: `scale(${previewZoom})` }}
                      priority={false}
                    />
                  </div>
                ) : (
                  <div className={styles.previewPairMissingWrap}>
                    <div className={styles.previewPairMissingTitle}>
                      {tx("StyledPreviewUnavailable", "Styled preview image not available")}
                    </div>
                    <div className={styles.previewPairMissingText}>
                      {tx(
                        "StyledPreviewUnavailableHint",
                        "This exact bag and shoes combination does not have an uploaded styled image yet."
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.previewDetailCard}>
              <div className={styles.previewCopyBlock}>
                <div className={styles.previewKicker}>
                  {tx("PairRecommendation", "Curated Pair Recommendation")}
                </div>
                <h4 className={styles.previewHeadline}>
                  {pairHeadline}
                </h4>
                <p className={styles.previewSummary}>
                  {pairSummary}
                </p>
              </div>

              <div className={styles.previewProductsList}>
                {activeGroupItems.map((item) => {
                  const pricing = getPricing(item?.selectedVariation || item?.product);
                  const selectedSize =
                    getVariationAttribute(item?.selectedVariation, item?.product, "size")
                      ?.value || "";

                  return (
                    <div className={styles.previewProductRow} key={item.key}>
                      <div className={styles.previewProductText}>
                        <div className={styles.previewName}>
                          {getProductName(item.product, isArabic)}
                        </div>
                        <div className={styles.previewColorLine}>
                          {getColorLabel(item, isArabic)}
                          {selectedSize ? ` • ${selectedSize}` : ""}
                        </div>
                        <div className={styles.priceRow}>
                          <span className={styles.currentPrice}>
                            {formatPrice(pricing.current)}
                          </span>
                          {pricing.original ? (
                            <span className={styles.oldPrice}>
                              {formatPrice(pricing.original)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.previewFooter}>
                <div className={styles.previewTotalWrap}>
                  <span className={styles.previewTotalLabel}>
                    {tx("PairTotal", "Pair Total")}
                  </span>
                  {activeGroupPricing.original ? (
                    <span className={styles.oldPrice}>
                      {formatPrice(activeGroupPricing.original)}
                    </span>
                  ) : null}
                  <span className={styles.previewTotalValue}>
                    {formatPrice(pairTotal)}
                  </span>
                </div>
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.previewAddButton}`}
                  onClick={addBothToCart}
                  disabled={isAddingPair}
                >
                  {isAddingPair
                    ? tx("Adding", "Adding...")
                    : tx("AddBothToCart", "Add Both To Cart")}
                </button>
              </div>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default MatchiMatchiPage;
