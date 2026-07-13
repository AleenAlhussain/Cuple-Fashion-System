import { useSettings } from "@/utils/hooks/useSettings";
import { localizedValue } from "@/utils/constants";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";

const CartVariationNameDetails = ({ cloneVariation }) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };

  // Get the correct price - check cart item's stored price first, then variant, then product
  const getDisplayPrice = () => {
    // Use stored cart item price first (set by CartState from selected variant)
    if (cloneVariation?.price && cloneVariation.price > 0) {
      return cloneVariation.price;
    }
    // Check variant sale price (only if > 0)
    const variantSalePrice = parseFloat(cloneVariation?.variation?.sale_price);
    if (variantSalePrice > 0) return variantSalePrice;
    // Check variant regular price
    const variantPrice = parseFloat(cloneVariation?.variation?.price);
    if (variantPrice > 0) return variantPrice;
    // Fallback to product prices
    const productSalePrice = parseFloat(cloneVariation?.product?.sale_price);
    if (productSalePrice > 0) return productSalePrice;
    return parseFloat(cloneVariation?.product?.price) || 0;
  };

  const displayPrice = getDisplayPrice();
  const discount = cloneVariation?.variation?.discount ?? cloneVariation?.product?.discount;

  return (
    <div className="product-right product-page-details variation-title">
      <h2 className="main-title">
        <Link href={`/product/${cloneVariation?.product?.slug}`}> {localizedValue(cloneVariation?.variation, 'name', lang) || localizedValue(cloneVariation?.product, 'name', lang)} </Link>
      </h2>
      <h3 className="price-detail">
        {convertCurrency(displayPrice)}
        {discount > 0 && (
          <span>
            {discount}% {t("off")}
          </span>
        )}
      </h3>
    </div>
  );
};

export default CartVariationNameDetails;
