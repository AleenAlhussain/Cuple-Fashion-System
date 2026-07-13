import React from "react";
import { useTranslation } from "react-i18next";

/**
 * DiscountSummary - Displays rule-based discounts from the Offer Engine
 *
 * @param {Array} appliedDiscounts - Array of applied discounts from useCartDiscount
 * @param {boolean} isCalculating - Whether discounts are being calculated
 * @param {Function} convertCurrency - Currency conversion function
 */
const DiscountSummary = ({
  appliedDiscounts = [],
  isCalculating = false,
  convertCurrency = (v) => v,
}) => {
  const { t } = useTranslation("common");

  if (isCalculating) {
    return (
      <li className="text-muted discount-calculating">
        <span className="discount-loading-text">{t("Calculating discounts")}...</span>
      </li>
    );
  }

  if (!appliedDiscounts?.length) {
    return null;
  }

  return (
    <>
      {appliedDiscounts.map((discount, index) => (
        <li key={`discount-${index}`} className="text-success offer-discount-line">
          <span className="discount-name">
            {discount.name || t("Discount")}
            {discount.description && (
              <small className="discount-description d-block text-muted">
                {discount.description}
              </small>
            )}
          </span>
          <span className="count text-success">
            -{convertCurrency(Number(discount.amount || 0).toFixed(2))}
          </span>
        </li>
      ))}
    </>
  );
};

export default DiscountSummary;
