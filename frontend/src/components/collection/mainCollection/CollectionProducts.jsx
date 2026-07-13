import NoDataFound from "@/components/widgets/NoDataFound";
import Pagination from "@/components/widgets/Pagination";
import ProductBox from "@/components/widgets/productBox";
import ProductSkeleton from "@/components/widgets/skeletonLoader/ProductSkeleton";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useShopLayout } from "@/context/shopLayoutContext";
import { ImagePath } from "@/utils/constants";
import { useSearchParams } from "next/navigation";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Col, Row } from "reactstrap";
import ListProductBox from "./ListProductBox";
import { useGetProducts } from "@/utils/api";

const CollectionProducts = ({ filter, grid, infiniteScroll, categorySlug }) => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { settings: shopLayout } = useShopLayout();
  const [page, setPage] = useState(1);
  const [adjustGrid, setAdjustGrid] = useState("col-6 col-lg-4");
  const { t } = useTranslation("common");
  const [infiniteScrollData, setInfiniteScrollData] = useState([]);
  const [loadMoreData, setLoadMoreData] = useState([]);
  const [loadMorePage, setLoadMorePage] = useState(1);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  const param = useSearchParams();
  const tagParam = param.get("tag");
  const selectedPriceBucket = filter?.price?.[0] || undefined;
  const selectedCategory =
    categorySlug || (filter?.category?.length > 0 ? filter.category.join(",") : undefined);

  const paginationType = shopLayout?.grid?.pagination_type || "normal";
  const perPage = shopLayout?.grid?.products_per_page || 12;
  const isLoadMore = paginationType === "load_more" && !infiniteScroll;
  const isInfinite = paginationType === "infinite_scroll" && !infiniteScroll;

  // React Query auto-refetches when params change (included in query key)
  const { data, isLoading, fetchStatus } = useGetProducts({
    category: selectedCategory,
    color: filter?.color?.length > 0 ? filter.color.join(",") : undefined,
    size: filter?.size?.length > 0 ? filter.size.join(",") : undefined,
    brand: filter?.brand?.length > 0 ? filter.brand.join(",") : undefined,
    attribute: filter?.attribute?.length > 0 ? filter.attribute.join(",") : undefined,
    rating: filter?.rating?.length > 0 ? filter.rating.join(",") : undefined,
    price_bucket: selectedPriceBucket,
    sortBy: filter?.sortBy || undefined,
    q: filter?.q || undefined,
    offer_id: filter?.offer_id || undefined,
    offer_key: filter?.offer_key || undefined,
    promo_group_id: filter?.promo_group_id || undefined,
    paginate: (isLoadMore || isInfinite) ? perPage : perPage,
    page: (isLoadMore || isInfinite) ? loadMorePage : (filter?.page || 1),
    tag: tagParam || undefined,
  });

  const normalizedProducts = (data?.data || []).map((product) => {
    if (!product?.selected_color_image_url) {
      return product;
    }
    return {
      ...product,
      primary_image: product.selected_color_image_url,
      product_thumbnail: {
        original_url: product.selected_color_image_url,
      },
    };
  });

  // Accumulate products for load_more / infinite_scroll
  useEffect(() => {
    if ((isLoadMore || isInfinite) && normalizedProducts.length > 0) {
      if (loadMorePage === 1) {
        setLoadMoreData(normalizedProducts);
      } else {
        setLoadMoreData((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newProducts = normalizedProducts.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
      }
    }
  }, [data, loadMorePage]);

  // Reset accumulated data when filters change
  useEffect(() => {
    setLoadMorePage(1);
    setLoadMoreData([]);
  }, [
    filter?.category?.join(","),
    filter?.brand?.join(","),
    filter?.color?.join(","),
    filter?.sortBy,
    filter?.q,
    filter?.offer_id,
    filter?.price?.join(","),
    filter?.rating?.join(","),
  ]);

  const hasMorePages = data?.meta?.current_page < data?.meta?.last_page;

  const handleLoadMore = () => {
    if (!isLoading && hasMorePages) {
      setLoadMorePage((prev) => prev + 1);
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!isInfinite) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMorePages && !isLoading) {
          setLoadMorePage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [isInfinite, hasMorePages, isLoading]);

  const onLoad = () => {
    if (!isLoading && data?.meta?.last_page !== page) {
      setPage(page + 1);
    }
  };

  useEffect(() => {
    if (grid == 2) {
      setAdjustGrid("col-6");
    } else if (grid == 3) {
      setAdjustGrid("col-xl-4 col-lg-6 col-md-4 col-6");
    } else if (grid == 4) {
      setAdjustGrid("col-xxl-3 col-xl-4 col-lg-6 col-md-4 col-6");
    } else if (grid == "list") {
      setAdjustGrid("col-6 col-sm-12");
    }
  }, [grid]);

  // Responsive grid columns via JS
  const [responsiveCols, setResponsiveCols] = useState(shopLayout?.grid?.columns_desktop || 4);
  useEffect(() => {
    const cols = shopLayout?.grid || {};
    const updateCols = () => {
      const w = window.innerWidth;
      if (w <= 576) setResponsiveCols(cols.columns_mobile || 1);
      else if (w <= 991) setResponsiveCols(cols.columns_tablet || 2);
      else setResponsiveCols(cols.columns_desktop || 4);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, [shopLayout?.grid?.columns_desktop, shopLayout?.grid?.columns_tablet, shopLayout?.grid?.columns_mobile]);

  // Dynamic grid styles from shop layout settings
  const gridStyle = grid !== "list" ? {
    display: "grid",
    gridTemplateColumns: `repeat(${responsiveCols}, minmax(0, 1fr))`,
    columnGap: `${shopLayout?.grid?.grid_gap || 16}px`,
    rowGap: `${shopLayout?.grid?.row_gap || 24}px`,
  } : {};

  const displayProducts = (isLoadMore || isInfinite) ? loadMoreData : normalizedProducts;
  const isSingleProductGrid = grid !== "list" && displayProducts.length === 1;

  return (
    <>
      {(!infiniteScroll && !(isLoadMore || isInfinite) && fetchStatus != "idle") || (isLoading && loadMorePage === 1) ? (
        <Row className="g-xl-4 g-lg-3 g-sm-4 g-3">
          {new Array(perPage > 12 ? 12 : perPage).fill(null).map((_, i) => (
            <Col className={adjustGrid} key={i}>
              <ProductSkeleton />
            </Col>
          ))}
        </Row>
      ) : displayProducts.length > 0 ? (
        <div
          className={`product-wrapper-grid ${
            (infiniteScroll || isLoadMore || isInfinite) ? "product-load-more" : ""
          } ${grid == "list" ? "list-view" : ""} ${
            themeOption?.product?.full_border ? "full_border" : ""
          } ${themeOption?.product?.image_bg ? "product_img_bg" : ""} ${
            themeOption?.product?.product_box_bg ? "full_bg" : ""
          } ${
            themeOption?.product?.product_box_border ? "product_border" : ""
          }`}
        >
          {grid !== "list" ? (
            <div className="shop-layout-grid" style={gridStyle}>
              {displayProducts.map((product, i) => (
                <div key={product.id || i} className={isSingleProductGrid ? "single-product-col" : ""}>
                  <ProductBox product={product} style="vertical" />
                </div>
              ))}
            </div>
          ) : !infiniteScroll ? (
            <Row className="g-xl-4 g-lg-3 g-sm-4 g-3">
              {displayProducts.map((product, i) => (
                <Col
                  className={`${adjustGrid} ${isSingleProductGrid ? "single-product-col" : ""}`}
                  key={product.id || i}
                >
                  <ListProductBox product={product} />
                </Col>
              ))}
            </Row>
          ) : (
            <Row className="g-xl-4 g-lg-3 g-sm-4 g-3">
              {infiniteScrollData?.map((_, i) => (
                <React.Fragment key={i}>
                  {normalizedProducts.map((product, index) => (
                    <Col className={adjustGrid} key={product.id || index}>
                      <ProductBox product={product} style="vertical" />
                    </Col>
                  ))}
                </React.Fragment>
              ))}
            </Row>
          )}
        </div>
      ) : (
        !isLoading && (
          <NoDataFound
            customClass="no-data-added "
            title="NoProductFound"
            description="Please check if you have misspelt something or try searching with other way."
            height="345"
            width="345"
            imageUrl={`/assets/svg/empty-items.svg`}
          />
        )
      )}

      {/* Normal pagination */}
      {!infiniteScroll && !isLoadMore && !isInfinite && (
        data?.meta?.total > data?.meta?.per_page && (
          <div className="product-pagination">
            <div className="theme-pagination-block">
              <nav>
                <Pagination
                  current_page={data?.meta?.current_page}
                  total={data?.meta?.total}
                  per_page={data?.meta?.per_page}
                  setPage={setPage}
                />
              </nav>
            </div>
          </div>
        )
      )}

      {/* Load More button */}
      {isLoadMore && (
        <div className="load-more-sec" style={{ textAlign: "center", padding: "20px 0" }}>
          {isLoading && loadMorePage > 1 ? (
            <img src={`${ImagePath}/loader.gif`} alt="loading" />
          ) : hasMorePages ? (
            <a onClick={handleLoadMore} style={{ cursor: "pointer" }}>{t("LoadMore")}</a>
          ) : displayProducts.length > 0 ? (
            <span className="text-muted">{t("NoMoreProducts") || "No more products"}</span>
          ) : null}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {isInfinite && (
        <div ref={sentinelRef} style={{ textAlign: "center", padding: "20px 0", minHeight: 1 }}>
          {isLoading && loadMorePage > 1 && (
            <img src={`${ImagePath}/loader.gif`} alt="loading" />
          )}
        </div>
      )}

      {/* Legacy infinite scroll support */}
      {infiniteScroll && !isLoadMore && !isInfinite && (
        <div className="load-more-sec">
          {fetchStatus != "idle" ? (
            <img src={`${ImagePath}/loader.gif`} />
          ) : (
            <a onClick={() => onLoad()}>{t("LoadMore")}</a>
          )}
        </div>
      )}
    </>
  );
};

export default CollectionProducts;
