import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AccordionBody, AccordionHeader, AccordionItem, Input, Label } from "reactstrap";

const CollectionSizes = ({
  sizes = [],
  filter,
  setFilter,
  isOffCanvas,
  targetId = "3",
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation("common");

  const checkSize = (value) => {
    const filterArray = filter?.size || [];
    return filterArray?.includes(value);
  };

  const applySize = (event) => {
    const filterArray = filter.size || [];
    const index = filterArray.indexOf(event?.target?.value);
    let temp = [...filterArray];

    if (event.target.checked) {
      temp.push(event?.target?.value);
    } else {
      temp.splice(index, 1);
    }

    setFilter((prev) => ({
      ...prev,
      size: temp,
      page: 1,
    }));

    const params = new URLSearchParams(searchParams?.toString());
    if (temp.length > 0) {
      params.set("size", temp.join(","));
    } else {
      params.delete("size");
    }
    params.delete("page");

    const queryParams = params.toString();
    router.push(queryParams ? `${pathname}?${queryParams}` : pathname);
  };

  if (!sizes?.length) return null;

  return (
    <AccordionItem className={`open ${isOffCanvas ? "col-lg-3" : ""}`}>
      <AccordionHeader targetId={targetId}>
        <span>{t("Size")}</span>
      </AccordionHeader>
      <div className="collapse show accordion-collapse">
        <AccordionBody accordionId={targetId}>
          <div className="custom-sidebar-height">
            <ul className="shop-category-list">
              {sizes.map((sizeItem) => (
                <li
                  className="form-check collection-filter-checkbox"
                  key={sizeItem.id}
                >
                  <Input
                    className="checkbox_animated"
                    type="checkbox"
                    value={sizeItem.value}
                    id={`size-${sizeItem.id}`}
                    checked={checkSize(sizeItem.value)}
                    onChange={(e) => applySize(e)}
                  />
                  <Label className="form-check-label" htmlFor={`size-${sizeItem.id}`}>
                    {sizeItem.value}
                    {sizeItem.count > 0 && (
                      <span className="text-muted ms-1">({sizeItem.count})</span>
                    )}
                  </Label>
                </li>
              ))}
            </ul>
          </div>
        </AccordionBody>
      </div>
    </AccordionItem>
  );
};

export default CollectionSizes;
