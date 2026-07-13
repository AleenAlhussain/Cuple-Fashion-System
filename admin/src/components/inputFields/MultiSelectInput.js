import { ErrorMessage } from "formik";
import { RiCloseLine } from "react-icons/ri";
import { handleModifier } from "../../utils/validation/ModifiedErrorMessage";
import { useTranslation } from "react-i18next";

const MultiSelectInput = ({ values, name, selectedItems, setIsComponentVisible, setFieldValue, setSelectedItems, errors, getValuesKey, initialTittle }) => {
  const { t } = useTranslation("common");

  // Helper to filter out a value (handles type coercion and mixed formats)
  const filterValue = (arr, valToRemove) => {
    return arr.filter(v => {
      const arrVal = typeof v === 'object' && v !== null ? v.id : v;
      const removeVal = typeof valToRemove === 'object' && valToRemove !== null ? valToRemove.id : valToRemove;
      return arrVal != removeVal; // Loose inequality to handle type mismatches
    });
  };

  const handleRemoveItem = (e, item) => {
    e.stopPropagation();
    const itemId = item[getValuesKey];
    const currentValues = values[name];

    // Remove from selectedItems display
    setSelectedItems((p) => p.filter((elem) => elem[getValuesKey] != itemId));

    // Remove from form values
    if (Array.isArray(currentValues)) {
      const newValues = filterValue(currentValues, itemId);
      setFieldValue(name, newValues);
    } else {
      setFieldValue(name, undefined);
    }
  };

  return (
    <>
      <div className={`bootstrap-tagsinput form-select`} onClick={() => setIsComponentVisible((p) => p !== name && name)}>
        {(Array.isArray(values[name]) && values[name].length > 0 && selectedItems?.length > 0) || (!Array.isArray(values[name]) && values[name]) ? (
          selectedItems?.map((item, i) => (
            <span className="tag label label-info" key={i}>
              {item.name || item.title}
              <a>
                <RiCloseLine onClick={(e) => handleRemoveItem(e, item)} />
              </a>
            </span>
          ))
        ) : (
          <span>{t(initialTittle ? initialTittle : "Select")}</span>
        )}
      </div>
      <ErrorMessage
        name={name}
        render={(msg) => (
          <div className="invalid-feedback d-block">
            {t(handleModifier(name))} {t("IsRequired")}
          </div>
        )}
      />
    </>
  );
};

export default MultiSelectInput;
