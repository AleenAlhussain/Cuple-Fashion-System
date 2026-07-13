import { FilterSortData } from "@/data/CustomData";
import { useCustomSearchParams } from "@/utils/hooks/useCustomSearchParams";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";

const FilterSort = ({ filter, setFilter }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggle = () => setDropdownOpen((prevState) => !prevState);
  const [attribute, price, category, layout] = useCustomSearchParams(["attribute", "price", "category", "layout"]);

  const { t } = useTranslation("common");
  const router = useRouter();
  const pathname = usePathname();
  const handleSort = (data) => {
    let queryParams = new URLSearchParams({ ...attribute, ...price, ...category, ...layout, sortBy: data.value }).toString();
    if (data && (data.value == "asc" || data.value == "desc")) {
      const fieldQuery = new URLSearchParams();
      fieldQuery.append("field", "created_at");
      queryParams += "&" + fieldQuery.toString();
    }
    router.push(`${pathname}?${queryParams}`);
  };
  return (
    <div className="product-page-per-view">
      <Dropdown isOpen={dropdownOpen} toggle={toggle}>
        <DropdownToggle caret>
          <span>{t(FilterSortData.find((elem) => elem.value == filter.sortBy)?.label || t("Sort"))}</span>
        </DropdownToggle>
        <DropdownMenu>
          <div className="dropdown-box">
            {FilterSortData?.map((elem, i) => (
              <DropdownItem key={i} onClick={() => handleSort(elem)}>
                {t(elem.label)}
              </DropdownItem>
            ))}
          </div>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
};

export default FilterSort;
