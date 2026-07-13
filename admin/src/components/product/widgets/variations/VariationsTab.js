import { attribute } from "@/utils/axiosUtils/API";
import { useEffect } from "react";
import Btn from "../../../../elements/buttons/Btn";
import request from "../../../../utils/axiosUtils";
import allPossibleCases from "../../../../utils/customFunctions/AllPossibleCases";
import getStringId from "../../../../utils/customFunctions/getStringId";
import VariationsForm from "./VariationsForm"
import VariationTop from "./VariationTop"
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const VariationsTab = ({ values, setFieldValue, errors, updateId }) => {
  const router = useRouter();
  const { data } = useCustomQuery([attribute], () => request({ url: attribute }, router), { refetchOnWindowFocus: false, select: (data) => data.data.data });
  useEffect(() => {
    setFieldValue("attribute_values", values["options"]?.map((item) => item.values).flat(Infinity));
    // set our combination in values obj
    setFieldValue("variation_options", allPossibleCases(values["combination"]?.map((item) => item?.values?.map((elem) => ({ name: item.name?.name, value: item.name.attribute_values?.find((attr) => attr.id == elem)?.value })))))
  }, [values["combination"]]);

  useEffect(() => {
    getNewVariations()
  }, [values["variation_options"]]);
  // Helper to generate variant name from attribute values (e.g., "40/Black/Leather")
  const generateVariantName = (opt) => {
    if (!Array.isArray(opt)) return '';
    return opt.map(item => item.value).join('/');
  };

  // Helper to generate variant SKU from product SKU and attribute values (e.g., "F24K100112SSF71029")
  const generateVariantSku = (opt) => {
    if (!Array.isArray(opt)) return '';
    const productSku = values.sku || 'VAR';
    // Concatenate attribute values without separators, removing spaces
    const attrPart = opt.map(item => String(item.value).replace(/\s+/g, '')).join('');
    return `${productSku}${attrPart}`;
  };

  const getNewVariations = () => {
    let temp_variations = []
    const variations_val = values['variations'] || []
    const usedVariantIds = new Set(); // Track which variants we've already used

    values['variation_options']?.forEach((opt, ind) => {
      const att_vals = opt.map((val) => val.value)

      // Try exact match only - all attribute values must match exactly
      let variant_val = variations_val.find(({ attribute_values, id }) => {
        // Skip if we already used this variant
        if (id && usedVariantIds.has(id)) return false;

        // Must have same number of attributes
        if (attribute_values?.length !== att_vals.length) return false;

        // All values must match
        return attribute_values?.every(({ value }) => att_vals.includes(value));
      });

      // Mark this variant as used to prevent reuse
      if (variant_val?.id) {
        usedVariantIds.add(variant_val.id);
      }

      // Generate name and SKU from attribute values
      const generatedName = generateVariantName(opt);
      const generatedSku = generateVariantSku(opt);

      // Default object for new variants with auto-generated name and SKU
      const addObject = {
        stock_status: 'in_stock',
        status: true,
        price: 0,
        sale_price: 0,
        quantity: 0,
        sku: generatedSku,
        name: generatedName
      }

      if (variant_val) {
        // Preserve all original fields, update name if empty, and update status
        temp_variations.push({
          ...variant_val,
          // Update name if it was empty or auto-generate new one
          name: variant_val.name || generatedName,
          // Keep existing SKU or generate new one if empty
          sku: variant_val.sku || generatedSku,
          status: Boolean(variant_val?.status),
          stock_status: (variant_val.quantity > 0 || variant_val.stock_quantity > 0) ? 'in_stock' : (variant_val.stock_status || 'in_stock')
        });
      } else {
        // Create new variant with auto-generated name and SKU
        temp_variations.push(addObject);
      }
    })

    if (temp_variations.length > 0) {
      setFieldValue("variations", temp_variations)
    }
  }

  // Move variant up in the list
  const handleMoveUp = (index) => {
    if (index <= 0) return;

    // Swap variation_options
    const newVariationOptions = [...(values["variation_options"] || [])];
    [newVariationOptions[index - 1], newVariationOptions[index]] = [newVariationOptions[index], newVariationOptions[index - 1]];

    // Swap variations
    const newVariations = [...(values["variations"] || [])];
    [newVariations[index - 1], newVariations[index]] = [newVariations[index], newVariations[index - 1]];

    setFieldValue("variation_options", newVariationOptions);
    setFieldValue("variations", newVariations);
  };

  // Move variant down in the list
  const handleMoveDown = (index) => {
    const length = values["variation_options"]?.length || 0;
    if (index >= length - 1) return;

    // Swap variation_options
    const newVariationOptions = [...(values["variation_options"] || [])];
    [newVariationOptions[index], newVariationOptions[index + 1]] = [newVariationOptions[index + 1], newVariationOptions[index]];

    // Swap variations
    const newVariations = [...(values["variations"] || [])];
    [newVariations[index], newVariations[index + 1]] = [newVariations[index + 1], newVariations[index]];

    setFieldValue("variation_options", newVariationOptions);
    setFieldValue("variations", newVariations);
  };

  // Delete a variant
  const handleDeleteVariant = (index) => {
    const variantToDelete = values["variations"]?.[index];

    // Track deleted variant ID for backend deletion
    if (variantToDelete?.id) {
      const currentDeleted = values["deleted_variant_ids"] || [];
      setFieldValue("deleted_variant_ids", [...currentDeleted, variantToDelete.id]);
    }

    // Remove from variation_options
    const newVariationOptions = [...(values["variation_options"] || [])];
    newVariationOptions.splice(index, 1);

    // Remove from variations
    const newVariations = [...(values["variations"] || [])];
    newVariations.splice(index, 1);

    setFieldValue("variation_options", newVariationOptions);
    setFieldValue("variations", newVariations);
  };

  // Clear all variants
  const handleClearAllVariants = () => {
    // Track all existing variant IDs for backend deletion
    const existingIds = (values["variations"] || [])
      .filter(v => v?.id)
      .map(v => v.id);

    if (existingIds.length > 0) {
      const currentDeleted = values["deleted_variant_ids"] || [];
      setFieldValue("deleted_variant_ids", [...currentDeleted, ...existingIds]);
    }

    // Clear all
    setFieldValue("variation_options", []);
    setFieldValue("variations", []);
    setFieldValue("combination", [{}]);
  };

  return (
    <div className="variant-box border-top-0">
      {values["combination"]?.map((elem, i) => (
        <VariationTop key={i} index={i} data={data} setFieldValue={setFieldValue} values={values} />
      ))}
      <div className="save-back-button">
        <Btn className="btn-primary mb-4" title="AddVariation" onClick={() => setFieldValue("combination", [...values["combination"], {}])} />
      </div>
      {values["variation_options"]?.length >= 1 && (
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3 className="form-label-title mb-0">Variants</h3>
          <Btn
            className="btn-outline-danger btn-sm"
            title="ClearAll"
            onClick={() => {
              if (window.confirm("Are you sure you want to delete all variants? This cannot be undone.")) {
                handleClearAllVariants();
              }
            }}
          />
        </div>
      )}
      {values["variation_options"]?.map((elem, i) => (
        <VariationsForm
          elem={elem}
          values={values}
          setFieldValue={setFieldValue}
          key={i}
          index={i}
          newId={getStringId(elem)}
          errors={errors}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDelete={handleDeleteVariant}
          isFirst={i === 0}
          isLast={i === (values["variation_options"]?.length || 0) - 1}
        />
      ))}
    </div>
  );
};

export default VariationsTab;
