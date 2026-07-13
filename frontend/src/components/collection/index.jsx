"use client";
import { useGetCategories } from "@/utils/api";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { ShopLayoutProvider } from "@/context/shopLayoutContext";
import Loader from "@/layout/loader";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { useCustomSearchParams } from "@/utils/hooks/useCustomSearchParams";
import { useContext, useEffect, useState, useMemo } from "react";
import CollectionBanner from "./collectionBanner";
import CollectionInfiniteScroll from "./collectionInfiniteScroll";
import CollectionLeftSidebar from "./collectionLeftSidebar";
import CollectionNoSidebar from "./collectionNoSidebar";
import CollectionOffCanvas from "./collectionOffcanvas";
import CollectionRightSidebar from "./collectionRightSidebar";
import CollectionSidebarPopUp from "./collectionSidebarPopUp";
import MainCollectionSlider from "./collectionSlider";
import LayoutSidebar from "./layoutSidebar";
import CollectionSubcategoryLayout from "./CollectionSubcategoryLayout";

const CollectionContain = () => {
  const [filter, setFilter] = useState({
    category: [],
    brand: [],
    color: [],
    size: [],
    price: [],
    attribute: [],
    rating: [],
    q: "",
    offer_id: null,
    offer_key: null,
    promo_group_id: null,
    offer_name: null,
    sortBy: "desc",
    field: "created_at",
  });
  const { themeOption } = useContext(ThemeOptionContext);
  const [category, brand, color, size, attribute, price, rating, sortBy, field, layout, paginate, offer_id, offer_key, promo_group_id, q] = useCustomSearchParams(["category", "brand", "color", "size", "attribute", "price", "rating", "sortBy", "field", "layout", "paginate", "offer_id", "offer_key", "promo_group_id", "q"]);
  const collectionLayout = layout?.layout ? layout?.layout : themeOption?.collection?.collection_layout;
  const { data: categoriesResponse, isLoading: categoryIsLoading } = useGetCategories({}, { enabled: true });
  const categoryData = categoriesResponse?.data?.filter(c => c.type === "product") || [];
  const allCategories = categoriesResponse?.data || [];

  // Find selected category for banner display
  const selectedCategory = useMemo(() => {
    const categoryFilters = category?.category?.split(",") || [];
    if (categoryFilters.length === 1) {
      // Single category selected - find it by slug
      const slug = categoryFilters[0];
      // Search in all categories including nested children
      const findCategory = (cats) => {
        for (const cat of cats) {
          if (cat.slug === slug) return cat;
          if (cat.children?.length) {
            const found = findCategory(cat.children);
            if (found) return found;
          }
        }
        return null;
      };
      return findCategory(allCategories);
    }
    return null;
  }, [category, allCategories]);

  useEffect(() => {
    setFilter((prev) => {
      return {
        ...prev,
        paginate: paginate?.paginate ? paginate?.paginate : 12,
        category: category ? category?.category?.split(",") : [],
        brand: brand ? brand?.brand?.split(",") : [],
        color: color ? color?.color?.split(",") : [],
        size: size ? size?.size?.split(",") : [],
        attribute: attribute ? attribute?.attribute?.split(",") : [],
        price: price ? price?.price?.split(",") : [],
        rating: rating ? rating?.rating?.split(",") : [],
        q: q ? q?.q : "",
        offer_id: offer_id ? offer_id?.offer_id : null,
        offer_key: offer_key ? offer_key?.offer_key : null,
        promo_group_id: promo_group_id ? promo_group_id?.promo_group_id : null,
        sortBy: sortBy ? sortBy?.sortBy : "desc",
        field: field ? field?.field : "created_at",
      };
    });
  }, [category, brand, color, size, attribute, price, rating, sortBy, field, paginate, offer_id, offer_key, promo_group_id, q]);

  const isCollectionMatch = {
    collection_category_slider: <MainCollectionSlider filter={filter} setFilter={setFilter} />,
    collection_category_sidebar: <LayoutSidebar filter={filter} setFilter={setFilter} />,
    collection_banner: <CollectionBanner filter={filter} setFilter={setFilter} />,
    collection_top_filter: <CollectionOffCanvas filter={filter} setFilter={setFilter} />,
    collection_no_sidebar: <CollectionNoSidebar filter={filter} setFilter={setFilter} />,
    collection_left_sidebar: <CollectionLeftSidebar filter={filter} setFilter={setFilter} />,
    collection_right_sidebar: <CollectionRightSidebar filter={filter} setFilter={setFilter} />,
    collection_2_grid: <CollectionLeftSidebar filter={filter} setFilter={setFilter} />,
    collection_3_grid: <CollectionLeftSidebar filter={filter} setFilter={setFilter} />,
    collection_4_grid: <CollectionLeftSidebar filter={filter} setFilter={setFilter} />,
    collection_5_grid: <CollectionLeftSidebar filter={filter} setFilter={setFilter} />,
    collection_list_view: <CollectionLeftSidebar filter={filter} setFilter={setFilter} />,
    collection_sidebar_popup: <CollectionSidebarPopUp filter={filter} setFilter={setFilter} />,
    collection_product_infinite_scroll: <CollectionInfiniteScroll filter={filter} setFilter={setFilter} />,
  };

  // Get breadcrumb title and navigation based on selected category
  const breadcrumbTitle = selectedCategory ? selectedCategory.name : "Collections";
  const breadcrumbNavigation = selectedCategory
    ? [{ name: "Collections" }, { name: selectedCategory.name }]
    : [{ name: "Collections" }];

  return (
    <>
      {categoryIsLoading ? (
        <Loader />
      ) : (
        <ShopLayoutProvider scope="shop">
          <>
            <Breadcrumbs
              title={breadcrumbTitle}
              subNavigation={breadcrumbNavigation}
              bannerImage={selectedCategory?.banner_image_url}
            />
            {selectedCategory && (
              <CollectionSubcategoryLayout
                parentCategory={selectedCategory}
                sections={themeOption?.collection?.subcategory_sections || []}
                categories={allCategories}
              />
            )}
            {isCollectionMatch[collectionLayout]}
          </>
        </ShopLayoutProvider>
      )}
    </>
  );
};

export default CollectionContain;
