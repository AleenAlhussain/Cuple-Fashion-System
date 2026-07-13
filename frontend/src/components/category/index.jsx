import { useGetCategories, useGetOneCategories } from "@/utils/api";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { ShopLayoutProvider } from "@/context/shopLayoutContext";
import Loader from "@/layout/loader";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { useCustomSearchParams } from "@/utils/hooks/useCustomSearchParams";
import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { localizedValue } from "@/utils/constants";
import CollectionSubcategoryLayout from "../collection/CollectionSubcategoryLayout";
import CollectionLeftSidebar from "../collection/collectionLeftSidebar";
import SubcategoryGrid from "./SubcategoryGrid";

const buildCategorySlugCandidates = (value) => {
  const slug = (value || "").toString().trim();
  if (!slug) return [];
  const candidates = [slug];

  if (slug.endsWith("-1")) {
    const base = slug.replace(/-1$/, "");
    if (base) candidates.push(base);
  } else {
    candidates.push(`${slug}-1`);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
};

const CategoryMainPage = ({ slug }) => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { i18n } = useTranslation("common");
  const lang = i18n.language;
  const [filter, setFilter] = useState({
    category: [slug],
    brand: [],
    price: [],
    color: [],
    attribute: [],
    size: [],
    q: "",
    offer_id: null,
    offer_key: null,
    promo_group_id: null,
    page: 1,
    sortBy: null,
    field: null,
  });
  const [
    brand,
    color,
    size,
    attribute,
    price,
    sortBy,
    field,
    layout,
    page,
    offer_id,
    offer_key,
    promo_group_id,
    q,
  ] = useCustomSearchParams([
    "brand",
    "color",
    "size",
    "attribute",
    "price",
    "sortBy",
    "field",
    "layout",
    "page",
    "offer_id",
    "offer_key",
    "promo_group_id",
    "q",
  ]);
  useEffect(() => {
    setFilter((prev) => {
      return {
        ...prev,
        page: page ? page?.page : 1,
        brand: brand ? brand?.brand?.split(",") : [],
        color: color ? color?.color?.split(",") : [],
        size: size ? size?.size?.split(",") : [],
        attribute: attribute ? attribute?.attribute?.split(",") : [],
        price: price ? price?.price?.split(",") : [],
        q: q ? q?.q : "",
        offer_id: offer_id ? offer_id?.offer_id : null,
        offer_key: offer_key ? offer_key?.offer_key : null,
        promo_group_id: promo_group_id ? promo_group_id?.promo_group_id : null,
        sortBy: sortBy ? sortBy?.sortBy : null,
        field: field ? field?.field : null,
      };
    });
  }, [brand, color, size, attribute, price, sortBy, field, page, offer_id, offer_key, promo_group_id, q]);

  const { data: categoriesResponse, isLoading: categoryIsLoading } = useGetOneCategories({ id: slug });
  const { data: allCategoriesResponse, isLoading: allCategoriesLoading } = useGetCategories({}, { enabled: true });

  const categoryData = categoriesResponse?.data;
  const allCategories = allCategoriesResponse?.data || [];
  const activeCategorySlugs = useMemo(
    () => new Set(allCategories.map((category) => category?.slug).filter(Boolean)),
    [allCategories]
  );

  const resolvedCategorySlug = useMemo(() => {
    const candidates = buildCategorySlugCandidates(slug);
    if (!candidates.length) return slug;

    if (activeCategorySlugs.has(slug)) {
      return slug;
    }

    const fallback = candidates.find((candidate) => activeCategorySlugs.has(candidate));
    return fallback || slug;
  }, [activeCategorySlugs, slug]);

  const resolvedCategoryData = useMemo(() => {
    if (resolvedCategorySlug === slug || !allCategories.length) {
      return categoryData;
    }

    return allCategories.find((category) => category?.slug === resolvedCategorySlug) || categoryData;
  }, [allCategories, categoryData, resolvedCategorySlug, slug]);

  const hasChildren = resolvedCategoryData?.children && resolvedCategoryData.children.length > 0;
  const subcategorySections = themeOption?.collection?.subcategory_sections || [];
  const enabledSectionsForParent = useMemo(() => {
    if (!resolvedCategoryData?.id) return [];
    return subcategorySections.filter((section) => {
      if (section.parent_category_id !== resolvedCategoryData.id) return false;
      const isEnabled = section.enabled === undefined ? true : Boolean(section.enabled);
      const hasItems = Array.isArray(section.items) && section.items.length > 0;
      return isEnabled && hasItems;
    });
  }, [subcategorySections, resolvedCategoryData?.id]);
  const hasCustomSubcategoryLayout = hasChildren && enabledSectionsForParent.length > 0;
  if (categoryIsLoading || allCategoriesLoading) return <Loader />;

  return (
    <>
      <Breadcrumbs
        title={localizedValue(resolvedCategoryData, 'name', lang)}
        subNavigation={[
          {
            name: localizedValue(resolvedCategoryData, 'name', lang),
          },
        ]}
        bannerImage={resolvedCategoryData?.banner_image_url}
      />

      {/* If category has children, prefer the admin-configured layout; otherwise fallback */}
      {hasChildren ? (
        hasCustomSubcategoryLayout ? (
          <CollectionSubcategoryLayout
            parentCategory={resolvedCategoryData}
            sections={subcategorySections}
            categories={allCategories}
          />
        ) : (
          <SubcategoryGrid
            parentCategory={resolvedCategoryData}
            subcategories={resolvedCategoryData.children}
          />
        )
      ) : (
        <ShopLayoutProvider scope="category" scopeId={resolvedCategoryData?.id}>
          <CollectionLeftSidebar
            filter={filter}
            setFilter={setFilter}
            hideCategory
            categorySlug={resolvedCategorySlug}
          />
        </ShopLayoutProvider>
      )}
    </>
  );
};

export default CategoryMainPage;
