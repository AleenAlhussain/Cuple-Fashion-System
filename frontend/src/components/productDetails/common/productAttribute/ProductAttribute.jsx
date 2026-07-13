import { useCartState } from "@/states";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ColorAttribute from "./ColorAttribute";
import DropdownAttribute from "./DropdownAttribute";
import ImageOtherAttributes from "./Image&OtherAttributes";
import RadioAttribute from "./RadioAttribute";

const ATTR_LABELS = {
  color: { en: "Color", ar: "لون" },
  size: { en: "Size", ar: "المقاس" },
};

const isVariationEnabled = (variation) => {
  if (!variation) return false;
  if (variation?.status === false) return false;
  if (variation?.is_active === false) return false;
  return true;
};

const getVariationQuantity = (variation) =>
  Number(variation?.quantity ?? variation?.stock_quantity ?? 0);

const getVariationStockStatus = (variation) => {
  if (variation?.stock_status) return variation.stock_status;
  const quantity = getVariationQuantity(variation);
  return quantity > 0 ? "in_stock" : "out_of_stock";
};

const ProductAttribute = ({
  productState,
  setProductState,
  stickyAddToCart,
  noHoverEffect,
  autoSelectFirstVariant = true,
}) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [soldOutAttributesIds, setSoldOutAttributesIds] = useState([]);
  const { cart } = useCartState();
  const [cartItem, setCartItem] = useState();
  const [initial, setInitial] = useState();

  const checkVariantAvailability = (productObj) => {
    // Skip if no variations or if this is a transformed product (uses VariantSelector instead)
    if (
      !productObj?.variations ||
      !Array.isArray(productObj.variations) ||
      productObj._isTransformed
    ) {
      return;
    }

    const allAttributeValueIds = new Set();
    const enabledAttributeValueIds = new Set();

    productObj.variations.forEach((variation) => {
      variation?.attribute_values?.forEach((attributeValue) => {
        if (!attributeValue?.id) return;
        allAttributeValueIds.add(attributeValue.id);

        if (isVariationEnabled(variation)) {
          enabledAttributeValueIds.add(attributeValue.id);
        }
      });
    });

    const nextAttributeValues = Array.from(allAttributeValueIds);
    const nextStatusIds = nextAttributeValues.filter(
      (attributeValueId) => !enabledAttributeValueIds.has(attributeValueId)
    );

    setProductState((prev) => {
      const hasSameAttributeValues =
        prev.attributeValues.length === nextAttributeValues.length &&
        prev.attributeValues.every(
          (attributeValueId, index) =>
            attributeValueId === nextAttributeValues[index]
        );
      const hasSameStatusIds =
        prev.statusIds.length === nextStatusIds.length &&
        prev.statusIds.every(
          (attributeValueId, index) => attributeValueId === nextStatusIds[index]
        );

      if (hasSameAttributeValues && hasSameStatusIds) {
        return prev;
      }

      return {
        ...prev,
        attributeValues: nextAttributeValues,
        statusIds: nextStatusIds,
      };
    });

    let firstAvailableVariant = null;

    for (const variation of productObj.variations) {
      if (
        isVariationEnabled(variation) &&
        getVariationStockStatus(variation) !== "out_of_stock"
      ) {
        firstAvailableVariant = variation;
        break;
      }
    }

    if (autoSelectFirstVariant && firstAvailableVariant) {
      firstAvailableVariant.attribute_values.forEach((attribute_val) => {
        setVariant(productObj?.variations, attribute_val, "default");
      });
    }

    // Set Variation Image
    productObj?.variations?.forEach((variation) => {
      let attrValues = variation?.attribute_values?.map(
        (attribute_value) => attribute_value?.id
      );
      productObj?.attributes.filter((attribute) => {
        if (attribute.style == "image") {
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
          getVariationQuantity(tempSelectedVariation) < prevState.productQty
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
          getVariationQuantity(tempProduct) < prevState.productQty
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
      checkVariantAvailability(productState?.product);
    }, 0);
    return () => clearTimeout(timer);
  }, [productState?.attributeValues, cartItem, selectedOptions, autoSelectFirstVariant]);

  useEffect(() => {
    productState?.product &&
      setCartItem(
        cart?.find(
          (elem) => elem?.product?.id == productState?.product?.id || elem?.product_id == productState?.product?.id
        )
      );
  }, [cart, productState]);

  const setVariant = (variations, value, action = "click") => {
    let tempVal;
    if (value?.id != initial?.id && action == "hover") {
      tempVal = value;
    } else if (action == "click" || action == "default") {
      setInitial(value);
      tempVal = value;
    } else {
      tempVal = initial;
    }

    let tempSelected = [...selectedOptions];
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
      tempSelected[index] = {
        ...tempSelected[index],
        id: tempVal?.id,
      };
      setSelectedOptions(tempSelected);
    }

    let matchedVariation = null;
    const tempVariantIds = tempSelected?.map((variants) => variants?.id);

    variations?.forEach((variation) => {
      let attrValues = variation?.attribute_values?.map(
        (attribute_value) => attribute_value?.id
      );
      let doValuesMatch =
        attrValues.length === tempSelected.length &&
        attrValues.every((value) => tempVariantIds.includes(value));
      if (doValuesMatch) {
        matchedVariation = variation;
      }

      if (getVariationStockStatus(variation) == "out_of_stock") {
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
            attrValues.length == 1 &&
            attrValues.includes(attr_value.id)
          ) {
            tempSoldOutAttributesIds.push(attr_value.id);
            setSoldOutAttributesIds((prev) => [...tempSoldOutAttributesIds]);
          }
        });
      }
    });

    const nextSelectedVariation = matchedVariation
      ? {
          ...matchedVariation,
          stock_status:
            (matchedVariation?.quantity ?? matchedVariation?.stock_quantity ?? 0) <
            (productState?.productQty || 1)
              ? "out_of_stock"
              : "in_stock",
        }
      : null;

    setProductState((prev) => {
      return {
        ...prev,
        variantIds: tempVariantIds,
        selectedVariation: nextSelectedVariation,
        variation_id: nextSelectedVariation?.id || null,
        variation: nextSelectedVariation,
      };
    });

    // Set Attribute Value
    productState?.product?.attributes?.filter((attribute) => {
      attribute?.attribute_values?.filter((a_value) => {
        if (a_value.id == tempVal?.id) {
          attribute.selected_value = a_value.value;
        }
      });
    });
  };
  const { i18n } = useTranslation("common");
  const attrLang = i18n.language;

  const getAttrLabel = (attr) => {
    const slug = attr?.slug?.toLowerCase();
    const labels = ATTR_LABELS[slug];
    if (labels) return labels[attrLang] || labels.en || attr?.name;
    return attr?.name;
  };

  // Don't render if this is a transformed product (uses VariantSelector instead)
  if (
    !productState?.product?.attributes ||
    productState?.product?._isTransformed
  ) {
    return null;
  }

  return (
    <>
      {productState.product.attributes.map((elem, i) => (
        <div className="variation-box" key={i}>
          <h4 className="sub-title">{getAttrLabel(elem)}:</h4>
          {stickyAddToCart ? (
            <DropdownAttribute
              elem={elem}
              setVariant={setVariant}
              soldOutAttributesIds={soldOutAttributesIds}
              i={i}
              productState={productState}
            />
          ) : (
            <>
              {elem?.style == "radio" ? (
                <RadioAttribute
                  elem={elem}
                  setVariant={setVariant}
                  soldOutAttributesIds={soldOutAttributesIds}
                  i={i}
                  productState={productState}
                />
              ) : elem?.style == "dropdown" ? (
                <DropdownAttribute
                  elem={elem}
                  setVariant={setVariant}
                  soldOutAttributesIds={soldOutAttributesIds}
                  i={i}
                  productState={productState}
                />
              ) : elem?.style == "color" ? (
                <ColorAttribute
                  elem={elem}
                  setVariant={setVariant}
                  soldOutAttributesIds={soldOutAttributesIds}
                  productState={productState}
                  noHoverEffect={noHoverEffect}
                />
              ) : (
                <ImageOtherAttributes
                  elem={elem}
                  setVariant={setVariant}
                  soldOutAttributesIds={soldOutAttributesIds}
                  productState={productState}
                  noHoverEffect={noHoverEffect}
                />
              )}
            </>
          )}
        </div>
      ))}
    </>
  );
};

export default ProductAttribute;
