import { useEffect, useState } from "react";
import InputWrapper from "../../utils/hoc/InputWrapper";
import useOutsideDropdown from "../../utils/hooks/customHooks/useOutsideDropdown";
import MultiDropdownBox from "./MultiDropdownBox";
import MultiSelectInput from "./MultiSelectInput";

const MultiSelectField = ({ setFieldValue, values, name, getValuesKey = "id", data, errors, helpertext,initialTittle  }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const { ref, isComponentVisible, setIsComponentVisible } = useOutsideDropdown();

  // Helper to check if a value exists in the array (handles type coercion)
  const valueExists = (arr, val) => {
    if (!Array.isArray(arr)) return false;
    return arr.some(v => {
      // Handle both raw IDs and objects with id property
      const arrVal = typeof v === 'object' && v !== null ? v.id : v;
      const checkVal = typeof val === 'object' && val !== null ? val.id : val;
      // Use loose equality to handle string/number type mismatches
      return arrVal == checkVal;
    });
  };

  const SelectedItemFunction = (dataItems) => {
    for (let i = 0; i < dataItems?.length; i++) {
      const itemId = dataItems[i][getValuesKey];
      const currentValues = values[name];

      // Check if this item is selected
      const isSelected =
        // Single value match (loose equality)
        currentValues == itemId ||
        // Array with matching value (handles type coercion)
        valueExists(currentValues, itemId);

      if (isSelected) {
        setSelectedItems((p) => (p ? [...p, dataItems[i]] : [dataItems[i]]));
      }
      if (dataItems[i].subcategories?.length > 0) {
        SelectedItemFunction(dataItems[i].subcategories);
      }
      // childs
      if (dataItems[i].child?.length > 0) {
        SelectedItemFunction(dataItems[i].child);
      }
    }
  };
  useEffect(() => {
    setSelectedItems([]);
    if (data) {
      SelectedItemFunction(data);
    }
  }, [values?.[name], data]);
  return (
    <div className="category-select-box" ref={ref}>
      <MultiSelectInput initialTittle={initialTittle} values={values} name={name} data={data} selectedItems={selectedItems} setIsComponentVisible={setIsComponentVisible} setFieldValue={setFieldValue} setSelectedItems={setSelectedItems} errors={errors} getValuesKey={getValuesKey} />
      {helpertext && <p className="help-text">{helpertext}</p>}
      <MultiDropdownBox  data={data} values={values} setIsComponentVisible={setIsComponentVisible} setFieldValue={setFieldValue} name={name} getValuesKey={getValuesKey} isComponentVisible={isComponentVisible} />
    </div>
  );
};


export default InputWrapper(MultiSelectField);
