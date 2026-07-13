import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveSwatchColor } from "@/utils/colorSwatch";

const ATTRIBUTE_LABELS = {
  color: { en: "Color", ar: "لون" },
  size: { en: "Size", ar: "المقاس" },
};

/**
 * Variant Selector Component for Product Variants
 * Handles ALL attribute types dynamically from transformed product-variants API data
 */
const VariantSelector = ({ productState, setProductState }) => {
  const { t } = useTranslation("common");
  // Store selected values for each attribute: { attributeId: selectedValueId }
  const [selectedValues, setSelectedValues] = useState({});

  const product = productState?.product;

  // Only show this component for transformed products with variants
  if (!product?._isTransformed || !product?.variations?.length) {
    return null;
  }

  // Get all attributes from the product
  const attributes = product.attributes || [];

  // Initialize with first available variant
  useEffect(() => {
    if (product && !productState.selectedVariation && attributes.length > 0) {
      // Find first in-stock variant
      const firstAvailableVariant =
        product.variations.find(
          (v) => v.stock_status === "in_stock" && v.status
        ) || product.variations[0];

      if (firstAvailableVariant) {
        // Build initial selected values from first variant
        const initialSelected = {};
        firstAvailableVariant.attribute_values.forEach((av) => {
          initialSelected[av.attribute_id] = av.id;
        });

        setSelectedValues(initialSelected);

        setProductState((prev) => ({
          ...prev,
          selectedVariation: firstAvailableVariant,
          variantIds: firstAvailableVariant.attribute_values.map((av) => av.id),
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handleAttributeSelect = (attributeId, valueId) => {
    const newSelectedValues = {
      ...selectedValues,
      [attributeId]: valueId,
    };
    setSelectedValues(newSelectedValues);
    updateSelectedVariant(newSelectedValues);
  };

  const updateSelectedVariant = (newSelectedValues) => {
    // Find variant that matches all selected values
    const matchingVariations = product.variations.filter((variation) => {
      return Object.entries(newSelectedValues).every(([attrId, valueId]) => {
        if (!valueId) return true; // Skip if no value selected for this attribute
        return variation.attribute_values.some(
          (av) => av.attribute_id === parseInt(attrId) && av.id === valueId
        );
      });
    });

    // Prefer in-stock variations
    const matchingVariation =
      matchingVariations.find(
        (v) => v.stock_status === "in_stock" && v.status
      ) || matchingVariations[0];

    if (matchingVariation) {
      setProductState((prev) => ({
        ...prev,
        selectedVariation: matchingVariation,
        variantIds: matchingVariation.attribute_values.map((av) => av.id),
      }));
    }
  };

  const isValueAvailable = (attributeId, valueId) => {
    // Check if this value exists in any variant that matches other selected values
    return product.variations.some((v) => {
      // Check if this variant has the value we're checking
      const hasValue = v.attribute_values.some((av) => av.id === valueId);
      if (!hasValue) return false;

      // Check if variant matches all other selected attributes
      const matchesOtherSelections = Object.entries(selectedValues).every(([attrId, selectedValueId]) => {
        if (parseInt(attrId) === attributeId) return true; // Skip the attribute we're checking
        if (!selectedValueId) return true; // Skip if no value selected
        return v.attribute_values.some(
          (av) => av.attribute_id === parseInt(attrId) && av.id === selectedValueId
        );
      });

      // Allow selection even if out of stock - just needs to be an active variant
      // Stock status will be shown after selection
      return matchesOtherSelections && v.status !== false;
    });
  };

  const { i18n } = useTranslation("common");
  const lang = i18n.language;

  // Translate common attribute names
  const getAttributeLabel = (attribute) => {
    const slug = attribute.slug?.toLowerCase();
    const labels = ATTRIBUTE_LABELS[slug];
    if (labels) return labels[lang] || labels.en || attribute.name;
    return attribute.name;
  };

  // Render attribute based on its style
  const renderAttribute = (attribute) => {
    const selectedValueId = selectedValues[attribute.id];
    const selectedValue = attribute.attribute_values?.find(
      (av) => av.id === selectedValueId
    );
    const attrLabel = getAttributeLabel(attribute);

    // Color style - show color swatches
    if (attribute.style === "color") {
      return (
        <div className="variation-box" key={attribute.id}>
          <h4 className="sub-title">
            {attrLabel}:
            {selectedValue && (
              <span className="selected-value"> {selectedValue.value}</span>
            )}
          </h4>
          <ul className="quantity-variant color">
            {attribute.attribute_values?.map((attrValue) => {
              const isAvailable = isValueAvailable(attribute.id, attrValue.id);
              const isActive = selectedValueId === attrValue.id;

              return (
                <li
                  key={attrValue.id}
                  className={`bg-light ${!isAvailable ? "disabled" : ""} ${
                    isActive ? "active" : ""
                  }`}
                  onClick={() =>
                    isAvailable && handleAttributeSelect(attribute.id, attrValue.id)
                  }
                  style={{ cursor: isAvailable ? "pointer" : "not-allowed" }}
                >
                  <span
                    style={{
                      backgroundColor: resolveSwatchColor({
                        colorCode: attrValue.color_code,
                        hexColor: attrValue.hex_color,
                        value: attrValue.value,
                      }),
                    }}
                    title={attrValue.value}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      );
    }

    // Dropdown style
    if (attribute.style === "dropdown") {
      return (
        <div className="variation-box" key={attribute.id}>
          <h4 className="sub-title">{attrLabel}:</h4>
          <select
            className="form-select"
            value={selectedValueId || ""}
            onChange={(e) => handleAttributeSelect(attribute.id, parseInt(e.target.value))}
          >
            <option value="">{t("Select")} {attrLabel}</option>
            {attribute.attribute_values?.map((attrValue) => {
              const isAvailable = isValueAvailable(attribute.id, attrValue.id);
              return (
                <option
                  key={attrValue.id}
                  value={attrValue.id}
                  disabled={!isAvailable}
                >
                  {attrValue.value} {!isAvailable ? `(${t("OutOfStock")})` : ""}
                </option>
              );
            })}
          </select>
        </div>
      );
    }

    // Radio/default style - show as clickable boxes (used for Size and other attributes)
    return (
      <div className="variation-box" key={attribute.id}>
        <h4 className="sub-title">
          {attrLabel}:
          {selectedValue && (
            <span className="selected-value"> {selectedValue.value}</span>
          )}
        </h4>
        <ul className="quantity-variant radio">
          {attribute.attribute_values?.map((attrValue) => {
            const isAvailable = isValueAvailable(attribute.id, attrValue.id);
            const isActive = selectedValueId === attrValue.id;

            return (
              <li
                key={attrValue.id}
                className={`${!isAvailable ? "disabled" : ""} ${
                  isActive ? "active" : ""
                }`}
                onClick={() =>
                  isAvailable && handleAttributeSelect(attribute.id, attrValue.id)
                }
                style={{ cursor: isAvailable ? "pointer" : "not-allowed" }}
              >
                <span>{attrValue.value}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="variant-selector">
      {attributes.map((attribute) => renderAttribute(attribute))}
    </div>
  );
};

export default VariantSelector;
