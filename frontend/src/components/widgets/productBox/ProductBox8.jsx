import { useSettings } from "@/utils/hooks/useSettings";
import Link from "next/link";
import React from "react";
import CartButton from "./widgets/CartButton";
import QuickViewButton from "./widgets/hoverButton/QuickViewButton";
import WishlistButton from "./widgets/hoverButton/WishlistButton";
import { useTranslation } from "react-i18next";

const ProductBox8 = ({ productState }) => {
  const { i18n } = useTranslation("common");
  const lang = i18n.language;
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  return (
    <>
      <div className="basic-product theme-product-7">
        <div className="img-wrapper">
          <Link href={`/product/${productState?.product?.slug}`} className="img-fluid lazyload bg-img bg-top">
            <img src={productState?.product?.product_thumbnail?.original_url} className="img-fluid bg-img" alt="product-image" />
          </Link>
          <QuickViewButton productstate={productState?.product} className="quick-option" />
        </div>
        <div className="product-detail">
          <Link href={`/product/${productState?.product?.slug}`} className="product-title mb-2">
            {lang === 'ar' && productState?.product?.name_ar ? productState.product.name_ar : productState?.product?.name}
          </Link>
          <h4 className="price">{convertCurrency(productState?.product?.sale_price)}</h4>
          <div className="product-action">
            <WishlistButton productstate={productState?.product} />
            <CartButton productState={productState} selectedVariation={productState.selectedVariation} text="Add to cart" />
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductBox8;
