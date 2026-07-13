"use client";

import ProductBox from "@/components/widgets/productBox";
import { ShopLayoutProvider, useShopLayout } from "@/context/shopLayoutContext";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext, useEffect, useMemo, useState } from "react";

const ProductRelatedGridContent = ({
  products,
  gridClassName = "product-related-row",
  wrapperClassName = "",
}) => {
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
        setResponsiveCols(cols.columns_mobile || 2);
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
      [
        "product-wrapper-grid",
        themeOption?.product?.full_border ? "full_border" : "",
        themeOption?.product?.image_bg ? "product_img_bg" : "",
        themeOption?.product?.product_box_bg ? "full_bg" : "",
        themeOption?.product?.product_box_border ? "product_border" : "",
        wrapperClassName,
      ]
        .filter(Boolean)
        .join(" "),
    [
      themeOption?.product?.full_border,
      themeOption?.product?.image_bg,
      themeOption?.product?.product_box_bg,
      themeOption?.product?.product_box_border,
      wrapperClassName,
    ]
  );

  const gridClasses = useMemo(
    () => ["shop-layout-grid", gridClassName].filter(Boolean).join(" "),
    [gridClassName]
  );

  return (
    <div className={wrapperClasses}>
      <div className={gridClasses} style={gridStyle}>
        {products.map((product, index) => (
          <div key={product.id || index}>
            <ProductBox product={product} style="vertical" />
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductRelatedGrid = ({
  products,
  gridClassName = "product-related-row",
  wrapperClassName = "",
}) => {
  return (
    <ShopLayoutProvider scope="shop">
      <ProductRelatedGridContent
        products={products}
        gridClassName={gridClassName}
        wrapperClassName={wrapperClassName}
      />
    </ShopLayoutProvider>
  );
};

export default ProductRelatedGrid;
