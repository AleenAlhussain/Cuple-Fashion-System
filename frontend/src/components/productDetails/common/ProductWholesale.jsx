import { useSettings } from "@/utils/hooks/useSettings";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

const ProductWholesale = ({ productState }) => {
  const { t } = useTranslation("common");
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  return (
    <>
      <table className="table mt-2 mb-4 modal-table">
        <thead>
          <tr>
            <th className="border-top-0">{t("MinQTY")}</th>
            <th className="border-top-0">{t("MaxQTY")}</th>
            <th className="border-top-0">{productState.product?.wholesale_price_type == "fixed" ? t("UnitPrice") : t("Percentage")}</th>
          </tr>
        </thead>
        <tbody>
          {productState?.product?.wholesales?.map((wholesale, i) => (
            <tr key={i}>
              <td>{wholesale.min_qty}</td>
              <td>{wholesale.max_qty}</td>
              <td>{productState.product?.wholesale_price_type == "fixed" ? convertCurrency(wholesale.value) : wholesale.value + "% " + t("Off")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default ProductWholesale;
