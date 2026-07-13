import SKBlogSidebar from "@/components/widgets/skeletonLoader/blogSkeleton/SKBlogSidebar";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useGetShopFacets } from "@/utils/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiArrowLeftSLine } from "react-icons/ri";
import { Accordion, AccordionHeader, AccordionItem, Input } from "reactstrap";
import CollectionAttributes from "./CollectionAttributes";
import CollectionCategory from "./CollectionCategory";
import CollectionFilter from "./CollectionFilter";
import CollectionOffers from "./CollectionOffers";
import CollectionPrice from "./CollectionPrice";
import CollectionSizes from "./CollectionSizes";

const CollectionSidebar = ({
  filter,
  setFilter,
  isOffcanvas,
  basicStoreCard,
  rightSideClass,
  sellerClass,
  isAttributes = true,
  hideCategory,
  categorySlug,
}) => {
  const {
    collectionMobile,
    setCollectionMobile,
    openOffCanvas,
    setOpenOffCanvas,
  } = useContext(ThemeOptionContext);
  const { t } = useTranslation("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState([
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
  ]);
  const [searchTerm, setSearchTerm] = useState(filter?.q || "");

  useEffect(() => {
    setSearchTerm(filter?.q || "");
  }, [filter?.q]);

  const facetParams = useMemo(() => {
    return {
      category: categorySlug || (filter?.category?.length ? filter.category.join(",") : undefined),
      color: filter?.color?.length ? filter.color.join(",") : undefined,
      size: filter?.size?.length ? filter.size.join(",") : undefined,
      price_bucket: filter?.price?.[0] || undefined,
      brand: filter?.brand?.length ? filter.brand.join(",") : undefined,
      q: filter?.q || undefined,
      offer_id: filter?.offer_id || undefined,
      offer_key: filter?.offer_key || undefined,
      promo_group_id: filter?.promo_group_id || undefined,
    };
  }, [categorySlug, filter]);

  const toggle = (id) => {
    if (open.includes(id)) {
      setOpen(open.filter((item) => item !== id)); // Close section
    } else {
      setOpen([...open, id]); // Open section
    }
  };

  useEffect(() => {
    const normalizedTerm = searchTerm.trim();
    const currentTerm = (filter?.q || "").trim();

    if (normalizedTerm === currentTerm) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setFilter((prev) => ({
        ...prev,
        q: normalizedTerm,
        page: 1,
      }));

      const params = new URLSearchParams(searchParams?.toString());
      if (normalizedTerm) {
        params.set("q", normalizedTerm);
      } else {
        params.delete("q");
      }
      params.delete("page");

      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filter?.q, setFilter, pathname, router, searchParams]);

  const { data: facetsResponse, isLoading } = useGetShopFacets(facetParams);
  const categories = facetsResponse?.data?.categories ?? [];
  const colorOptions = facetsResponse?.data?.colors ?? [];
  const sizeOptions = facetsResponse?.data?.sizes ?? [];
  const priceBuckets = facetsResponse?.data?.price_buckets ?? [];

  return (
    <>
      {collectionMobile && (
        <div
          className="bg-overlay collection-overlay show"
          onClick={() => setCollectionMobile(false)}
        />
      )}
      <div
        className={`  ${openOffCanvas ? "d-block" : ""} ${
          sellerClass ? sellerClass : `col-xl-3 col-lg-4`
        } `}
      >
        <div
          className={`collection-filter sticky-top-section ${
            collectionMobile ? "open" : ""
          }`}
        >
          <div className="collection-filter-block accordion">
            {!isOffcanvas && (
              <div
                className="collection-mobile-back"
                onClick={() => {
                  setCollectionMobile((prev) => !prev);
                }}
              >
                <span className="filter-back">
                  <RiArrowLeftSLine />
                  {t("Back")}
                </span>
              </div>
            )}
            {isOffcanvas && (
              <div
                className="collection-mobile-back"
                onClick={() => {
                  setOpenOffCanvas((prev) => !prev);
                }}
              >
                <span className="filter-back">
                  <RiArrowLeftSLine />
                  <span>{t("Back")}</span>
                </span>
              </div>
            )}
            {basicStoreCard && basicStoreCard}
            <div className="theme-form search-box mb-3">
              <Input
                placeholder={t("Search")}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            {!isOffcanvas && (
              <CollectionFilter
                filter={filter}
                setFilter={setFilter}
                categorySlug={categorySlug}
                colorOptions={colorOptions}
              />
            )}
            {isLoading ? (
              <SKBlogSidebar />
            ) : (
              <Accordion
                className={`collection-collapse-block open  ${
                  isOffcanvas ? "row" : ""
                }`}
                open={open}
                toggle={toggle}
              >
                  {!hideCategory && (
                    <AccordionItem
                      className={`collection-collapse-block open ${
                        isOffcanvas ? "col-lg-3" : ""
                      }`}
                    >
                      <AccordionHeader
                        targetId="1"
                        className="collapse-block-title"
                      >
                        <span>{t("Categories")}</span>
                      </AccordionHeader>
                      <CollectionCategory
                        categories={categories}
                        filter={filter}
                        setFilter={setFilter}
                      />
                    </AccordionItem>
                  )}
                  {/* <AccordionItem
                    className={`collection-collapse-block open ${
                      isOffcanvas ? "col-lg-3" : ""
                    }`}
                  >
                    <AccordionHeader
                      targetId="2"
                      className="collapse-block-title"
                    >
                      <span>{t("Brand")}</span>
                    </AccordionHeader>
                    <CollectionBrand filter={filter} setFilter={setFilter} />
                  </AccordionItem> */}
                  <CollectionOffers
                    filter={filter}
                    setFilter={setFilter}
                    isOffCanvas={isOffcanvas}
                    targetId="5"
                  />
                  {/* {isAttributes ? ( */}
                  <CollectionAttributes
                    colors={colorOptions}
                    filter={filter}
                    setFilter={setFilter}
                    isOffCanvas={isOffcanvas}
                    targetId="2"
                  />
                  <CollectionSizes
                    sizes={sizeOptions}
                    filter={filter}
                    setFilter={setFilter}
                    isOffCanvas={isOffcanvas}
                    targetId="3"
                  />
                  {/* ) : null} */}
                  <CollectionPrice
                    isOffCanvas={isOffcanvas}
                    filter={filter}
                    setFilter={setFilter}
                    targetId="4"
                    priceBuckets={priceBuckets}
                  />
                </Accordion>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CollectionSidebar;
