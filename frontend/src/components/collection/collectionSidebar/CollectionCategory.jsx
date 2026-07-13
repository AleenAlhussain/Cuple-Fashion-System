import NoDataFound from "@/components/widgets/NoDataFound";
import { localizedValue } from "@/utils/constants";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccordionBody, Input, Label } from "reactstrap";

const CollectionCategory = ({ categories = [], filter, setFilter }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  const visibleCategories = useMemo(() => {
    if (!keyword.trim()) {
      return categories;
    }

    const term = keyword.toLowerCase();
    return categories.filter((category) => {
      const label = localizedValue(category, "name", lang) || category?.name || "";
      return label.toLowerCase().includes(term);
    });
  }, [categories, keyword, lang]);

  const toggleCategory = (slug) => {
    let selectedCategories = [...(filter?.category || [])];

    if (selectedCategories.includes(slug)) {
      selectedCategories = selectedCategories.filter((item) => item !== slug);
    } else {
      selectedCategories.push(slug);
    }

    setFilter((prev) => ({
      ...prev,
      category: selectedCategories,
      page: 1,
    }));

    const params = new URLSearchParams(searchParams?.toString());
    if (selectedCategories.length > 0) {
      params.set("category", selectedCategories.join(","));
    } else {
      params.delete("category");
    }
    params.delete("page");

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="accordion-collapse collapse show">
      <AccordionBody accordionId="1">
        {categories.length > 5 && (
          <div className="theme-form search-box">
            <Input
              placeholder={t("Search")}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        )}

        {visibleCategories.length > 0 ? (
          <ul className="shop-category-list custom-sidebar-height">
            {visibleCategories.map((category) => (
              <li key={category.id}>
                <div className="form-check collection-filter-checkbox">
                  <Input
                    className="form-check-input"
                    type="checkbox"
                    id={`category-${category.id}`}
                    checked={(filter?.category || []).includes(category.slug)}
                    onChange={() => toggleCategory(category.slug)}
                  />
                  <Label className="form-check-label" htmlFor={`category-${category.id}`}>
                    <span className="name">{localizedValue(category, "name", lang)}</span>
                    {category.count > 0 && (
                      <span className="text-muted ms-1">({category.count})</span>
                    )}
                  </Label>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <NoDataFound customClass="search-not-found-box" title="NoCategoryFound" />
        )}
      </AccordionBody>
    </div>
  );
};

export default CollectionCategory;
