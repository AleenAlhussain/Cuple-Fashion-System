import { useEffect } from "react";
import SimpleInputField from "../inputFields/SimpleInputField";
import { useTranslation } from "react-i18next";

const InventoryTab = ({ values, setFieldValue, errors, updateId, touched, setErrors, setTouched }) => {
  const { t } = useTranslation("common");

  // Auto-set type to Variable Product
  useEffect(() => {
    if (values["type"] !== "classified") {
      setFieldValue("type", "classified");
    }
  }, []);

  return (
    <>
      {/* Product Type - Fixed as Variable Product */}
      <div className="mb-3">
        <label className="form-label">{t("ProductType")}</label>
        <input
          type="text"
          className="form-control"
          value="Variable Product"
          disabled
        />
        <small className="text-muted">All products are variable products with variants</small>
      </div>

      {/* SKU Only - Stock managed per variant */}
      <SimpleInputField
        nameList={[
          { name: "sku", title: "SKU", require: "true", placeholder: t("EnterSKU") },
        ]}
      />

      {/* Note about stock management */}
      <div className="alert alert-info mb-3">
        <small>
          <i className="ri-information-line me-1"></i>
          Stock quantity and pricing are managed in the <strong>Variations</strong> tab for each variant.
        </small>
      </div>
    </>
  );
};
export default InventoryTab;
