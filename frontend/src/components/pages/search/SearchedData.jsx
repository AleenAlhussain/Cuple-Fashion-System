import NoDataFound from "@/components/widgets/NoDataFound";
import ProductBox from "@/components/widgets/productBox";
import ProductSkeleton from "@/components/widgets/skeletonLoader/ProductSkeleton";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import { ShopLayoutProvider, useShopLayout } from "@/context/shopLayoutContext";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { Col, Row } from "reactstrap";

const SearchGridContent = ({ products }) => {
  const { settings: shopLayout } = useShopLayout();
  const { themeOption } = useContext(ThemeOptionContext);
  const [responsiveCols, setResponsiveCols] = useState(
    shopLayout?.grid?.columns_desktop || 4
  );

  useEffect(() => {
    const cols = shopLayout?.grid || {};

    const updateCols = () => {
      const width = window.innerWidth;

      if (width <= 576) {
        setResponsiveCols(cols.columns_mobile || 1);
      } else if (width <= 991) {
        setResponsiveCols(cols.columns_tablet || 2);
      } else {
        setResponsiveCols(cols.columns_desktop || 4);
      }
    };

    updateCols();
    window.addEventListener("resize", updateCols);

    return () => window.removeEventListener("resize", updateCols);
  }, [
    shopLayout?.grid?.columns_desktop,
    shopLayout?.grid?.columns_tablet,
    shopLayout?.grid?.columns_mobile,
  ]);

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${responsiveCols}, minmax(0, 1fr))`,
    columnGap: `${shopLayout?.grid?.grid_gap || 16}px`,
    rowGap: `${shopLayout?.grid?.row_gap || 24}px`,
  };

  const wrapperClasses = useMemo(
    () =>
      `product-wrapper-grid ${themeOption?.product?.full_border ? "full_border" : ""} ${
        themeOption?.product?.image_bg ? "product_img_bg" : ""
      } ${themeOption?.product?.product_box_bg ? "full_bg" : ""} ${
        themeOption?.product?.product_box_border ? "product_border" : ""
      }`,
    [
      themeOption?.product?.full_border,
      themeOption?.product?.image_bg,
      themeOption?.product?.product_box_bg,
      themeOption?.product?.product_box_border,
    ]
  );

  const isSingleProductGrid = products.length === 1;

  return (
    <div className={wrapperClasses}>
      <div className="shop-layout-grid" style={gridStyle}>
        {products.map((product, index) => (
          <div
            key={product?.id || index}
            className={isSingleProductGrid ? "single-product-col" : ""}
          >
            <ProductBox product={product} style="vertical" />
          </div>
        ))}
      </div>
    </div>
  );
};

const SearchedData = ({ data, fetchStatus }) => {
  const [mainProducts, setMainProducts] = useState([]);
  const param = useSearchParams();
  const searchParam = param.get("search");

  useEffect(() => {
    if (searchParam) {
      setMainProducts(data);
    } else {
      setMainProducts(data?.slice(0, 12));
    }
  }, [searchParam,data]);

  return (
    <WrapperComponent classes={{ sectionClass: "section-b-space", fluidClass: "container" }} noRowCol={true}>
      {fetchStatus == "fetching" ? (
        <Row className="g-xl-4 g-lg-3 g-sm-4 g-3">
          {new Array(8).fill(null).map((_, i) => (
            <Col className="col-xxl-3 col-xl-4 col-lg-6 col-md-4 col-6" key={i}>
              <ProductSkeleton />
            </Col>
          ))}
        </Row>
      ) : data?.length > 0 ? (
        <ShopLayoutProvider scope="shop">
          <SearchGridContent products={mainProducts} />
        </ShopLayoutProvider>
      ) : (
        <NoDataFound imageUrl={`/assets/svg/empty-items.svg`} customClass="collection-no-data no-data-added" title="productsNoFound" description="productsNoFoundDescription" height="300" width="300" u />
      )}
    </WrapperComponent>
  );
};

export default SearchedData;
