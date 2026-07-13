import allPossibleCases from "../../../utils/customFunctions/AllPossibleCases";

const ProductSubmitFunction = (mutate, value, updateId) => {
  if (value["type"] == "classified") {
    delete value["quantity"];
    delete value["price"];
    delete value["sale_price"];
    delete value["discount"];
  }
  if (value["is_random_related_products"]) {
    value["related_products"] = [];
  }
  value["is_sale_enable"] = Number(value["is_sale_enable"]);
  value["is_random_related_products"] = Number(value["is_random_related_products"]);
  value["is_free_shipping"] = Number(value["is_free_shipping"]);
  value["is_featured"] = Number(value["is_featured"]);
  value["safe_checkout"] = Number(value["safe_checkout"]);
  value["secure_checkout"] = Number(value["secure_checkout"]);
  value["social_share"] = Number(value["social_share"]);
  value["encourage_order"] = Number(value["encourage_order"]);
  value["encourage_view"] = Number(value["encourage_view"]);
  value["is_trending"] = Number(value["is_trending"]);
  value["is_return"] = Number(value["is_return"]);
  value["status"] = Number(value["status"]);

  // Build all possible combinations of attribute value IDs
  // Each combination item has: { name: attributeObject, values: [selectedValueIds] }
  // We need to generate all possible combinations with proper attribute value IDs
  const buildAttributeValuesForVariation = (variationIndex) => {
    const combination = value["combination"] || [];

    // Get all selected value IDs for each attribute
    // combination[i].values contains the selected attribute value IDs for attribute i
    const attributeValueArrays = combination
      .filter(item => item?.name && Array.isArray(item?.values) && item?.values?.length > 0)
      .map(item => {
        // item.values contains the selected attribute value IDs
        // item.name is the attribute object with attribute_values array
        return item.values.map(valueId => {
          // Find the attribute value details - use loose equality for type coercion
          const attrValue = item.name?.attribute_values?.find(av => av.id == valueId);
          return {
            id: typeof valueId === 'number' ? valueId : Number(valueId) || valueId,
            attribute_id: item.name?.id,
            name: item.name?.name,
            value: attrValue?.value || valueId
          };
        });
      });

    // Generate all possible combinations
    const allCombos = allPossibleCases(attributeValueArrays);

    // Return the combination for this variation index
    return allCombos[variationIndex] || [];
  };

  value["variations"] = value?.variations?.map((elem, ind) => {
    // Calculate attribute_values from combination data at submit time
    // This ensures we always have the correct IDs regardless of useEffect timing
    let attributeValues = buildAttributeValuesForVariation(ind);

    return {
      ...elem,
      discount: null,
      status: Number(elem["status"]),
      variation_image_id: elem.variation_image_id ? elem.variation_image_id : null,
      attribute_values: attributeValues,
    };
  });
  // Put Your Logic Here
};

export default ProductSubmitFunction;
