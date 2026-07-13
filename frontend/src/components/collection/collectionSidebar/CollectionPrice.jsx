import { FilterPrice } from "@/data/CustomData";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AccordionBody, AccordionHeader, AccordionItem, Input, Label } from "reactstrap";

const CollectionPrice = ({
  filter,
  setFilter,
  isOffCanvas,
  targetId = "4",
  priceBuckets = [],
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const checkPrice = (value) => (filter?.price || []).includes(value);
  const options = useMemo(() => {
    if (priceBuckets?.length) {
      return priceBuckets.map((bucket, index) => ({
        id: index + 1,
        value: bucket.key,
        label: bucket.label,
        count: bucket.count,
      }));
    }

    return FilterPrice;
  }, [priceBuckets]);

  const applyPrice = (event) => {
    const value = event?.target?.value;
    const checked = event?.target?.checked;
    const temp = checked ? [value] : [];

    setFilter((prev) => ({
      ...prev,
      price: temp,
      page: 1,
    }));

    const params = new URLSearchParams(searchParams?.toString());
    if (temp.length > 0) {
      params.set("price", temp[0]);
      params.set("price_bucket", temp[0]);
    } else {
      params.delete("price");
      params.delete("price_bucket");
    }
    params.delete("page");

    const queryParams = params.toString();
    router.push(queryParams ? `${pathname}?${queryParams}` : pathname);
  };

  return (
    <AccordionItem className={`open ${isOffCanvas ? "col-lg-3" : ""}`}>
      <AccordionHeader targetId={targetId}>
        <span>{t("Price")}</span>
      </AccordionHeader>
      <AccordionBody accordionId={targetId}>
        <div className="custom-sidebar-height">
          <ul className="shop-category-list ">
            {options.map((price, i) => (
              <div key={i} className="form-check collection-filter-checkbox">
                <Input
                  className="checkbox_animated"
                  type="checkbox"
                  id={`price-${price.id}`}
                  value={price?.value}
                  checked={checkPrice(price?.value)}
                  onChange={applyPrice}
                />
                <Label className="form-check-label" htmlFor={`price-${price.id}`}>
                  <span className="name">{price.label}</span>
                  {price.count > 0 && <span className="text-muted ms-1">({price.count})</span>}
                </Label>
              </div>
            ))}
          </ul>
        </div>
      </AccordionBody>
    </AccordionItem>
  );
};

export default CollectionPrice;
