"use client";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import CategoryBanner from "@/components/home/CategoryBanner";
import { Row } from "reactstrap";
import { useTranslation } from "react-i18next";
import { resolveImageUrl, localizedValue } from "@/utils/constants";

const CATEGORY_PLACEHOLDER = "/assets/images/placeholder/category.png";

const CollectionSubcategoryLayout = ({ parentCategory, sections = [], categories = [] }) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  if (!parentCategory) return null;

  const enabledSections = sections.filter((section) => {
    const isParentMatch = section.parent_category_id === parentCategory.id;
    const hasItems = Array.isArray(section.items) && section.items.length > 0;
    const isEnabled = section.enabled === undefined ? true : Boolean(section.enabled);
    return isParentMatch && hasItems && isEnabled;
  });

  if (!enabledSections.length) return null;

  const findCategory = (list, id) => {
    if (!list || !list.length || !id) return null;
    for (const category of list) {
      if (category?.id === id) return category;
      const nextLayer =
        (Array.isArray(category.children) && category.children) ||
        (Array.isArray(category.subcategories) && category.subcategories) ||
        [];
      if (nextLayer.length) {
        const child = findCategory(nextLayer, id);
        if (child) return child;
      }
    }
    return null;
  };

  const generateRows = (items) => {
    const rows = [];
    let i = 0;
    while (i < items.length) {
      if (items[i].layout === "full") {
        rows.push({ type: "full", items: [items[i]] });
        i++;
      } else {
        const halfItems = [items[i]];
        if (i + 1 < items.length && items[i + 1].layout === "half") {
          halfItems.push(items[i + 1]);
          i += 2;
        } else {
          i++;
        }
        rows.push({ type: "half", items: halfItems });
      }
    }
    return rows;
  };

  const getCategoryImage = (category) => {
    const imageSource = category?.image_url || category?.image;
    return resolveImageUrl(imageSource) || CATEGORY_PLACEHOLDER;
  };

  const catName = localizedValue(parentCategory, 'name', lang);
  const heroTitle = catName
    ? (lang === 'ar' ? catName : `${t("ExploreOur")} ${catName.toUpperCase()} ${t("Collections")}`)
    : t("ExploreCollections") || "Explore Our Collections";
  const heroSubtitle =
    t("SubcategoryIntro") || "Handpicked subcategories with big, beautiful visuals to guide shoppers.";

  return (
    <WrapperComponent
      classes={{
        sectionClass: "collection-subcategory-layout pt-4 pb-4",
        fluidClass: "container",
      }}
    >
      <div className="collection-subcategory-hero text-center mb-4">
        <p className="collection-subcategory-label">
          {t("SubcategorySections") || "Subcategories Layout"}
        </p>
        <h2 className="collection-subcategory-title">{heroTitle}</h2>
        <p className="collection-subcategory-subtitle">{heroSubtitle}</p>
      </div>

      {enabledSections.map((section, sectionIndex) => {
        const rows = generateRows(section.items);
        const sectionTitle = localizedValue(section, "title", lang);
        const sectionDescription = localizedValue(section, "description", lang);

        return (
          <div key={section.id || sectionIndex} className="collection-subcategory-section">
            {(sectionTitle || sectionDescription) && (
              <div className="collection-subcategory-section-heading text-center mb-3">
                {sectionDescription ? <p>{sectionDescription}</p> : null}
                {sectionTitle ? <h3 className="text-uppercase">{sectionTitle}</h3> : null}
              </div>
            )}
            <div className="collection-subcategory-content">
              {rows.map((row, rowIndex) => (
                <Row key={`${section.id || sectionIndex}-${rowIndex}`} className="g-sm-4 g-3 subcategory-row">
                  {row.items.map((item, itemIndex) => {
                    const category = findCategory(categories, item.category_id);
                    if (!category) return null;
                    const isFull = row.type === "full";
                    const columnClass = isFull ? "col-12" : "col-6";

                    return (
                      <div
                        key={`${section.id || sectionIndex}-${item.category_id}-${itemIndex}`}
                        className={columnClass}
                      >
                        <div className={`subcategory-card ${isFull ? "is-full" : "is-half"}`}>
                          <div className="subcategory-media">
                            <CategoryBanner
                              imageUrl={getCategoryImage(category)}
                              single={isFull}
                              title={localizedValue(category, 'name', lang)}
                              link={`/category/${category.slug || category.id}`}
                              showDetails={false}
                            />
                          </div>

                          <a href={`/category/${category.slug || category.id}`} className="subcategory-meta">
                            <div className="subcategory-meta-left">
                              <div className="subcategory-name">{localizedValue(category, 'name', lang)}</div>
                              <div className="subcategory-hint">{t("ShopNow")}</div>
                            </div>
                            <span className="subcategory-arrow">→</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </Row>
              ))}
            </div>
          </div>
        );
      })}
    </WrapperComponent>
  );
};

export default CollectionSubcategoryLayout;
