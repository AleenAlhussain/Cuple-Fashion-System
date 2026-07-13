import Avatar from "@/components/widgets/Avatar";
import NoDataFound from "@/components/widgets/NoDataFound";
import { placeHolderImage } from "@/components/widgets/Placeholder";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import { useGetCategories } from "@/utils/api";
import { localizedValue } from "@/utils/constants";
import { useCustomSearchParams } from "@/utils/hooks/useCustomSearchParams";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const CollectionSlider = ({ filter, setFilter }) => {
  const [attribute, price, rating, sortBy, field, layout] = useCustomSearchParams(["attribute", "price", "rating", "sortBy", "field", "layout"]);
  const { data: categoriesResponse } = useGetCategories({}, { enabled: true });
  const categoryData = categoriesResponse?.data?.filter((c) => c.type === "product") || [];
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const sortedCategoryData = useMemo(
    () => {
      const withIndex = categoryData.map((item, index) => ({ item, index }));

      return withIndex.sort((a, b) => {
        const aPriority = Number(a?.item?.priority ?? a?.item?.sort_order ?? 0);
        const bPriority = Number(b?.item?.priority ?? b?.item?.sort_order ?? 0);

        const aHasPriority = aPriority > 0;
        const bHasPriority = bPriority > 0;

        // Show prioritized categories first (priority > 0), then non-prioritized (0).
        if (aHasPriority && !bHasPriority) return -1;
        if (!aHasPriority && bHasPriority) return 1;

        // Inside prioritized group: lower number means higher priority (1,2,3...).
        if (aPriority !== bPriority) return aPriority - bPriority;
        // Keep original API order when priority ties.
        return a.index - b.index;
      }).map((entry) => entry.item);
    },
    [categoryData]
  );
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const isRTL = useMemo(() => {
    const language = (lang || "").toLowerCase();
    if (language.startsWith("ar")) return true;

    if (typeof document !== "undefined") {
      const docDir = (document.documentElement?.dir || document.body?.dir || document.dir || "").toLowerCase();
      if (docDir === "rtl") return true;
      if (document.body?.classList?.contains("rtl")) return true;
    }

    return false;
  }, [lang]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncViewport = () => setIsMobileViewport(window.innerWidth <= 767);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const pathname = usePathname();
  const router = useRouter();
  const redirectToCollection = (slug) => {
    let temp = [...filter?.category];
    if (!temp.includes(slug)) {
      temp.push(slug);
    } else {
      temp = temp.filter((elem) => elem !== slug);
    }
    setFilter((prev) => {
      return {
        ...prev,
        category: temp,
      };
    });
    if (temp.length > 0) {
      const queryParams = new URLSearchParams({ ...attribute, ...price, ...rating, ...sortBy, ...field, ...layout, category: temp }).toString();
      router.push(`${pathname}?${queryParams}`);
    } else {
      const queryParams = new URLSearchParams({ ...attribute, ...price, ...rating, ...sortBy, ...field, ...layout }).toString();
      router.push(`${pathname}?${queryParams}`);
    }
  };

  const sliderWrapperStyle = isMobileViewport
    ? {
        display: "grid",
        gridAutoFlow: "column",
        gridAutoColumns: "minmax(148px, 1fr)",
        gap: "16px",
        overflowX: "auto",
        overscrollBehaviorX: "contain",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "8px",
      }
    : {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "20px",
      };

  return (
    <WrapperComponent classes={{ containerClass: "container-fluid-lg" }} colProps={{ xs: 12 }}>
      {sortedCategoryData?.length > 0 ? (
        <div className="product-wrapper no-arrow category-slider">
          <div
            className="collection-category-native-track"
            dir={isRTL ? "rtl" : "ltr"}
            style={sliderWrapperStyle}
          >
            {sortedCategoryData?.map((elem, i) => (
              <div key={i} className="collection-category-card">
                <button
                  type="button"
                  className={`category-box category-dark collection-category-box ${filter?.category?.includes(elem.slug) ? "active" : ""}`}
                  onClick={() => redirectToCollection(elem?.slug)}
                  style={{
                    width: "100%",
                    border: "0",
                    background: "transparent",
                    padding: 0,
                    textAlign: "inherit",
                  }}
                >
                  <div className="collection-category-thumb">
                    <Avatar
                      data={elem?.category_icon}
                      placeHolder={placeHolderImage}
                      name={localizedValue(elem, "name", lang)}
                      height={140}
                      width={140}
                      customClass={"collection-category-image"}
                    />
                  </div>
                  <div className="collection-category-title">
                    <h5>{localizedValue(elem, "name", lang)}</h5>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <NoDataFound customClass="bg-light no-data-added" title="NoCategoryFound" />
      )}
    </WrapperComponent>
  );
};

export default CollectionSlider;
