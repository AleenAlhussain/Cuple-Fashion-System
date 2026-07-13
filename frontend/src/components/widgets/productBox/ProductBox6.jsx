import { useSettings } from "@/utils/hooks/useSettings";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import CartButton from "./widgets/CartButton";
import ProductHoverButton from "./widgets/ProductHoverButton";
import OfferTimer from "@/components/productDetails/common/OfferTimer";

const ProductBox6 = ({ productState }) => {
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  return (
    <>
      <div className="basic-product theme-product-5">
        <div className="img-wrapper">
          {productState?.product?.sale_starts_at && productState?.product?.sale_expired_at && <div className="d-none d-sm-flex"><OfferTimer productState={productState} noHeading /></div>}
          <Link href={`/product/${productState?.product?.slug}`}>
            <img src={productState?.selectedVariation ? productState?.selectedVariation.variation_image.original_url : productState?.product?.product_thumbnail?.original_url} className="img-fluid bg-img" alt={productState?.product?.name} />
          </Link>
          <div className="cart-info">
            <CartButton productState={productState} selectedVariation={productState.selectedVariation} />
            <ProductHoverButton productstate={productState.product} />
          </div>
          {productState?.product?.is_trending || productState?.product?.is_sale_enable || productState?.product?.is_featured ? <label className="rotate-label">{productState?.product?.is_sale_enable ? "sale" : productState?.product?.is_featured ? "featured" : productState?.product?.is_trending ? "trending" : ""}</label> : null}
        </div>
        <div className="product-detail">
          <div className="brand-w-color">
            {productState?.product?.brand && (
              <Link className="product-title" href={`/brand/${productState?.product?.brand.slug}`}>
                {productState?.product?.brand.name}
              </Link>
            )}
          </div>
          <h6>{lang === 'ar' && productState?.product?.name_ar ? productState.product.name_ar : productState?.product?.name}</h6>
          <h4 className="price">
            {productState?.selectedVariation ? convertCurrency(productState?.selectedVariation?.sale_price) : convertCurrency(productState?.product?.sale_price)}{" "}
            {productState?.selectedVariation ? (
              <>
                {productState?.selectedVariation?.price != productState?.selectedVariation?.sale_price || productState?.product?.price != productState?.product?.sale_price ? <del>{convertCurrency(productState?.selectedVariation?.price)}</del> : ""}
                <span className="discounted-price">
                  {productState?.selectedVariation?.discount} % {t("Off")}
                </span>
              </>
            ) : (
              <>
                {productState?.selectedVariation?.price != productState?.selectedVariation?.sale_price || productState?.product?.price != productState?.product?.sale_price && <del>{convertCurrency(productState?.product?.price)}</del> }
                <span className="discounted-price">
                  {productState?.product?.discount} % {t("Off")}
                </span>
              </>
            )}
          </h4>
        </div>
      </div>
    </>
  );
};

export default ProductBox6;
