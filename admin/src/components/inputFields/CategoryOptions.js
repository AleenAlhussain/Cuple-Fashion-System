import { useTranslation } from "react-i18next";
import Image from "next/image";
import resolveMediaUrl from "@/utils/customFunctions/resolveMediaUrl";
import { RiArrowRightSLine } from "react-icons/ri";

const CategoryOptions = ({ data, showList, setShowList, setFieldValue, setPath, name, values, getValuesKey }) => {
  const { t } = useTranslation( 'common');

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

  const handleSelect = (item) => {
    // Always treat as multi-select - initialize as empty array if needed
    const currentValues = Array.isArray(values[name]) ? values[name] : [];
    const itemId = item[getValuesKey];

    if (valueExists(currentValues, itemId)) {
      // Remove from selection
      const newValues = currentValues.filter((elem) => {
        const elemVal = typeof elem === 'object' && elem !== null ? elem.id : elem;
        return elemVal != itemId; // Use loose inequality
      });
      setFieldValue(name, newValues);
    } else {
      // Add to selection - always store as ID
      setFieldValue(name, [...currentValues, itemId]);
    }
  }
  // Helper to check if item is selected (for display)
  const isSelected = (item) => {
    const currentValues = values[name];
    const itemId = item[getValuesKey];

    // For array values (multi-select)
    if (Array.isArray(currentValues)) {
      return valueExists(currentValues, itemId);
    }
    // For single values
    return currentValues == itemId;
  };

  return (
    <>
      {showList?.map((item, i) => (
        <li key={i}>
          {(item?.image_url || item?.image) && (
            <Image
              src={resolveMediaUrl(item.image_url || item.image) || "/assets/images/placeholder/collection_category.png"}
              className="img-fluid category-image"
              alt={item.name}
              height={80}
              width={80}
            />
          )}
          <div className="category-text">
            {Array.isArray(item?.searchPath) && item.searchPath.length > 0 ? (
              <span className="category-path">{item.searchPath.join(" / ")}</span>
            ) : null}
            <span className="category-name">{item?.name || item?.title}</span>
          </div>
          <a className={`select-btn ${isSelected(item) ? "selected" : ""}`}
            onClick={() => handleSelect(item)}>
            {isSelected(item) ? t("Selected") : t("Select")}
          </a>
          {Boolean((item?.subcategories?.length) || (item?.child?.length)) && (
            <a
              className="right-arrow"
              onClick={() => { setShowList(item?.subcategories || item?.child); setPath((prev) => [...prev, item]) }}>
              <RiArrowRightSLine />
            </a>
          )}
        </li>
      ))}
    </>
  );
};

export default CategoryOptions;
