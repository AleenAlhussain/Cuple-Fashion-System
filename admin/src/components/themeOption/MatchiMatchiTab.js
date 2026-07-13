"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  FormGroup,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import Image from "next/image";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiSearchLine,
} from "react-icons/ri";
import request from "../../utils/axiosUtils";
import MediaPickerField from "../inputFields/MediaPickerField";

const PRODUCT_API = "/product";
const MAX_MATCHI_PRODUCTS = 24;

const getProductsFromResponse = (response) =>
  response?.data?.data?.data || response?.data?.data || [];

const getProductDetailFromResponse = (response) => response?.data?.data || null;

const normalizeMatchiItems = (items, legacyProductIds = []) => {
  const sourceItems = Array.isArray(items) ? items : legacyProductIds;
  const seenProductIds = new Set();

  return (Array.isArray(sourceItems) ? sourceItems : [])
    .map((item, index) => {
      const isPrimitive = typeof item === "number" || typeof item === "string";
      const productId = Number(
        isPrimitive ? item : item?.product_id ?? item?.productId ?? item?.id
      );

      if (!Number.isInteger(productId) || productId <= 0 || seenProductIds.has(productId)) {
        return null;
      }

      seenProductIds.add(productId);

      return {
        id: isPrimitive ? `matchi-${productId}-${index + 1}` : item?.id || `matchi-${productId}-${index + 1}`,
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
          : item?.color_attribute_value_id ?? item?.colorAttributeValueId ?? null,
        color_name: isPrimitive ? "" : item?.color_name ?? item?.color ?? "",
        color_name_ar: isPrimitive ? "" : item?.color_name_ar ?? item?.colorAr ?? "",
        color_hex: isPrimitive ? "" : item?.color_hex ?? item?.color_code ?? "",
        overlay_image_id: isPrimitive ? null : item?.overlay_image_id ?? item?.overlayImageId ?? null,
        overlay_image_url: isPrimitive ? "" : item?.overlay_image_url ?? item?.overlayImageUrl ?? "",
        preview_zone: isPrimitive ? "auto" : item?.preview_zone ?? item?.previewZone ?? "auto",
        overlay_scale: isPrimitive ? 100 : Number(item?.overlay_scale ?? item?.overlayScale ?? 100) || 100,
        overlay_offset_x: isPrimitive ? 0 : Number(item?.overlay_offset_x ?? item?.overlayOffsetX ?? 0) || 0,
        overlay_offset_y: isPrimitive ? 0 : Number(item?.overlay_offset_y ?? item?.overlayOffsetY ?? 0) || 0,
        overlay_rotation: isPrimitive ? 0 : Number(item?.overlay_rotation ?? item?.overlayRotation ?? 0) || 0,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_MATCHI_PRODUCTS);
};

const normalizeMatchiPairImages = (pairImages, availableItems = []) => {
  const validItemIds = new Set(
    (Array.isArray(availableItems) ? availableItems : []).map((item) => String(item?.id))
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
        (item) => String(item?.id) === firstItemId
      );
      const secondItem = (Array.isArray(availableItems) ? availableItems : []).find(
        (item) => String(item?.id) === secondItemId
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

const buildRequiredPairImages = (availableItems = [], existingPairImages = []) => {
  const existingMap = new Map(
    (Array.isArray(existingPairImages) ? existingPairImages : []).map((pairImage) => [
      [String(pairImage?.first_item_id || ""), String(pairImage?.second_item_id || "")]
        .sort()
        .join("::"),
      pairImage,
    ])
  );

  const groups = [];
  for (let index = 0; index < availableItems.length; index += 2) {
    const firstItem = availableItems[index];
    const secondItem = availableItems[index + 1];

    if (!firstItem || !secondItem) {
      continue;
    }

    const signature = [String(firstItem.id), String(secondItem.id)].sort().join("::");
    const existing = existingMap.get(signature) || null;

    groups.push({
      id: existing?.id || `matchi-pair-${Math.floor(index / 2) + 1}`,
      first_item_id: String(firstItem.id),
      second_item_id: String(secondItem.id),
      preview_image_id: existing?.preview_image_id ?? null,
      preview_image_url: existing?.preview_image_url || "",
      title: existing?.title || "",
      title_ar: existing?.title_ar ?? existing?.titleAr ?? "",
      description: existing?.description || "",
      description_ar:
        existing?.description_ar ?? existing?.descriptionAr ?? "",
      original_price:
        existing?.original_price ?? existing?.originalPrice ?? "",
      sale_price:
        existing?.sale_price ?? existing?.salePrice ?? "",
    });
  }

  return groups;
};

const getProductLabel = (product) =>
  product?.sku
    ? `${product.sku} - ${product?.name || `#${product.id}`}`
    : product?.name || `#${product.id}`;

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

const getVariantAttributeValues = (variant) =>
  variant?.attribute_values || variant?.attributeValues || [];

const matchesAttribute = (attribute, key) => {
  const slug = attribute?.slug?.toLowerCase?.() || "";
  const name = attribute?.name?.toLowerCase?.() || "";
  return slug === key || name === key;
};

const extractColorOptions = (product) => {
  const seen = new Set();
  const variants = product?.variants || product?.variations || [];

  return variants
    .flatMap((variant) => getVariantAttributeValues(variant))
    .filter((attributeValue) => matchesAttribute(attributeValue?.attribute, "color"))
    .filter((attributeValue) => {
      if (!attributeValue?.id || seen.has(attributeValue.id)) return false;
      seen.add(attributeValue.id);
      return true;
    })
    .map((attributeValue) => ({
      id: Number(attributeValue.id),
      name: attributeValue?.value || "",
      name_ar: attributeValue?.value_ar || "",
      color_hex: attributeValue?.color_code || attributeValue?.hex_color || "",
    }));
};

const getMediaUrl = (media) => {
  if (!media) return "";
  if (typeof media === "string") return media;

  return (
    media?.original_url ||
    media?.url ||
    media?.image_url ||
    media?.thumbnail_url ||
    media?.path ||
    ""
  );
};

const getSelectedColorPreviewImage = (product, item) => {
  if (!product || !item) return "";

  const colorId = Number(item?.color_attribute_value_id || 0);
  const colorName = String(item?.color_name || "").toLowerCase();
  const variants = product?.variants || product?.variations || [];
  const images = product?.images || product?.product_galleries || [];

  if (colorId) {
    const variantWithImage = variants.find((variant) => {
      const matchesColor = getVariantAttributeValues(variant).some(
        (attributeValue) => String(attributeValue?.id) === String(colorId)
      );

      if (!matchesColor) return false;

      return Boolean(
        getMediaUrl(variant?.variation_image) ||
          variant?.image_url ||
          variant?.thumbnail_url ||
          variant?.image
      );
    });

    const variantImage =
      getMediaUrl(variantWithImage?.variation_image) ||
      variantWithImage?.image_url ||
      variantWithImage?.thumbnail_url ||
      variantWithImage?.image ||
      "";

    if (variantImage) {
      return variantImage;
    }
  }

  if (colorName) {
    const galleryMatch = images.find((image) => {
      const haystack = [
        image?.image_url,
        image?.thumbnail_url,
        image?.original_url,
        image?.image,
        image?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(colorName);
    });

    const galleryImage = getMediaUrl(galleryMatch);
    if (galleryImage) {
      return galleryImage;
    }
  }

  return (
    getMediaUrl(product?.product_thumbnail) ||
    product?.default_image_url ||
    product?.primary_image ||
    ""
  );
};


const ProductSelectionSection = ({
  selectedItems,
  pairImages,
  onChange,
  onPairImagesChange,
  router,
  tx,
}) => {
  const searchTimer = useRef(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productDetailsMap, setProductDetailsMap] = useState({});
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const selectedProductIds = useMemo(
    () => selectedItems.map((item) => Number(item?.product_id)).filter(Boolean),
    [selectedItems]
  );
  const selectedKey = selectedItems
    .map(
      (item) =>
        `${item?.id}:${item?.product_id}:${item?.color_attribute_value_id || ""}:${item?.match_type || ""}`
    )
    .join(",");

  useEffect(() => {
    let isMounted = true;

    const loadSelectedProducts = async () => {
      if (!selectedProductIds.length) {
        setSelectedProducts([]);
        return;
      }

      setLoadingSelected(true);
      try {
        const response = await request(
          {
            url: PRODUCT_API,
            params: { ids: selectedProductIds.join(","), paginate: MAX_MATCHI_PRODUCTS },
          },
          router
        );
        const products = getProductsFromResponse(response);
        const orderedProducts = selectedProductIds
          .map((id) => products.find((product) => Number(product?.id) === Number(id)))
          .filter(Boolean);

        if (isMounted) {
          setSelectedProducts(orderedProducts);
        }

        const detailEntries = await Promise.all(
          selectedProductIds.map(async (productId) => {
            try {
              const detailResponse = await request(
                { url: `${PRODUCT_API}/${productId}` },
                router
              );
              return [productId, getProductDetailFromResponse(detailResponse)];
            } catch (error) {
              return [productId, null];
            }
          })
        );

        if (isMounted) {
          setProductDetailsMap((prev) => ({
            ...prev,
            ...Object.fromEntries(detailEntries.filter(([, product]) => product)),
          }));
        }
      } catch (error) {
        if (isMounted) {
          setSelectedProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoadingSelected(false);
        }
      }
    };

    loadSelectedProducts();

    return () => {
      isMounted = false;
    };
  }, [router, selectedProductIds, selectedKey]);

  useEffect(() => {
    let hasChanges = false;

    const nextItems = selectedItems.map((item) => {
      const product =
        productDetailsMap[item?.product_id] ||
        selectedProducts.find(
          (entry) => Number(entry?.id) === Number(item?.product_id)
        ) ||
        null;
      const inferredMatchType = inferMatchTypeFromProduct(product);

      if (!inferredMatchType || inferredMatchType === item?.match_type) {
        return item;
      }

      hasChanges = true;

      return {
        ...item,
        match_type: inferredMatchType,
      };
    });

    if (hasChanges) {
      onChange(nextItems);
    }
  }, [onChange, productDetailsMap, selectedItems, selectedProducts]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  const handleSearchChange = (query) => {
    setProductSearch(query);

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await request(
          {
            url: PRODUCT_API,
            params: { search: trimmedQuery, paginate: 10, status: 1 },
          },
          router
        );
        const products = getProductsFromResponse(response);
        const filteredProducts = products.filter(
          (product) => !selectedProductIds.includes(Number(product?.id))
        );
        setSearchResults(filteredProducts);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const addProduct = (product) => {
    if (!product?.id || selectedItems.length >= MAX_MATCHI_PRODUCTS) return;

    const nextItems = [
      ...selectedItems,
      {
        id: `matchi-${product.id}-${Date.now()}`,
        product_id: Number(product.id),
        match_type: "",
        color_attribute_value_id: null,
        color_name: "",
        color_name_ar: "",
        color_hex: "",
      },
    ];
    onChange(nextItems);
    setSelectedProducts((prev) => [...prev, product]);
    setSearchResults([]);
    setProductSearch("");
  };

  const removeProduct = (itemId) => {
    const nextItems = selectedItems.filter((item) => item?.id !== itemId);
    onChange(nextItems);
    setSelectedProducts((prev) =>
      prev.filter((product) =>
        nextItems.some((item) => Number(item?.product_id) === Number(product?.id))
      )
    );
  };

  const moveProduct = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedItems.length) return;

    const nextItems = [...selectedItems];
    [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    onChange(nextItems);
  };

  const clearSelection = () => {
    onChange([]);
    setSelectedProducts([]);
    setSearchResults([]);
    setProductSearch("");
  };

  const updateItemColor = (itemId, colorOption) => {
    const nextItems = selectedItems.map((item) =>
      item?.id === itemId
        ? {
            ...item,
            color_attribute_value_id: colorOption?.id || null,
            color_name: colorOption?.name || "",
            color_name_ar: colorOption?.name_ar || "",
            color_hex: colorOption?.color_hex || "",
          }
        : item
    );

    onChange(nextItems);
  };

  const updateItemMatchType = (itemId, matchType) => {
    const nextItems = selectedItems.map((item) =>
      item?.id === itemId
        ? {
            ...item,
            match_type: matchType === "bag" || matchType === "shoes" ? matchType : "",
          }
        : item
    );

    onChange(nextItems);
  };

  const itemLookup = useMemo(
    () =>
      new Map(
        selectedItems.map((item) => {
          const product =
            productDetailsMap[item?.product_id] ||
            selectedProducts.find(
              (entry) => Number(entry?.id) === Number(item?.product_id)
            ) ||
            null;

          return [
            String(item?.id),
            {
              item,
              product,
              previewImage: getSelectedColorPreviewImage(product, item),
            },
          ];
        })
      ),
    [productDetailsMap, selectedItems, selectedProducts]
  );
  const requiredPairImages = useMemo(
    () => buildRequiredPairImages(selectedItems, pairImages),
    [pairImages, selectedItems]
  );
  const pairGroups = useMemo(
    () =>
      requiredPairImages.map((pairImage) => {
        const firstItemData = itemLookup.get(String(pairImage?.first_item_id)) || null;
        const secondItemData = itemLookup.get(String(pairImage?.second_item_id)) || null;
        const firstType = firstItemData?.item?.match_type || "";
        const secondType = secondItemData?.item?.match_type || "";
        const hasColorSelection =
          Boolean(firstItemData?.item?.color_attribute_value_id) &&
          Boolean(secondItemData?.item?.color_attribute_value_id);
        const hasValidTypes =
          [firstType, secondType].includes("bag") &&
          [firstType, secondType].includes("shoes");

        return {
          pairImage,
          firstItemData,
          secondItemData,
          hasColorSelection,
          hasValidTypes,
        };
      }),
    [itemLookup, requiredPairImages]
  );
  const totalPossiblePairs = pairGroups.length;
  const completedPairCount = useMemo(
    () =>
      pairGroups.filter(
        ({ pairImage }) => pairImage?.preview_image_id || pairImage?.preview_image_url
      ).length,
    [pairGroups]
  );
  const serializePairImages = (list) =>
    JSON.stringify(
      (Array.isArray(list) ? list : []).map((pairImage) => ({
        id: String(pairImage?.id || ""),
        first_item_id: String(pairImage?.first_item_id || ""),
        second_item_id: String(pairImage?.second_item_id || ""),
        preview_image_id: pairImage?.preview_image_id || null,
        preview_image_url: pairImage?.preview_image_url || "",
      }))
    );

  useEffect(() => {
    if (serializePairImages(requiredPairImages) !== serializePairImages(pairImages)) {
      onPairImagesChange(requiredPairImages);
    }
  }, [pairImages, requiredPairImages, onPairImagesChange]);

  const updatePairImage = (pairImageId, patch) => {
    const nextPairImages = normalizeMatchiPairImages(
      requiredPairImages.map((pairImage) =>
        pairImage?.id === pairImageId
          ? {
              ...pairImage,
              ...patch,
            }
          : pairImage
      ),
      selectedItems
    );

    onPairImagesChange(nextPairImages);
  };

  const hasOddItemCount = selectedItems.length % 2 !== 0;

  return (
    <Card>
      <CardHeader>
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <div>
            <h5 className="mb-1">{tx("MatchiMatchiProducts", "Curated Matchi Matchi Products")}</h5>
            <p className="text-muted mb-0">
              {tx(
                "MatchiMatchiProductsHelper",
                "Choose the products in order. Every two items become one Matchi pair group with one shared image and one shared special price."
              )}
            </p>
          </div>
          <Badge color={selectedItems.length ? "primary" : "secondary"} pill>
            {selectedItems.length}/{MAX_MATCHI_PRODUCTS}
          </Badge>
        </div>
      </CardHeader>
      <CardBody>
        <FormGroup className="mb-3">
          <Label className="form-label">{tx("SearchProducts", "Search Products")}</Label>
          <div className="position-relative">
            <Input
              type="text"
              value={productSearch}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={tx("SearchProductsPlaceholder", "Search by product name or SKU")}
              disabled={selectedItems.length >= MAX_MATCHI_PRODUCTS}
            />
            <RiSearchLine
              size={18}
              className="text-muted position-absolute"
              style={{ top: "50%", insetInlineEnd: "12px", transform: "translateY(-50%)" }}
            />
          </div>
          {selectedItems.length >= MAX_MATCHI_PRODUCTS ? (
            <div className="text-muted small mt-2">
              {tx(
                "MatchiMatchiMaxReached",
                "Maximum 24 products selected. Remove one to add another."
              )}
            </div>
          ) : null}
        </FormGroup>

        {(searching || searchResults.length > 0) && (
          <Card className="mb-4 border">
            <CardBody className="py-2">
              {searching ? (
                <div className="d-flex align-items-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span>{tx("SearchingProducts", "Searching products...")}</span>
                </div>
              ) : (
                searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="d-flex align-items-center justify-content-between gap-3 py-2 border-bottom"
                  >
                    <div className="min-w-0">
                      <div className="fw-semibold text-break">{getProductLabel(product)}</div>
                      <div className="text-muted small">#{product.id}</div>
                    </div>
                    <Button color="primary" size="sm" onClick={() => addProduct(product)}>
                      {tx("AddProduct", "Add")}
                    </Button>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        )}

        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="mb-0">{tx("SelectedProducts", "Selected Products")}</h6>
          {selectedItems.length > 0 ? (
            <Button color="outline-danger" size="sm" onClick={clearSelection}>
              <RiCloseLine className="me-1" />
              {tx("ClearSelection", "Clear Selection")}
            </Button>
          ) : null}
        </div>

        {loadingSelected ? (
          <div className="d-flex align-items-center gap-2 py-3">
            <Spinner size="sm" />
            <span>{tx("LoadingSelectedProducts", "Loading selected products...")}</span>
          </div>
        ) : selectedItems.length > 0 ? (
          <>
            <div className="border rounded overflow-hidden">
              {selectedItems.map((item, index) => {
                const product = selectedProducts.find(
                  (entry) => Number(entry?.id) === Number(item?.product_id)
                );
                const productDetail = productDetailsMap[item?.product_id];
                const colorOptions = extractColorOptions(productDetail);
                const selectedColorId = Number(item?.color_attribute_value_id || 0);
                const selectedType = item?.match_type || "";

                return (
                  <div key={item?.id} className="p-3 border-bottom">
                    <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                      <div className="d-flex align-items-start gap-3 min-w-0">
                        <Badge color="light" className="text-dark mt-1">
                          {index + 1}
                        </Badge>
                        <div className="min-w-0">
                          <div className="fw-semibold text-break">
                            {product ? getProductLabel(product) : `#${item?.product_id}`}
                          </div>
                          <div className="text-muted small">#{item?.product_id}</div>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <Button
                          color="light"
                          size="sm"
                          onClick={() => moveProduct(index, -1)}
                          disabled={index === 0}
                        >
                          <RiArrowUpLine />
                        </Button>
                        <Button
                          color="light"
                          size="sm"
                          onClick={() => moveProduct(index, 1)}
                          disabled={index === selectedItems.length - 1}
                        >
                          <RiArrowDownLine />
                        </Button>
                        <Button
                          color="outline-danger"
                          size="sm"
                          onClick={() => removeProduct(item?.id)}
                        >
                          <RiDeleteBin6Line />
                        </Button>
                      </div>
                    </div>

                    <Row className="g-3 mt-1">
                      <Col md="6">
                        <Label className="form-label mb-1">
                          {tx("MatchiColor", "Selected Color")}
                        </Label>
                        <Input
                          type="select"
                          value={selectedColorId || ""}
                          onChange={(event) => {
                            const nextColorId = Number(event.target.value || 0);
                            const colorOption = colorOptions.find(
                              (option) => Number(option?.id) === nextColorId
                            );
                            updateItemColor(item?.id, colorOption || null);
                          }}
                          disabled={!productDetail}
                        >
                          <option value="">{tx("SelectColor", "Select color")}</option>
                          {colorOptions.map((colorOption) => (
                            <option key={colorOption.id} value={colorOption.id}>
                              {colorOption.name}
                            </option>
                          ))}
                        </Input>

                        {!productDetail ? (
                          <div className="text-muted small mt-2">
                            {tx("LoadingProductColors", "Loading available colors...")}
                          </div>
                        ) : colorOptions.length === 0 ? (
                          <div className="text-danger small mt-2">
                            {tx(
                              "NoVariantColorsFound",
                              "No variant colors found for this product. Please choose another product."
                            )}
                          </div>
                        ) : !selectedColorId ? (
                          <div className="text-warning small mt-2">
                            {tx(
                              "MatchiColorRequired",
                              "Choose the color that customers should use for this Matchi item."
                            )}
                          </div>
                        ) : null}
                      </Col>

                      <Col md="6">
                        <Label className="form-label mb-1">
                          {tx("MatchiType", "Type")}
                        </Label>
                        <Input
                          type="select"
                          value={selectedType}
                          onChange={(event) =>
                            updateItemMatchType(item?.id, event.target.value)
                          }
                        >
                          <option value="">{tx("SelectType", "Select type")}</option>
                          <option value="bag">{tx("Bag", "Bag")}</option>
                          <option value="shoes">{tx("Shoes", "Shoes")}</option>
                        </Input>
                        {!selectedType ? (
                          <div className="text-warning small mt-2">
                            {tx(
                              "MatchiTypeRequired",
                              "Choose whether this item is a bag or shoes."
                            )}
                          </div>
                        ) : (
                          <div className="text-muted small mt-2">
                            {tx(
                              "MatchiTypeHelper",
                              "Customers will only be allowed to pick one bag and one shoes item."
                            )}
                          </div>
                        )}
                      </Col>
                    </Row>

                    {(selectedColorId || selectedType) ? (
                      <div className="d-flex align-items-center gap-2 flex-wrap mt-3">
                        {selectedColorId ? (
                          <>
                            <Badge color="light" className="text-dark">
                              {tx("Color", "Color")}:{" "}
                              {item?.color_name || tx("Selected", "Selected")}
                            </Badge>
                            {item?.color_hex ? (
                              <span
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  borderRadius: "999px",
                                  backgroundColor: item.color_hex,
                                  border: "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                }}
                              />
                            ) : null}
                          </>
                        ) : null}
                        {selectedType ? (
                          <Badge color="secondary">
                            {tx("Type", "Type")}:{" "}
                            {selectedType === "bag" ? tx("Bag", "Bag") : tx("Shoes", "Shoes")}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <Card className="mt-4 border">
              <CardHeader>
                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                  <div>
                    <h6 className="mb-1">{tx("MatchiStyledPairImages", "Styled Pair Images")}</h6>
                    <p className="text-muted mb-0">
                      {tx(
                        "MatchiStyledPairImagesHelper",
                        "The panel groups products by order: item 1 + 2, item 3 + 4, and so on. Upload one final styled image and optional special pricing for each pair."
                      )}
                    </p>
                  </div>
                  <Badge color={totalPossiblePairs ? "primary" : "secondary"} pill>
                    {completedPairCount}/{totalPossiblePairs}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                {hasOddItemCount ? (
                  <div className="text-warning small mb-3">
                    {tx(
                      "MatchiPairNeedsTwoItems",
                      "Each Matchi group needs exactly two products. Add one more item or remove the extra one before saving."
                    )}
                  </div>
                ) : null}

                {!totalPossiblePairs ? (
                  <div className="text-warning small mb-3">
                    {tx(
                      "StyledPairNeedsTwoProducts",
                      "Add at least two products to create the first Matchi pair group."
                    )}
                  </div>
                ) : null}

                {pairGroups.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {pairGroups.map(
                      (
                        {
                          pairImage,
                          firstItemData,
                          secondItemData,
                          hasColorSelection,
                          hasValidTypes,
                        },
                        pairIndex
                      ) => {
                      const firstLabel = firstItemData?.product
                        ? getProductLabel(firstItemData.product)
                        : `#${firstItemData?.item?.product_id || ""}`;
                      const secondLabel = secondItemData?.product
                        ? getProductLabel(secondItemData.product)
                        : `#${secondItemData?.item?.product_id || ""}`;
                      const firstMeta = [
                        firstItemData?.item?.color_name || tx("NoColorSelected", "No color selected"),
                        firstItemData?.item?.match_type
                          ? firstItemData.item.match_type === "bag"
                            ? tx("Bag", "Bag")
                            : tx("Shoes", "Shoes")
                          : tx("TypeMissing", "Type missing"),
                      ].join(" • ");
                      const secondMeta = [
                        secondItemData?.item?.color_name || tx("NoColorSelected", "No color selected"),
                        secondItemData?.item?.match_type
                          ? secondItemData.item.match_type === "bag"
                            ? tx("Bag", "Bag")
                            : tx("Shoes", "Shoes")
                          : tx("TypeMissing", "Type missing"),
                      ].join(" • ");

                      return (
                        <div key={pairImage?.id} className="border rounded p-3">
                          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
                            <div className="fw-semibold">
                              {tx("StyledPair", "Styled Pair")} #{pairIndex + 1}
                            </div>
                            <Badge color={pairImage?.preview_image_id || pairImage?.preview_image_url ? "success" : "warning"}>
                              {pairImage?.preview_image_id || pairImage?.preview_image_url
                                ? tx("ImageUploaded", "Image uploaded")
                                : tx("ImageRequired", "Image required")}
                            </Badge>
                          </div>

                          <Row className="g-3">
                            <Col md="6">
                              <Label className="form-label">{tx("FirstItem", "First Item")}</Label>
                              <div className="form-control bg-light d-flex align-items-start gap-3">
                                <div
                                  className="flex-shrink-0 rounded overflow-hidden bg-white border"
                                  style={{ width: 64, height: 64, position: "relative" }}
                                >
                                  {firstItemData?.previewImage ? (
                                    <Image
                                      src={firstItemData.previewImage}
                                      alt={firstLabel || tx("First Item", "First Item")}
                                      fill
                                      unoptimized
                                      style={{ objectFit: "contain", padding: "4px" }}
                                    />
                                  ) : (
                                    <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small text-center p-1">
                                      {tx("NoImage", "No image")}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 text-break">
                                  <div className="fw-semibold">{firstLabel}</div>
                                  <div className="text-muted small">{firstMeta}</div>
                                </div>
                              </div>
                            </Col>

                            <Col md="6">
                              <Label className="form-label">
                                {tx("SecondItem", "Second Item")}
                              </Label>
                              <div className="form-control bg-light d-flex align-items-start gap-3">
                                <div
                                  className="flex-shrink-0 rounded overflow-hidden bg-white border"
                                  style={{ width: 64, height: 64, position: "relative" }}
                                >
                                  {secondItemData?.previewImage ? (
                                    <Image
                                      src={secondItemData.previewImage}
                                      alt={secondLabel || tx("Second Item", "Second Item")}
                                      fill
                                      unoptimized
                                      style={{ objectFit: "contain", padding: "4px" }}
                                    />
                                  ) : (
                                    <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small text-center p-1">
                                      {tx("NoImage", "No image")}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 text-break">
                                  <div className="fw-semibold">{secondLabel}</div>
                                  <div className="text-muted small">{secondMeta}</div>
                                </div>
                              </div>
                            </Col>

                            <Col md="12">
                              {!hasColorSelection ? (
                                <div className="text-warning small mb-2">
                                  {tx(
                                    "StyledPairNeedsColors",
                                    "Choose a color for both products in this pair before saving."
                                  )}
                                </div>
                              ) : !hasValidTypes ? (
                                <div className="text-danger small mb-2">
                                  {tx(
                                    "StyledPairNeedsBagAndShoes",
                                    "Each Matchi pair must contain one bag item and one shoes item."
                                  )}
                                </div>
                              ) : (
                                <div className="text-muted small mb-2">
                                  {tx(
                                    "StyledPairMatchHint",
                                    "This image will appear on the storefront only when customers choose this exact Matchi pair group."
                                  )}
                                </div>
                              )}

                              <Label className="form-label d-block">
                                {tx("StyledPairPreviewImage", "Styled Pair Preview Image")}
                              </Label>
                              <MediaPickerField
                                value={pairImage?.preview_image_url || ""}
                                onSelect={(media) =>
                                  updatePairImage(pairImage?.id, {
                                    preview_image_id: media?.id ?? null,
                                    preview_image_url:
                                      media?.original_url || media?.url || media?.path || "",
                                  })
                                }
                                onChange={(_, previewUrl) => {
                                  if (!previewUrl) {
                                    updatePairImage(pairImage?.id, {
                                      preview_image_id: null,
                                      preview_image_url: "",
                                    });
                                  }
                                }}
                                helperText={tx(
                                  "StyledPairPreviewImageHelper",
                                  "Upload the final edited image for this exact pair. The storefront preview will use this uploaded image."
                                )}
                                previewWidth={220}
                                previewHeight={260}
                              />
                            </Col>

                            <Col md="6">
                              <Label className="form-label">
                                {tx("StyledPairTitleEn", "Preview Title (English)")}
                              </Label>
                              <Input
                                type="text"
                                value={pairImage?.title || ""}
                                onChange={(event) =>
                                  updatePairImage(pairImage?.id, {
                                    title: event.target.value,
                                  })
                                }
                                placeholder={tx(
                                  "StyledPairTitleEnPlaceholder",
                                  "A complete look, ready to shop together"
                                )}
                              />
                            </Col>

                            <Col md="6">
                              <Label className="form-label">
                                {tx("MatchiPairOriginalPrice", "Original Pair Price")}
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pairImage?.original_price ?? ""}
                                onChange={(event) =>
                                  updatePairImage(pairImage?.id, {
                                    original_price: event.target.value,
                                  })
                                }
                                placeholder="508.00"
                              />
                            </Col>

                            <Col md="6">
                              <Label className="form-label">
                                {tx("MatchiPairSalePrice", "Sale Pair Price")}
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pairImage?.sale_price ?? ""}
                                onChange={(event) =>
                                  updatePairImage(pairImage?.id, {
                                    sale_price: event.target.value,
                                  })
                                }
                                placeholder="448.00"
                              />
                            </Col>

                            <Col md="6">
                              <Label className="form-label">
                                {tx("StyledPairTitleAr", "Preview Title (Arabic)")}
                              </Label>
                              <Input
                                type="text"
                                dir="rtl"
                                value={pairImage?.title_ar || ""}
                                onChange={(event) =>
                                  updatePairImage(pairImage?.id, {
                                    title_ar: event.target.value,
                                  })
                                }
                                placeholder={tx(
                                  "StyledPairTitleArPlaceholder",
                                  "إطلالة متكاملة جاهزة للتسوق معاً"
                                )}
                              />
                            </Col>

                            <Col md="6">
                              <Label className="form-label">
                                {tx("StyledPairDescriptionEn", "Preview Description (English)")}
                              </Label>
                              <Input
                                type="textarea"
                                rows="4"
                                value={pairImage?.description || ""}
                                onChange={(event) =>
                                  updatePairImage(pairImage?.id, {
                                    description: event.target.value,
                                  })
                                }
                                placeholder={tx(
                                  "StyledPairDescriptionEnPlaceholder",
                                  "We paired these two picks to give your outfit a stronger finish. Add both in one step or review each product before checkout."
                                )}
                              />
                            </Col>

                            <Col md="6">
                              <Label className="form-label">
                                {tx("StyledPairDescriptionAr", "Preview Description (Arabic)")}
                              </Label>
                              <Input
                                type="textarea"
                                rows="4"
                                dir="rtl"
                                value={pairImage?.description_ar || ""}
                                onChange={(event) =>
                                  updatePairImage(pairImage?.id, {
                                    description_ar: event.target.value,
                                  })
                                }
                                placeholder={tx(
                                  "StyledPairDescriptionArPlaceholder",
                                  "قمنا بتنسيق هاتين القطعتين لمنح إطلالتك لمسة أقوى. أضيفيهما معاً بخطوة واحدة أو راجعي كل منتج قبل إتمام الشراء."
                                )}
                              />
                            </Col>
                          </Row>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-muted">
                    {tx(
                      "NoStyledPairImagesYet",
                      "No pair rows yet. Once you add products above, this section will create one Matchi group for every two products automatically."
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        ) : (
          <div className="border rounded p-3 text-muted">
            {tx(
              "NoMatchiProducts",
              "No products selected yet. Add products here to build the Matchi Matchi page."
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

const MatchiMatchiTab = ({ values, setFieldValue }) => {
  const router = useRouter();
  const { t } = useTranslation("common");

  const tx = (key, fallback) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const selectedItems = useMemo(
    () =>
      normalizeMatchiItems(
        values?.options?.matchi_matchi?.items,
        values?.options?.matchi_matchi?.product_ids
      ),
    [values?.options?.matchi_matchi?.items, values?.options?.matchi_matchi?.product_ids]
  );
  const pairImages = useMemo(
    () =>
      normalizeMatchiPairImages(
        values?.options?.matchi_matchi?.pair_images,
        selectedItems
      ),
    [selectedItems, values?.options?.matchi_matchi?.pair_images]
  );

  const updateSelectedItems = (nextItems) => {
    const normalizedItems = normalizeMatchiItems(nextItems);
    const normalizedPairImages = normalizeMatchiPairImages(
      values?.options?.matchi_matchi?.pair_images,
      normalizedItems
    );
    setFieldValue("options.matchi_matchi.items", normalizedItems);
    setFieldValue(
      "options.matchi_matchi.product_ids",
      normalizedItems.map((item) => item.product_id)
    );
    setFieldValue("options.matchi_matchi.pair_images", normalizedPairImages);
  };

  const updatePairImages = (nextPairImages) => {
    setFieldValue(
      "options.matchi_matchi.pair_images",
      normalizeMatchiPairImages(nextPairImages, selectedItems)
    );
  };

  return (
    <div className="px-2 py-2">
      <Card className="mb-4">
        <CardHeader>
          <h5 className="mb-1">{tx("MatchiMatchiSettings", "Matchi Matchi Settings")}</h5>
          <p className="text-muted mb-0">
            {tx(
              "MatchiMatchiSettingsDesc",
              "Create a dedicated page where customers can pick two curated products and preview the pairing before shopping."
            )}
          </p>
        </CardHeader>
        <CardBody>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4 p-3 border rounded">
            <div>
              <div className="fw-semibold">{tx("MatchiMatchiPageUrl", "Marketing page URL")}</div>
              <div className="text-muted small">https://cuple.shop/matchi-matchi</div>
            </div>
            <Badge color="light" className="text-dark">
              /matchi-matchi
            </Badge>
          </div>

          <Row className="g-3">
            <Col md="12">
              <div className="form-check form-switch">
                <Input
                  id="matchi-matchi-enabled"
                  type="switch"
                  checked={Boolean(values?.options?.matchi_matchi?.enabled)}
                  onChange={(event) =>
                    setFieldValue("options.matchi_matchi.enabled", event.target.checked)
                  }
                />
                <Label className="form-check-label ms-2" htmlFor="matchi-matchi-enabled">
                  {tx("MatchiMatchiEnabled", "Enable Matchi Matchi page")}
                </Label>
              </div>
              <div className="text-muted small mt-1">
                {tx(
                  "MatchiMatchiEnabledHelper",
                  "Turn this on when the curated products and page content are ready to go live."
                )}
              </div>
            </Col>

            <Col md="6">
              <Label className="form-label">{tx("MatchiMatchiTitleEn", "Title (English)")}</Label>
              <Input
                type="text"
                value={values?.options?.matchi_matchi?.title || ""}
                onChange={(event) =>
                  setFieldValue("options.matchi_matchi.title", event.target.value)
                }
                placeholder="Matchi Matchi"
              />
            </Col>

            <Col md="6">
              <Label className="form-label">{tx("MatchiMatchiTitleAr", "Title (Arabic)")}</Label>
              <Input
                type="text"
                dir="rtl"
                value={values?.options?.matchi_matchi?.title_ar || ""}
                onChange={(event) =>
                  setFieldValue("options.matchi_matchi.title_ar", event.target.value)
                }
                placeholder="ماتشي ماتشي"
              />
            </Col>

            <Col md="6">
              <Label className="form-label">
                {tx("MatchiMatchiSubtitleEn", "Subtitle (English)")}
              </Label>
              <Input
                type="text"
                value={values?.options?.matchi_matchi?.subtitle || ""}
                onChange={(event) =>
                  setFieldValue("options.matchi_matchi.subtitle", event.target.value)
                }
                placeholder="Pick two favorites and preview the perfect pairing."
              />
            </Col>

            <Col md="6">
              <Label className="form-label">
                {tx("MatchiMatchiSubtitleAr", "Subtitle (Arabic)")}
              </Label>
              <Input
                type="text"
                dir="rtl"
                value={values?.options?.matchi_matchi?.subtitle_ar || ""}
                onChange={(event) =>
                  setFieldValue("options.matchi_matchi.subtitle_ar", event.target.value)
                }
                placeholder="اختاري قطعتين وشاهدي التناسق بينهما."
              />
            </Col>

            <Col md="6">
              <Label className="form-label">
                {tx("MatchiMatchiDescriptionEn", "Description (English)")}
              </Label>
              <Input
                type="textarea"
                rows="4"
                value={values?.options?.matchi_matchi?.description || ""}
                onChange={(event) =>
                  setFieldValue("options.matchi_matchi.description", event.target.value)
                }
                placeholder="Help customers discover handpicked combinations for shoes, bags, and more."
              />
            </Col>

            <Col md="6">
              <Label className="form-label">
                {tx("MatchiMatchiDescriptionAr", "Description (Arabic)")}
              </Label>
              <Input
                type="textarea"
                rows="4"
                dir="rtl"
                value={values?.options?.matchi_matchi?.description_ar || ""}
                onChange={(event) =>
                  setFieldValue("options.matchi_matchi.description_ar", event.target.value)
                }
                placeholder="ساعدي العملاء على اكتشاف تنسيقات مختارة من الأحذية والحقائب وغيرها."
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      <ProductSelectionSection
        selectedItems={selectedItems}
        pairImages={pairImages}
        onChange={updateSelectedItems}
        onPairImagesChange={updatePairImages}
        router={router}
        tx={tx}
      />
    </div>
  );
};

export default MatchiMatchiTab;
