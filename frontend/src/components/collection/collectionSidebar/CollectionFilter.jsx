import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiCloseLine } from "react-icons/ri";

const CollectionFilter = ({ filter, setFilter, colorOptions = [] }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation("common");
  const [selectedFilters, setSelectedFilters] = useState([]);

  const splitFilter = (filterKey) => (Array.isArray(filter?.[filterKey]) ? filter[filterKey] : []);

  const filterObj = {
    category: splitFilter("category"),
    color: splitFilter("color"),
    attribute: splitFilter("attribute"),
    size: splitFilter("size"),
    price: splitFilter("price"),
    brand: splitFilter("brand"),
  };

  useEffect(() => {
    const chips = [
      ...filterObj.category,
      ...filterObj.brand,
      ...filterObj.color,
      ...filterObj.size,
      ...filterObj.attribute,
      ...filterObj.price,
    ];

    if (filter?.q) {
      chips.push(`search:${filter.q}`);
    }
    if (filter?.offer_id) {
      chips.push(`offer:${filter.offer_id}`);
    }

    setSelectedFilters(chips);
  }, [filter?.category, filter?.brand, filter?.color, filter?.size, filter?.attribute, filter?.price, filter?.q, filter?.offer_id]);

  const pushParams = (params) => {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const removeParams = (chipValue) => {
    const params = new URLSearchParams(searchParams?.toString());

    if (chipValue.startsWith("offer:")) {
      setFilter((prev) => ({
        ...prev,
        offer_id: null,
        offer_key: null,
        promo_group_id: null,
        offer_name: null,
        page: 1,
      }));

      params.delete("offer_id");
      params.delete("offer_key");
      params.delete("promo_group_id");
      params.delete("page");
      pushParams(params);
      return;
    }

    if (chipValue.startsWith("search:")) {
      setFilter((prev) => ({
        ...prev,
        q: "",
        page: 1,
      }));

      params.delete("q");
      params.delete("page");
      pushParams(params);
      return;
    }

    const nextFilters = { ...filterObj };
    Object.keys(nextFilters).forEach((key) => {
      nextFilters[key] = nextFilters[key].filter((value) => value !== chipValue);
    });

    setFilter((prev) => ({
      ...prev,
      ...nextFilters,
      page: 1,
    }));

    Object.entries(nextFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        params.set(key, values.join(","));
      } else {
        params.delete(key);
      }
    });
    params.delete("page");

    if (nextFilters.price.length > 0) {
      params.set("price_bucket", nextFilters.price[0]);
    } else {
      params.delete("price_bucket");
    }

    pushParams(params);
  };

  const clearParams = () => {
    setFilter((prev) => ({
      ...prev,
      category: [],
      brand: [],
      color: [],
      size: [],
      attribute: [],
      price: [],
      q: "",
      offer_id: null,
      offer_key: null,
      promo_group_id: null,
      offer_name: null,
      page: 1,
    }));
    router.push(pathname);
  };

  const getColorName = (colorId) => {
    const colorItem = colorOptions?.find(
      (item) => item.filter_value === colorId || item.id?.toString() === colorId
    );
    return colorItem?.color || colorItem?.value || colorId;
  };

  const formatChipLabel = (chipValue) => {
    if (chipValue.startsWith("offer:")) {
      return filter?.offer_name || t("SpecialOffers");
    }
    if (chipValue.startsWith("search:")) {
      return chipValue.replace("search:", "");
    }
    if (/^\d+$/.test(chipValue)) {
      return getColorName(chipValue);
    }
    if (chipValue === "le_99") {
      return "≤ 99 AED";
    }
    if (chipValue === "100_149") {
      return "100 - 149 AED";
    }
    if (chipValue === "150_199") {
      return "150 - 199 AED";
    }
    if (chipValue === "200_plus") {
      return "200+ AED";
    }
    if (chipValue.startsWith("#")) {
      return chipValue;
    }

    return chipValue
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (selectedFilters.length <= 0) return null;

  return (
    <div className="shop-filter-category">
      <div className="filter-title">
        <h2>{t("Filters")}</h2>
        <a onClick={clearParams}>{t("ClearAll")}</a>
      </div>
      <ul className="filter-list">
        {selectedFilters.map((chip, index) => (
          <li key={`${chip}-${index}`}>
            <a>{formatChipLabel(chip)}</a>
            <RiCloseLine className="close-icon" onClick={() => removeParams(chip)} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CollectionFilter;
