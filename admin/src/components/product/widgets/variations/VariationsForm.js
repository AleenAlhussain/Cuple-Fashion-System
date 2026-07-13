import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiArrowDownSLine, RiArrowUpLine, RiArrowDownLine, RiDeleteBinLine } from "react-icons/ri";
import CheckBoxField from "../../../inputFields/CheckBoxField";
import FileUploadField from "../../../inputFields/FileUploadField";
import SearchableSelectInput from "../../../inputFields/SearchableSelectInput";
import SimpleInputField from "../../../inputFields/SimpleInputField";

const VariationsForm = ({ values, setFieldValue, newId, index, elem, onMoveUp, onMoveDown, onDelete, isFirst, isLast }) => {
  const { t } = useTranslation("common");
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Get the specific variation_option for THIS variation index
    const variationOption = values["variation_options"]?.[index];
    if (!variationOption) return;

    // Map variation_option to attribute_values with IDs
    // variationOption is like: [{ name: "Color", value: "Red" }, { name: "Size", value: "S" }]
    // We need to find the attribute value IDs from the combination data
    const attributeValues = variationOption.map((opt) => {
      // Find the matching combination item by attribute name
      const combinationItem = values["combination"]?.find(
        (item) => item.name?.name === opt.name
      );
      if (!combinationItem) return null;

      // Find the attribute value ID that matches this value
      const attrValue = combinationItem.name?.attribute_values?.find(
        (av) => av.value === opt.value
      );

      // Must have a valid attribute value ID
      if (!attrValue?.id) {
        console.warn(`Could not find attribute value ID for ${opt.name}: ${opt.value}`);
        return null;
      }

      return {
        id: attrValue.id, // The attribute value ID (must be numeric)
        attribute_id: combinationItem.name?.id, // The attribute ID
        name: opt.name,
        value: opt.value,
      };
    }).filter(Boolean);

    setFieldValue(`variations[${index}][attribute_values]`, attributeValues);
  }, [values["variation_options"], index]);

  // Calculate discount percentage when sale_price changes (for display)
  // But allow direct editing of sale_price
  const calculateDiscountFromSalePrice = () => {
    const priceValue = parseFloat(values[`variations`]?.[index]?.price) || 0;
    const salePriceValue = parseFloat(values[`variations`]?.[index]?.sale_price) || 0;
    if (priceValue > 0 && salePriceValue > 0 && salePriceValue < priceValue) {
      const discount = ((priceValue - salePriceValue) / priceValue) * 100;
      return Math.round(discount * 100) / 100; // Round to 2 decimals
    }
    return 0;
  };

  // Get the SKU for this variation
  const variationSku = values[`variations`]?.[index]?.sku || '';
  const variationPrice = values[`variations`]?.[index]?.price || '';
  const variationStock = values[`variations`]?.[index]?.quantity || values[`variations`]?.[index]?.stock_quantity || 0;

  const handleMoveUp = (e) => {
    e.stopPropagation();
    if (onMoveUp) onMoveUp(index);
  };

  const handleMoveDown = (e) => {
    e.stopPropagation();
    if (onMoveDown) onMoveDown(index);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete && window.confirm(t("Are you sure you want to delete this variant?"))) {
      onDelete(index);
    }
  };

  return (
    <div className="shipping-accordion-custom" key={index}>
      <div className="p-3 rule-dropdown d-flex justify-content-between align-items-center" onClick={() => setActive((prev) => prev !== elem.id && elem.id)}>
        <div className="d-flex flex-column flex-md-row gap-2 align-items-md-center">
          <div className="d-flex align-items-center gap-1 me-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary p-1"
              onClick={handleMoveUp}
              disabled={isFirst}
              title="Move Up"
              style={{ lineHeight: 1, opacity: isFirst ? 0.5 : 1 }}
            >
              <RiArrowUpLine size={16} />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary p-1"
              onClick={handleMoveDown}
              disabled={isLast}
              title="Move Down"
              style={{ lineHeight: 1, opacity: isLast ? 0.5 : 1 }}
            >
              <RiArrowDownLine size={16} />
            </button>
            <button
              type="button"
              className="btn btn-sm p-1 ms-2"
              onClick={handleDelete}
              title={t("Delete Variant")}
              style={{ lineHeight: 1 }}
            >
              <RiDeleteBinLine size={16} />
            </button>
          </div>
          <span className="fw-bold">{newId}</span>
          {variationSku && (
            <span className="badge bg-primary ms-2">SKU: {variationSku}</span>
          )}
          {variationPrice && (
            <span className="text-muted small ms-2">Price: {variationPrice} AED</span>
          )}
          <span className={`badge ms-2 ${variationStock > 0 ? 'bg-success' : 'bg-danger'}`}>
            Stock: {variationStock}
          </span>
        </div>
        <RiArrowDownSLine />
      </div>
      {active === elem.id && (
        <div className="rule-edit-form">
          <SimpleInputField
            nameList={[
              { name: `variations[${index}][name]`, title: "name", placeholder: "Enter Name", require: "true", errormsg: "Name" },
              { name: `variations[${index}][price]`, title: "price", type: "number", placeholder: "Enter Price", require: "true", inputaddon: "true", errormsg: "Price", min: "0" },
              { name: `variations[${index}][sale_price]`, title: "Sale Price", type: "number", inputaddon: "true", placeholder: "Enter Sale Price", min: "0" },
              { name: `variations[${index}][quantity]`, title: "Stock Quantity", type: "number", require: "true", errormsg: "Quantity", placeholder: "Enter Quantity" },
              { name: `variations[${index}][sku]`, title: "sku", require: "true", placeholder: "Enter SKU", errormsg: "SKU" },
            ]}
          />
          <SearchableSelectInput
            nameList={[
              {
                name: `variations[${index}][stock_status]`,
                require: "true",
                inputprops: {
                  name: `variations[${index}][stock_status]`,
                  id: `variations[${index}][stock_status]`,
                  options: [
                    { id: "in_stock", name: "InStock" },
                    { id: "out_of_stock", name: "OutOfStock" },
                  ],
                },
                title: "StockStatus",
              },
            ]}
          />

          <FileUploadField name={`variations[${index}][variation_image_id]`} id={`variations[${index}][variation_image_id]`} uniquename={values[`variations`][index]["variation_image"]} type="file" values={values} setFieldValue={setFieldValue} title="image" />
          <CheckBoxField name={`variations[${index}][status]`} title="status" require="true" />
        </div>
      )}
    </div>
  );
};

export default VariationsForm;
