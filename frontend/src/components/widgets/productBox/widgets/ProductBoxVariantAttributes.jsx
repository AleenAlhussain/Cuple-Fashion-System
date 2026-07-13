import { useCartState } from "@/states";
import Btn from "@/elements/buttons/Btn";
import { ImagePath, storageURL } from "@/utils/constants";
import { resolveSwatchColor } from "@/utils/colorSwatch";
import Image from "next/image";
import React, { useState, useEffect, useMemo, Fragment } from "react";
import { Input, Label } from "reactstrap";

// Parse price from string like "109.00 AED" or number
const parsePrice = (priceValue) => {
  if (typeof priceValue === "number") return priceValue;
  if (typeof priceValue === "string") {
    return parseFloat(priceValue.replace(/[^\d.]/g, "")) || 0;
  }
  return 0;
};

// Helper to get proper image URL (handles external URLs from cuple.ae)
const getProperImageUrl = (imagePath) => {
  if (!imagePath) return null;
  // If already a full URL, return as-is
  if (typeof imagePath === 'string' && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
    return imagePath;
  }
  // Otherwise prepend storage URL
  const storageUrl = process.env.NEXT_PUBLIC_BACKEND_IMAGE_URL || process.env.IMAGE_URL || '';
  return `${storageUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

// Transform new response structure to legacy format
const transformProductData = (product) => {
  if (!product || !product.variants || !Array.isArray(product.variants)) {
    return product;
  }

  // If already has attributes/variations, return as-is
  if (product.attributes && product.variations) {
    return product;
  }

  const colorMap = new Map();
  const sizeMap = new Map();
  const colorImageMap = new Map(); // Map to store first image for each color

  // Helper to find image matching a color name from product images
  const findColorImage = (colorName) => {
    if (!product.images || !colorName) return null;
    const colorUpper = colorName.toUpperCase();
    // Find image whose URL contains the color name
    const matchingImage = product.images.find((img) => {
      const imageUrl = (img.image || img.image_url || '').toUpperCase();
      return imageUrl.includes(`-${colorUpper}-`) || imageUrl.includes(`_${colorUpper}_`) || imageUrl.includes(`/${colorUpper}.`);
    });
    return matchingImage?.image || matchingImage?.image_url || null;
  };

  // Extract unique colors and sizes from variants using attribute_values
  product.variants.forEach((variant) => {
    const attributeValues = variant.attribute_values || [];

    // Get variant image - check images array first, then image field
    const variantImage = variant.images?.[0]?.image || variant.image;

    attributeValues.forEach((av) => {
      const attrName = av.attribute?.name?.toLowerCase() || '';
      const attrSlug = av.attribute?.slug?.toLowerCase() || '';
      const attrId = av.attribute_id || av.attribute?.id;

      if (attrName === 'color' || attrSlug === 'color') {
        if (!colorMap.has(av.id)) {
          colorMap.set(av.id, {
            id: av.id,
            value: av.value,
            hex_color: resolveSwatchColor({
              colorCode: av.color_code,
              hexColor: av.hex_color,
              value: av.value,
            }),
            attribute_id: attrId || 2,
          });
        }
        // Store image for this color - first try variant image, then find from product images by color name
        if (!colorImageMap.has(av.id)) {
          const imageForColor = variantImage || findColorImage(av.value);
          if (imageForColor) {
            colorImageMap.set(av.id, imageForColor);
          }
        }
      } else if (attrName === 'size' || attrSlug === 'size') {
        if (!sizeMap.has(av.id)) {
          sizeMap.set(av.id, {
            id: av.id,
            value: av.value,
            attribute_id: attrId || 1,
          });
        }
      }
    });
  });

  // Build attributes array with color images
  const attributes = [];
  if (colorMap.size > 0) {
    const colorAttributes = Array.from(colorMap.values()).map((colorAttr) => ({
      ...colorAttr,
      variation_image: colorImageMap.has(colorAttr.id)
        ? { original_url: getProperImageUrl(colorImageMap.get(colorAttr.id)) }
        : product.product_thumbnail?.original_url
        ? { original_url: product.product_thumbnail.original_url }
        : product.primary_image
        ? { original_url: product.primary_image }
        : null,
    }));

    attributes.push({
      id: colorAttributes[0]?.attribute_id || 2,
      name: "Color",
      style: "color",
      attribute_values: colorAttributes,
    });
  }
  if (sizeMap.size > 0) {
    attributes.push({
      id: Array.from(sizeMap.values())[0]?.attribute_id || 1,
      name: "Size",
      style: "dropdown",
      attribute_values: Array.from(sizeMap.values()),
    });
  }

  // Build variations array
  const variations = product.variants.map((variant) => {
    const attributeValues = variant.attribute_values || [];
    let variantImage = variant.images?.[0]?.image || variant.image;

    // Find color attribute to get matching image
    const colorAttr = attributeValues.find((av) => {
      const attrName = av.attribute?.name?.toLowerCase() || '';
      const attrSlug = av.attribute?.slug?.toLowerCase() || '';
      return attrName === 'color' || attrSlug === 'color';
    });

    // If no variant image, try to find from product images by color name
    if (!variantImage && colorAttr) {
      variantImage = findColorImage(colorAttr.value);
    }

    // Get quantity and price
    const quantity = variant.stock_quantity ?? 0;
    const price = parsePrice(variant.price || product.price || 0);
    // Use sale_price only if > 0
    const salePriceNum = parsePrice(variant.sale_price);
    const effectiveSalePrice = salePriceNum > 0 ? salePriceNum : price;

    return {
      id: variant.id,
      name: variant.variant_name || `${product.name} - ${attributeValues.map(av => av.value).join(' / ')}`,
      quantity,
      stock_status: quantity > 0 ? "in_stock" : "out_of_stock",
      price,
      sale_price: effectiveSalePrice,
      discount: 0,
      status: variant.is_active !== false ? 1 : 0,
      variation_image: variantImage
        ? { original_url: getProperImageUrl(variantImage) }
        : product.product_thumbnail?.original_url
        ? { original_url: product.product_thumbnail.original_url }
        : product.primary_image
        ? { original_url: product.primary_image }
        : null,
      attribute_values: attributeValues.map((av) => {
        const attrSlug = av.attribute?.slug?.toLowerCase() || "";
        const attrName = av.attribute?.name?.toLowerCase() || "";
        const isColorAttribute = attrSlug === "color" || attrName === "color";

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
              }
            : null,
        };
      }),
    };
  });

  return {
    ...product,
    attributes,
    variations,
  };
};

const ProductBoxVariantAttribute = ({
  productState,
  setProductState,
  productBox11,
  showVariableType,
}) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [soldOutAttributesIds, setSoldOutAttributesIds] = useState([]);
  const { cart } = useCartState();
  const [cartItem, setCartItem] = useState();
  const [breakLoop, setBreakLoop] = useState(false);
  const [initial, setInitial] = useState();
  const [selectedAttrValue, setSelectedAttrValue] = useState("");

  // Transform product data once
  const transformedProduct = useMemo(() => {
    return transformProductData(productState?.product);
  }, [productState?.product]);

  const checkVariantAvailability = (productObj) => {
    productObj?.variations?.forEach((variation) => {
      if (!variation.status) {
        variation?.attribute_values?.forEach((attribute_value) => {
          if (productState?.statusIds?.indexOf(attribute_value?.id) === -1) {
            setProductState((prev) => ({
              ...prev,
              statusIds: Array.from(
                new Set([...prev.statusIds, attribute_value?.id])
              ),
            }));
          }
        });
      }
      variation?.attribute_values?.filter((attribute_value) => {
        if (productState.attributeValues?.indexOf(attribute_value?.id) === -1) {
          setProductState((prev) => ({
            ...prev,
            attributeValues: Array.from(
              new Set([...prev.attributeValues, attribute_value?.id])
            ),
          }));
        }
      });
    });
    if (cartItem?.variation) {
      cartItem?.variation?.attribute_values?.filter((attribute_val) => {
        setVariant(productObj?.variations, attribute_val);
      });
    } else if (productObj?.attributes) {
      // Set First Variant Default
      for (const attribute of productObj?.attributes) {
        if (
          productState.attributeValues?.length &&
          attribute?.attribute_values?.length
        ) {
          for (const value of attribute?.attribute_values) {
            if (productState?.attributeValues?.includes(value?.id)) {
              setVariant(productObj?.variations, value);
              if (breakLoop) {
                break; // Break out of the inner loop after setting the first variant
              }
            }
          }
        }
      }
    }

    // Set Variation Image
    productObj?.variations?.forEach((variation) => {
      let attrValues = variation?.attribute_values?.map(
        (attribute_value) => attribute_value?.id
      );
      productObj?.attributes?.filter((attribute) => {
        if (attribute.style === "image") {
          attribute.attribute_values.filter((attribute_value) => {
            if (productState?.attributeValues?.includes(attribute_value.id)) {
              if (attrValues.includes(attribute_value.id)) {
                attribute_value.variation_image = variation.variation_image;
              }
            }
          });
        }
      });
    });
  };

  const checkStockAvailable = () => {
    if (productState?.selectedVariation) {
      setProductState((prevState) => {
        const tempSelectedVariation = { ...prevState.selectedVariation };
        tempSelectedVariation.stock_status =
          tempSelectedVariation.quantity < prevState.productQty
            ? "out_of_stock"
            : "in_stock";
        return {
          ...prevState,
          selectedVariation: tempSelectedVariation,
        };
      });
    } else {
      setProductState((prevState) => {
        const tempProduct = { ...prevState.product };
        tempProduct.stock_status =
          tempProduct.quantity < prevState.productQty
            ? "out_of_stock"
            : "in_stock";
        return {
          ...prevState,
          product: tempProduct,
        };
      });
    }
  };

  useEffect(() => {
    let timer = setTimeout(() => {
      checkVariantAvailability(transformedProduct);
    }, 0);
    return () => clearTimeout(timer);
  }, [
    productState?.attributeValues,
    cartItem,
    selectedOptions,
    transformedProduct,
  ]);

  useEffect(() => {
    if (productState?.product) {
      const matchedItem = cart?.find(
        (elem) => elem?.product?.id === productState?.product?.id
      );

      setCartItem((prev) => {
        if (prev?.product?.id !== matchedItem?.product?.id) {
          return matchedItem;
        }
        return prev; // No change, avoid re-render
      });
    }
  }, [cart, productState]);

  useEffect(() => {
    if (transformedProduct?.attributes?.length) {
      transformedProduct.attributes.forEach((attribute) => {
        const validOptions = attribute.attribute_values?.filter((val) =>
          productState?.attributeValues?.includes(val.id)
        );

        if (validOptions?.length) {
          const lastValue = validOptions[validOptions.length - 1];
          setSelectedAttrValue(lastValue.id.toString());
          setVariant(transformedProduct?.variations, lastValue);
        }
      });
    }
  }, [productState?.attributeValues, transformedProduct]);

  const setVariant = (variations, value, action = "click") => {
    let tempVal;
    if (value?.id != initial?.id && action == "hover") {
      tempVal = value;
    } else if (action == "click") {
      setInitial(value);
      tempVal = value;
    } else {
      tempVal = initial;
    }
    let tempSelected = selectedOptions;
    let tempSoldOutAttributesIds = [];
    setSoldOutAttributesIds((prev) => tempSoldOutAttributesIds);
    const index = tempSelected?.findIndex(
      (item) => Number(item.attribute_id) === Number(tempVal?.attribute_id)
    );
    if (index === -1) {
      tempSelected.push({
        id: Number(tempVal?.id),
        attribute_id: Number(tempVal?.attribute_id),
      });
      setSelectedOptions(tempSelected);
    } else {
      tempSelected[index].id = tempVal?.id;
      setSelectedOptions(tempSelected);
    }

    // Handle color hover/click - show color image immediately
    // Check if this is a color attribute (has hex_color) and has an image
    const isColorAttribute = tempVal?.hex_color !== undefined;
    if (isColorAttribute && tempVal?.variation_image) {
      if (action === "hover" || action === "click") {
        // Create a temporary variation object to show the color image
        const tempVariation = {
          variation_image: tempVal.variation_image,
          attribute_values: [tempVal],
        };

        // Update image on hover
        if (action === "hover") {
          setProductState((prev) => ({
            ...prev,
            hoverVariation: tempVariation,
          }));
        }
      } else if (action === "out") {
        // Clear hover variation when mouse leaves
        setProductState((prev) => ({
          ...prev,
          hoverVariation: null,
        }));
      }
    }

    variations?.forEach((variation) => {
      let attrValues = variation?.attribute_values?.map(
        (attribute_value) => attribute_value?.id
      );
      let tempVariantIds = tempSelected?.map((variants) => variants?.id);
      setProductState((prev) => ({
        ...prev,
        variantIds: tempVariantIds,
      }));
      let doValuesMatch =
        attrValues.length === tempSelected.length &&
        attrValues.every((value) => tempVariantIds.includes(value));
      if (doValuesMatch) {
        setProductState((prev) => ({
          ...prev,
          selectedVariation: variation,
          variation_id: variation?.id,
          variation: variation,
          hoverVariation: null, // Clear hover when full variation selected
        }));
        checkStockAvailable();
      }

      if (variation?.stock_status === "out_of_stock") {
        variation?.attribute_values.filter((attr_value) => {
          if (attrValues.some((value) => tempVariantIds.includes(value))) {
            if (attrValues.every((value) => tempVariantIds.includes(value))) {
              tempSoldOutAttributesIds.push(attr_value.id);
              setSoldOutAttributesIds((prev) => [...tempSoldOutAttributesIds]);
            } else if (!tempVariantIds.includes(attr_value.id)) {
              tempSoldOutAttributesIds.push(attr_value.id);
              setSoldOutAttributesIds((prev) => [...tempSoldOutAttributesIds]);
            }
          } else if (
            attrValues.length === 1 &&
            attrValues.includes(attr_value.id)
          ) {
            tempSoldOutAttributesIds.push(attr_value.id);
            setSoldOutAttributesIds((prev) => [...tempSoldOutAttributesIds]);
          }
        });
      }
    });

    // Set Attribute Value
    transformedProduct?.attributes?.filter((attribute) => {
      attribute?.attribute_values?.filter((a_value) => {
        if (a_value.id === tempVal?.id) {
          attribute.selected_value = a_value.value;
        }
      });
    });

    if (
      productState?.selectedVariation &&
      productState?.selectedVariation?.status &&
      productState?.selectedVariation.stock_status === "in_stock"
    ) {
      setBreakLoop(true);
    } else {
      setBreakLoop(false);
    }
  };

  return (
    <>
      {transformedProduct?.attributes?.map((elem, i) => (
        <Fragment key={i}>
          {showVariableType.includes(elem.style) && elem.style === "radio" ? (
            <div key={i} className="d-flex digital-price">
              {elem?.attribute_values.map((value, index) => (
                <Fragment key={index}>
                  {productState?.attributeValues?.includes(value?.id) ? (
                    <div
                      className={`form-check ${
                        productState?.statusIds?.includes(value?.id) ||
                        soldOutAttributesIds.includes(value.id)
                          ? "disabled"
                          : ""
                      }`}
                    >
                      <Input
                        type="radio"
                        className="form-check-input"
                        id={`radio-${i}-${index}`}
                        name={`radio-group-${i}`}
                        value={index}
                        checked={
                          productState?.variantIds?.includes(value?.id) ||
                          !soldOutAttributesIds.includes(value.id)
                        }
                        disabled={
                          productState?.statusIds?.includes(value?.id) ||
                          soldOutAttributesIds.includes(value.id)
                        }
                        onChange={(e) =>
                          setVariant(
                            transformedProduct?.variations,
                            elem?.attribute_values[e.target.value]
                          )
                        }
                        height={65}
                        width={65}
                      />
                      <Label
                        htmlFor={`radio-${i}-${index}`}
                        className="form-check-label"
                      >
                        {value?.value}
                      </Label>
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          ) : showVariableType.includes(elem.style) &&
            elem?.style == "color" ? (
            <ul className={`circle general-variant ${elem?.style}`}>
              {elem?.attribute_values?.map((value, index) => (
                <Fragment key={index}>
                  {productState?.attributeValues?.includes(value?.id) ? (
                    <li
                      placement="top"
                      style={{ backgroundColor: value?.hex_color }}
                      onClick={() =>
                        setVariant(
                          transformedProduct?.variations,
                          value,
                          "click"
                        )
                      }
                      onMouseOver={() =>
                        setVariant(
                          transformedProduct?.variations,
                          value,
                          "hover"
                        )
                      }
                      onMouseOut={() =>
                        setVariant(transformedProduct?.variations, value, "out")
                      }
                      className={`${
                        soldOutAttributesIds.includes(value.id)
                          ? "disabled"
                          : ""
                      } ${
                        productState?.variantIds?.includes(value.id)
                          ? "active"
                          : ""
                      }`}
                    ></li>
                  ) : null}
                </Fragment>
              ))}
            </ul>
          ) : (showVariableType.includes(elem?.style) &&
              elem?.style == "dropdown") ||
            productBox11 ? (
            <select
              id={`input-state-${i}`}
              className="form-control form-select"
              value={selectedAttrValue}
              onChange={(e) => {
                const selectedId = e.target.value;
                setSelectedAttrValue(selectedId);
                const selectedAttribute = elem?.attribute_values.find(
                  (v) => v.id.toString() === selectedId
                );
                setVariant(transformedProduct?.variations, selectedAttribute);
              }}
            >
              <option value="" disabled>
                Choose {elem?.name}
              </option>
              {elem?.attribute_values?.map((value) => (
                <Fragment key={value.id}>
                  {productState?.attributeValues?.includes(value?.id) ? (
                    <option
                      value={value.id}
                      disabled={
                        productState?.statusIds?.includes(value?.id) ||
                        soldOutAttributesIds.includes(value.id)
                      }
                    >
                      {value?.value}
                    </option>
                  ) : null}
                </Fragment>
              ))}
            </select>
          ) : showVariableType.includes(elem?.style) &&
            elem?.style == "image_price" ? (
            <>
              {elem?.attribute_values?.map((item, index) => (
                <Fragment key={index}>
                  {productState?.attributeValues?.includes(item?.id) && (
                    <li
                      className={`${
                        !productState?.statusIds?.includes(item.id) &&
                        productState?.variantIds?.includes(item?.id) &&
                        !soldOutAttributesIds.includes(item?.id)
                          ? "active"
                          : ""
                      } ${
                        soldOutAttributesIds?.includes(item.id) ||
                        productState?.statusIds?.includes(item.id)
                          ? "disabled"
                          : ""
                      }`}
                      title={item?.value}
                    >
                      {item?.sale_price || "$"}
                      <a>
                        <button>
                          <Image
                            id={item?.value}
                            src={
                              item?.variation_image
                                ? item?.variation_image?.original_url
                                : `${ImagePath}/placeholder/product.png`
                            }
                            onClick={() =>
                              setVariant(transformedProduct?.variations, item)
                            }
                            height={65}
                            width={65}
                            alt="Product"
                          />{" "}
                        </button>
                      </a>
                    </li>
                  )}
                </Fragment>
              ))}
            </>
          ) : (
            showVariableType.includes(elem.style) && (
              <ul className={`general-variant ${elem?.style}`}>
                {elem?.attribute_values?.map((item, index) => (
                  <Fragment key={index}>
                    {productState?.attributeValues?.includes(item?.id) && (
                      <li
                        className={`${
                          !productState?.statusIds?.includes(item.id) &&
                          productState?.variantIds?.includes(item?.id) &&
                          !soldOutAttributesIds.includes(item?.id)
                            ? "active"
                            : ""
                        } ${
                          soldOutAttributesIds?.includes(item.id) ||
                          productState?.statusIds?.includes(item.id)
                            ? "disabled"
                            : ""
                        }`}
                        title={item?.value}
                      >
                        {elem?.style == "image" ? (
                          <a>
                            <img
                              id={item?.value}
                              src={
                                item?.variation_image
                                  ? item?.variation_image?.original_url
                                  : `${ImagePath}/placeholder/product.png`
                              }
                              onClick={() =>
                                setVariant(
                                  transformedProduct?.variations,
                                  item,
                                  "click"
                                )
                              }
                              onMouseOver={() =>
                                setVariant(
                                  transformedProduct?.variations,
                                  item,
                                  "hover"
                                )
                              }
                              onMouseOut={() =>
                                setVariant(
                                  transformedProduct?.variations,
                                  item,
                                  "out"
                                )
                              }
                              loading="lazy"
                              alt="Product"
                            />{" "}
                          </a>
                        ) : (
                          <Btn
                            color="transparent"
                            id={item?.value}
                            onClick={() =>
                              setVariant(
                                transformedProduct?.variations,
                                item,
                                "click"
                              )
                            }
                            onMouseOver={() =>
                              setVariant(
                                transformedProduct?.variations,
                                item,
                                "hover"
                              )
                            }
                            onMouseOut={() =>
                              setVariant(
                                transformedProduct?.variations,
                                item,
                                "out"
                              )
                            }
                          >
                            <div>{item?.value}</div>
                          </Btn>
                        )}
                      </li>
                    )}
                  </Fragment>
                ))}
              </ul>
            )
          )}
        </Fragment>
      ))}
    </>
  );
};

export default ProductBoxVariantAttribute;
