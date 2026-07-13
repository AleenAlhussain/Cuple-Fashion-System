import { useTranslation } from "react-i18next";
import { localizedValue } from "@/utils/constants";

const ProductInformation = ({ productState }) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // Support both old and new (transformed) product structures
  const rawProduct = productState?.product;
  const isTransformed = rawProduct?._isTransformed;

  const sku = productState?.selectedVariation?.sku ?? rawProduct?.sku ?? "";

  const stockStatusRaw =
    productState?.selectedVariation?.stock_status ??
    rawProduct?.stock_status ??
    "in_stock";

  // Support both quantity and stock_quantity field names
  const quantity =
    productState?.selectedVariation?.quantity ??
    productState?.selectedVariation?.stock_quantity ??
    rawProduct?.quantity ??
    rawProduct?.stock_quantity ??
    0;
  const weightUnitRaw = rawProduct?.weight_unit || "kg";
  const weightUnit =
    typeof weightUnitRaw === "string" && weightUnitRaw.trim()
      ? weightUnitRaw.trim().toUpperCase()
      : "KG";
  return (
    <div className="bordered-box">
      <h4 className="sub-title">{t("ProductInformation")}</h4>

      <ul className="shipping-info">
        <li>
          {t("SKU")} : {sku}
        </li>

        {productState?.selectedVariation?.unit ? (
          <li>
            {t("Unit")} :{" "}
            {productState?.selectedVariation?.unit ??
              productState?.product?.unit}
          </li>
        ) : null}
        {productState?.product?.weight ? (
          <li>
            {t("Weight")} : {productState?.product?.weight} {weightUnit}
          </li>
        ) : null}
        <li>
          {t("StockStatus")} :
          {stockStatusRaw === "in_stock" ? t("InStock") : t("OutOfStock")}
        </li>
        <li>
          {t("Quantity")} : {quantity} {t("ItemsLeft")}
        </li>
        <li>
          {t("Categories")}:{" "}
          {productState?.product?.categories
            ?.map((category) => localizedValue(category, 'name', lang))
            .join(", ")}
        </li>
      </ul>
    </div>
  );
};

export default ProductInformation;
