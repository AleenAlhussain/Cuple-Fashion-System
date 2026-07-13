import React, { useContext } from "react";
import CategoryBanner from "./CategoryBanner";
import { useGetCategories } from "@/utils/api";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useTranslation } from "react-i18next";
import { localizedValue } from "@/utils/constants";

const getLayoutType = (item) => {
    if (!item?.layout) return "half";
    return item.layout.toLowerCase() === "full" ? "full" : "half";
};

const buildCategoryLayout = (items = [], sectionKey = "section") => {
    const entries = [];
    let pendingHalf = null;
    let spacerIndex = 0;
    let fallbackCounter = 0;

    const pushEntry = (entry) => {
        entries.push({ ...entry, fallbackIndex: fallbackCounter++ });
    };

    const pushSpacer = () => {
        entries.push({ type: "spacer", id: `${sectionKey}-spacer-${spacerIndex++}` });
    };

    const flushPendingHalf = (withSpacer = false) => {
        if (!pendingHalf) return;
        pushEntry({ type: "half", item: pendingHalf });
        if (withSpacer) {
            pushSpacer();
        }
        pendingHalf = null;
    };

    for (const item of items) {
        const layoutType = getLayoutType(item);

        if (layoutType === "full") {
            flushPendingHalf(true);
            pushEntry({ type: "full", item });
            continue;
        }

        if (!pendingHalf) {
            pendingHalf = item;
            continue;
        }

        pushEntry({ type: "half", item: pendingHalf });
        pushEntry({ type: "half", item });
        pendingHalf = null;
    }

    if (pendingHalf) {
        pushEntry({ type: "half", item: pendingHalf });
        pushSpacer();
    }

    return entries;
};

function HomePageCategories() {
    const { themeOption } = useContext(ThemeOptionContext);
    const { i18n } = useTranslation("common");
    const { data: categoryData } = useGetCategories(
        { only_with_products: false },
        { enabled: true }
    );
    const categories = categoryData?.data || [];
    const isArabic = String(i18n?.language || "").toLowerCase().startsWith("ar");
    const lang = isArabic ? "ar" : "en";

    // Helpers
    const getCategoryById = (id) => categories.find((cat) => cat.id === id);

    const isEnabledValue = (enabled) =>
        enabled === undefined ? true : Array.isArray(enabled) ? enabled.length > 0 : Boolean(enabled);

    // Fallback images
    const fallbackImages = [
        "/assets/images/theme/categories/FLAT SLIPPERS.webp",
        "/assets/images/theme/categories/Nov_SHOES.webp",
        "/assets/images/theme/categories/KIDS BOY.webp",
        "/assets/images/theme/categories/Nov_BAGS.webp",
        "/assets/images/theme/categories/comfort.webp",
        "/assets/images/theme/categories/Nov_FLATS-shoes.webp",
        "/assets/images/theme/categories/boots.webp",
        "/assets/images/theme/categories/Nov_CASUAL.webp",
        "/assets/images/theme/categories/Nov_SUNGLASS.webp",
        "/assets/images/theme/categories/Nov_WALLET.webp",
        "/assets/images/theme/categories/Nov_Watch.webp",
        "/assets/images/theme/categories/Nov_PERFUME.webp",
        "/assets/images/theme/categories/Accessories.webp",
        "/assets/images/theme/categories/KIDS GIRL.webp",
        "/assets/images/theme/categories/Heel Slipper.webp",
    ];

    const CATEGORY_PLACEHOLDER = "/assets/images/placeholder/category.png";

    const getCategoryImageForItem = (category, fallbackIndex) => {
        // If category has an image_url from backend, use it
        if (category?.image_url) {
            return category.image_url;
        }
        // Otherwise use fallback images (wrap around if index exceeds array length)
        const safeIndex = fallbackIndex % fallbackImages.length;
        return fallbackImages[safeIndex] || CATEGORY_PLACEHOLDER;
    };



    // Build sections (new) with backward compatibility
    const homeCategorySections =
        Array.isArray(themeOption?.home_categories?.sections) && themeOption.home_categories.sections.length
            ? themeOption.home_categories.sections
            : [
                {
                    id: "sec-legacy",
                    enabled: themeOption?.home_categories?.enabled ?? true,
                    title: themeOption?.home_categories?.title ?? "",
                    description: "",
                    items: themeOption?.home_categories?.items ?? [],
                },
            ];

    // Global headline/subheadline (for all sections)
    const globalHeadline = isArabic
        ? themeOption?.home_categories?.headline_ar || themeOption?.home_categories?.headline || ""
        : themeOption?.home_categories?.headline || "";
    const globalSubheadline = isArabic
        ? themeOption?.home_categories?.subheadline_ar || themeOption?.home_categories?.subheadline || ""
        : themeOption?.home_categories?.subheadline || "";

    // Filter enabled sections only
    const enabledSections = homeCategorySections.filter((sec) => isEnabledValue(sec?.enabled));

    // If nothing to show, render nothing
    const hasAnyItems = enabledSections.some((sec) => (sec?.items || []).length > 0);
    if (!hasAnyItems) return null;

    return (
        <>
            {/* ✅ Global headline/subheadline (once for all sections) */}
            {(globalHeadline || globalSubheadline) && (
                <div className="title1 text-center">
                    {globalSubheadline ? <h4>{globalSubheadline}</h4> : null}
                    {globalHeadline ? <h3 className="text-uppercase">{globalHeadline}</h3> : null}
                    <div className="logo-divider">
                        <span className="line"></span>
                        <img src="/assets/images/Logo-4.png" alt="Cuple Logo Divider"/>
                        <span className="line"></span>
                    </div>
                </div>
            )}

            {/* Sections */}
            {enabledSections.map((sec, secIndex) => {
                const items = sec?.items || [];
                if (!items.length) return null;

                return (
                    <div key={sec?.id || secIndex} className="homepage-category-section">
                        {/* ✅ Section title (required) + optional description */}
                        {((isArabic ? sec?.title_ar : sec?.title) || (isArabic ? sec?.description_ar : sec?.description)) && (
                            <div className="title1 text-center mb-3">
                                {(isArabic ? sec?.description_ar : sec?.description)
                                    ? <h4>{isArabic ? (sec?.description_ar || sec?.description) : sec?.description}</h4>
                                    : null}
                                {(isArabic ? sec?.title_ar : sec?.title)
                                    ? <h2 className="text-uppercase">{isArabic ? (sec?.title_ar || sec?.title) : sec?.title}</h2>
                                    : null}
                            </div>
                        )}
                        <div className="homepage-category-grid">
                            {buildCategoryLayout(items, sec?.id || `section-${secIndex}`).map((entry, entryIndex) => {
                                if (entry.type === "spacer") {
                                    return (
                                        <div
                                            key={entry.id}
                                            className="homepage-category-spacer"
                                            aria-hidden="true"
                                        />
                                    );
                                }

                                const category = getCategoryById(entry.item.category_id);
                                if (!category) return null;

                                const isFullWidth = entry.type === "full";
                                const imageIndex = secIndex * 10 + (entry.fallbackIndex ?? entryIndex);

                                return (
                                    <div
                                        key={`${secIndex}-${entry.item.category_id}-${entryIndex}`}
                                        className={`homepage-category-card ${isFullWidth ? "is-full" : "is-half"}`}
                                    >
                                        <CategoryBanner
                                            imageUrl={getCategoryImageForItem(category, imageIndex)}
                                            single={isFullWidth}
                                            title={localizedValue(category, "name", lang)}
                                            link={`/category/${category.slug || category.id}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </>
    );
}

export default HomePageCategories;
