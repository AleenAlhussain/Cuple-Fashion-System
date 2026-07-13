import { FilterSortData } from "@/data/CustomData";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";

const FilterSort = ({ filter, setFilter }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggle = () => setDropdownOpen((prevState) => !prevState);
  const searchParams = useSearchParams();
  const { t } = useTranslation("common");
  const router = useRouter();
  const pathname = usePathname();
  const handleSort = (data) => {
    setFilter((prev) => {
      return {
        ...prev,
        sortBy: data.value,
        field: data && (data.value == "asc" || data.value == "desc") ? "created_at" : null,
      };
    });

    const params = new URLSearchParams(searchParams?.toString());
    params.set("sortBy", data.value);
    if (data && (data.value == "asc" || data.value == "desc")) {
      params.set("field", "created_at");
    } else {
      params.delete("field");
    }
    params.delete("page");

    const queryParams = params.toString();
    router.push(queryParams ? `${pathname}?${queryParams}` : pathname);
  };
  return (
    <div className="product-page-per-view">
      <Dropdown isOpen={dropdownOpen} toggle={toggle}>
        <DropdownToggle caret>{t(FilterSortData.find((elem) => elem.value == filter.sortBy)?.label || t("Sort"))}</DropdownToggle>
        <DropdownMenu>
          <div>
            {FilterSortData.map((elem, i) => (
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
