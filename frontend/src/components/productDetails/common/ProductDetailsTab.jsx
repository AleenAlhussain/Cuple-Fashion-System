import React, { useState } from "react";
import { Col, Row, TabContent, TabPane } from "reactstrap";
import NavTabTitles from "@/components/widgets/NavTabs";
import TextLimit from "@/utils/customFunctions/TextLimit";
import Btn from "@/elements/buttons/Btn";
import { RiArrowDownSLine } from "react-icons/ri";
import { useTranslation } from "react-i18next";
import { localizedValue } from "@/utils/constants";

const ProductDetailsTab = ({ productState }) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const [showMore, setShowMore] = useState(false);
  const [activeTab, setActiveTab] = useState(1);

  const ProductDetailsTabTitle = [
    { id: 1, name: t("Description") },
    { id: 2, name: t("AdditionalInformation") },
  ];

  const seeMore = () => {
    setShowMore((prev) => !prev);
  };

  const product = productState?.product || {};
  const selectedVariation = productState?.selectedVariation;
  const attributes = product.attributes || product.attribute || [];
  const variations = product.variations || product.variants || [];

  // Build Additional information rows
  const rows = [];

  // Collect ALL available attribute values from all variants
  const attributesByType = new Map(); // Map<attributeName, Set<values>>

  // Extract all attribute values from all variations
  variations.forEach((variant) => {
    const attrValues = variant.attribute_values || [];
    attrValues.forEach((av) => {
      // Get attribute name from the attribute relationship
      const attrName = av.attribute?.name || '';
      const attrSlug = av.attribute?.slug || '';

      // Determine the display name for this attribute
      let displayName = attrName;

      // If attribute relationship isn't loaded, try to determine type from data
      if (!displayName) {
        // Check if it looks like a color (has color_code/hex_color)
        if (av.color_code || av.hex_color) {
          displayName = 'Color';
        }
        // Check if value looks like a size (numeric or common size values)
        else if (/^\d+$/.test(av.value) || /^(XS|S|M|L|XL|XXL|XXXL)$/i.test(av.value)) {
          displayName = 'Size';
        }
        // Otherwise skip - we can't determine the attribute type
        else {
          return;
        }
      }

      // Normalize the display name for color/size
      const nameLower = displayName.toLowerCase();
      if (nameLower === 'color' || attrSlug?.toLowerCase() === 'color') {
        displayName = 'Color';
      } else if (nameLower === 'size' || attrSlug?.toLowerCase() === 'size') {
        displayName = 'Size';
      }

      // Add to the appropriate set
      if (!attributesByType.has(displayName)) {
        attributesByType.set(displayName, new Set());
      }
      attributesByType.get(displayName).add(av.value);
    });
  });

  // Also extract from attributes array if available (legacy format)
  if (Array.isArray(attributes)) {
    attributes.forEach((attr) => {
      if (!attr || !attr.attribute_values?.length) return;
      const name = attr.name || attr.label || '';
      if (!name) return;

      attr.attribute_values.forEach((av) => {
        if (!attributesByType.has(name)) {
          attributesByType.set(name, new Set());
        }
        attributesByType.get(name).add(av.value);
      });
    });
  }

  // Extract colors and sizes from the map
  const allColors = attributesByType.get('Color') || new Set();
  const allSizes = attributesByType.get('Size') || new Set();

  // Remove Color and Size from the map so we don't duplicate them
  attributesByType.delete('Color');
  attributesByType.delete('Size');

  // Add ALL Colors
  if (allColors.size > 0) {
    rows.push({ label: t("AvailableColors"), value: Array.from(allColors).join(", ") });
  }

  // Add ALL Sizes
  if (allSizes.size > 0) {
    rows.push({ label: t("AvailableSizes"), value: Array.from(allSizes).join(", ") });
  }

  // Add other attributes (like "test" attribute)
  attributesByType.forEach((values, name) => {
    if (values.size > 0) {
      rows.push({ label: name, value: Array.from(values).join(", ") });
    }
  });

  // Add SKU / Article Number
  const sku = selectedVariation?.sku || product.sku;
  if (sku) {
    rows.push({ label: t("ArticleNumber"), value: sku });
  }

  // Add Stock Quantity
  const stockQty = selectedVariation?.stock_quantity ?? selectedVariation?.quantity ?? product.stock_quantity ?? product.quantity;
  if (stockQty !== undefined && stockQty !== null) {
    const stockStatus = stockQty > 0 ? `${stockQty} ${t("InStock")}` : t("OutOfStock");
    rows.push({ label: t("Availability"), value: stockStatus });
  }

  // Add Brand if available
  if (product.brand?.name) {
    rows.push({ label: t("Brand"), value: product.brand.name });
  }

  // Add Categories
  if (product.categories?.length > 0) {
    const categoryNames = product.categories.map((c) => localizedValue(c, 'name', lang)).join(", ");
    rows.push({ label: t("Categories"), value: categoryNames });
  }

  // Add Tags if available
  if (product.tags?.length > 0) {
    const tagNames = product.tags.map((tag) => tag.name).join(", ");
    rows.push({ label: t("Tags"), value: tagNames });
  }

  // Add Weight if available
  if (product.weight) {
    const weightUnitRaw = product.weight_unit || "kg";
    const weightUnit =
      typeof weightUnitRaw === "string" && weightUnitRaw.trim()
        ? weightUnitRaw.trim().toUpperCase()
        : "KG";
    rows.push({ label: t("Weight"), value: `${product.weight} ${weightUnit}` });
  }

  // Add Unit if available
  if (product.unit) {
    rows.push({ label: t("Unit"), value: product.unit });
  }

  const fullDesc = localizedValue(product, 'description', lang) || "";
  const hasLongDesc = fullDesc.length > 1500;
  const shortDesc = hasLongDesc
    ? fullDesc.substring(0, Math.floor(fullDesc.length / 2))
    : fullDesc;

  return (
    <Col sm={12} lg={12}>
      <NavTabTitles
        classes={{ navClass: "nav nav-tabs nav-material" }}
        titleList={ProductDetailsTabTitle}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <TabContent className="nav-material" activeTab={activeTab}>
        {/* Description */}
        <TabPane tabId={1} className={activeTab == 1 ? "show active" : ""}>
          <div className={`product-description more-less-box ${showMore ? "more" : ""}`}>
            {hasLongDesc ? (
              showMore ? (
                <TextLimit classes={"more-text"} value={fullDesc} />
              ) : (
                <TextLimit classes={"more-text"} value={shortDesc} />
              )
            ) : (
              <TextLimit classes={"more-text"} value={fullDesc} />
            )}

            {hasLongDesc && (
              <Btn
                className="btn-solid hover-solid bg-theme btn-md scroll-button btn-sm mt-3 more-lest-btn"
                onClick={seeMore}
              >
                {showMore ? t("ShowLess") : t("ShowMore")}
                <RiArrowDownSLine />
              </Btn>
            )}
          </div>
        </TabPane>

        {/* Additional information */}
        <TabPane tabId={2} className={activeTab == 2 ? "show active" : ""}>
          {rows.length ? (
            <div className="single-product-tables">
              <Row>
                <Col xl={12}>
                  <div className="table-responsive">
                    <table className="table table-bordered mb-0">
                      <tbody>
                        {rows.map((row, index) => (
                          <tr key={index}>
                            <th style={{ width: "25%" }}>{row.label}</th>
                            <td>{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Col>
              </Row>
            </div>
          ) : (
            <p className="mb-0">{t("NoAdditionalInformation")}</p>
          )}
        </TabPane>
      </TabContent>
    </Col>
  );
};

export default ProductDetailsTab;
