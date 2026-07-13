import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  AccordionBody,
  AccordionHeader,
  AccordionItem,
  Input,
  Label,
} from "reactstrap";

const CollectionAttributes = ({
  colors = [],
  filter,
  setFilter,
  isOffCanvas,
  targetId = "2",
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation("common");

  // Get the filter value - use filter_value (ID) if available, otherwise color_code
  const getFilterValue = (colorItem) => {
    return colorItem.filter_value || colorItem.id?.toString() || colorItem.color_code;
  };

  const checkAttribute = (value) => {
    const filterArray = filter?.color || [];
    return filterArray?.includes(value);
  };

  const applyAttribute = (event) => {
    const filterArray = filter.color || [];
    const index = filterArray.indexOf(event?.target?.value);
    let temp = [...filterArray];

    if (event.target.checked) {
      temp.push(event?.target?.value);
    } else {
      temp.splice(index, 1);
    }

    setFilter((prev) => ({
      ...prev,
      color: temp,
      page: 1,
    }));

    const params = new URLSearchParams(searchParams?.toString());
    if (temp.length > 0) {
      params.set("color", temp.join(","));
    } else {
      params.delete("color");
    }
    params.delete("page");

    const queryParams = params.toString();
    router.push(queryParams ? `${pathname}?${queryParams}` : pathname);
  };

  if (!colors?.length) return null;

  return (
    <AccordionItem className={`open ${isOffCanvas ? "col-lg-3" : ""}`}>
      <AccordionHeader targetId={targetId}>
        <span>{t("Colour")}</span>
      </AccordionHeader>
      <div className="collapse show accordion-collapse ">
        <AccordionBody accordionId={targetId}>
          <div className="custom-sidebar-height">
            <ul className="shop-category-list">
              {colors.map((colorItem, index) => {
                const filterValue = getFilterValue(colorItem);
                return (
                  <li
                    className="form-check collection-filter-checkbox"
                    key={colorItem.id ?? index}
                  >
                    <Input
                      className="checkbox_animated"
                      type="checkbox"
                      value={filterValue}
                      id={`color-${colorItem.id ?? index}`}
                      checked={checkAttribute(filterValue)}
                      onChange={(e) => applyAttribute(e)}
                    />
                    <Label
                      className="form-check-label color-label-box"
                      htmlFor={`color-${colorItem.id ?? index}`}
                    >
                      <div
                        className="color-box"
                        style={{ backgroundColor: colorItem.color_code }}
                      ></div>
                      <span className="name">{colorItem.color || colorItem.value}</span>
                      {colorItem.count > 0 && (
                        <span className="text-muted ms-1">({colorItem.count})</span>
                      )}
                    </Label>
                  </li>
                );
              })}
            </ul>
          </div>
        </AccordionBody>
      </div>
    </AccordionItem>
  );
};

export default CollectionAttributes;
