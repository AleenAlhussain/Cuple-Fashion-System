import { useSettings } from "@/utils/hooks/useSettings";
import TextLimit from "@/utils/customFunctions/TextLimit";
import { getVariationAttribute } from "@/utils/productVariantMedia";
import React from "react";
import { useTranslation } from "react-i18next";

const RightVariationModal = ({ cloneVariation }) => {
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const { t } = useTranslation("common");
  const currentVariation = cloneVariation?.selectedVariation || null;
  const currentSku =
    currentVariation?.sku ||
    cloneVariation?.product?.sku ||
    cloneVariation?.product?.article ||
    "";
  const currentSalePrice = currentVariation?.sale_price ?? cloneVariation?.product?.sale_price;
  const currentRegularPrice = currentVariation?.price ?? cloneVariation?.product?.price;
  const currentDiscount = currentVariation?.discount ?? cloneVariation?.product?.discount ?? null;
  const currentDisplayPrice =
    Number(currentSalePrice) > 0 ? currentSalePrice : currentRegularPrice;
  const selectedColor =
    getVariationAttribute(currentVariation, cloneVariation?.product, "color")?.value ||
    cloneVariation?.product?.matchi_locked_color_name ||
    "";
  const selectedSize =
    getVariationAttribute(currentVariation, cloneVariation?.product, "size")?.value ||
    "";

  return (
    <>
      <h2 className="main-title">
        {currentVariation?.name || cloneVariation?.product?.name}
      </h2>
      <div className="price-text">
        <h3>
          <span className="text-dark fw-normal">MRP:</span>
          {convertCurrency(currentDisplayPrice)}
          {currentDiscount ? <del>{convertCurrency(currentRegularPrice)}</del> : null}
          {currentDiscount ? (
            <span className="discounted-price">
              {currentDiscount}% {t("Off")}
            </span>
          ) : null}
        </h3>
        <span>{t("InclusiveAllTheText")} </span>

        {(selectedColor || (currentVariation && (currentSku || selectedSize))) && (
          <div
            style={{
              display: "grid",
              gap: "8px",
              marginTop: "10px",
              color: "#7f7f7f",
            }}
          >
            {currentVariation && currentSku ? (
              <p style={{ margin: 0 }}>
                <span className="text-dark fw-semibold">{t("SKU")}:</span>{" "}
                {currentSku}
              </p>
            ) : null}

            {selectedColor ? (
              <p style={{ margin: 0 }}>
                <span className="text-dark fw-semibold">{t("Color")}:</span>{" "}
                {selectedColor}
              </p>
            ) : null}

            {selectedSize ? (
              <p style={{ margin: 0 }}>
                <span className="text-dark fw-semibold">{t("Size")}:</span>{" "}
                {selectedSize}
              </p>
            ) : null}
          </div>
        )}
      </div>
      <TextLimit classes="description-text" value={cloneVariation?.product?.short_description} maxLength={200} tag={"p"} />
    </>
  );
};

export default RightVariationModal;
