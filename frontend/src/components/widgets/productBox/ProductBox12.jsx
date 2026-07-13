import { useSettings } from "@/utils/hooks/useSettings";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import CartButton from "./widgets/CartButton";
import ProductBoxVariantAttribute from "./widgets/ProductBoxVariantAttributes";
import ProductHoverButton from "./widgets/ProductHoverButton";

const ProductBox12 = ({ productState, setProductState }) => {
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
      <div className="basic-product theme-product-11">
        <div className="img-wrapper">
          <Link href={`/product/${productState?.product?.slug}`}>
            <img src={productState?.hoverVariation?.variation_image ? productState?.hoverVariation.variation_image.original_url : productState?.selectedVariation?.variation_image ? productState?.selectedVariation.variation_image.original_url : productState?.product?.product_thumbnail?.original_url} className="img-fluid" alt={productState?.product?.name} />
          </Link>
          <div className="cart-info">
            <ProductHoverButton productstate={productState?.product} />
          </div>
          {productState?.product?.is_trending || productState?.product?.is_sale_enable || productState?.product?.is_featured ? <label className="trending-label-product11 ">{productState?.product?.is_sale_enable ? "Sale" : productState?.product?.is_featured ? "Featured" : productState?.product?.is_trending ? "Trending" : ""}</label> : null}
        </div>
        <div className="product-detail">
          {productState?.product?.brand && (
            <Link href={`/brand/${productState?.product?.brand?.slug}`} className="product-title">
              {productState?.product?.brand?.name}
            </Link>
          )}
          <h6>{lang === 'ar' && productState?.product?.name_ar ? productState.product.name_ar : productState?.product?.name}</h6>
          <h4 className="price">
            {productState?.selectedVariation ? convertCurrency(Number(productState?.selectedVariation.sale_price).toFixed(2)) : convertCurrency(Number(productState?.product?.sale_price))}
            {productState?.selectedVariation
              ? productState?.selectedVariation.discount
              : productState?.product?.discount && (
                  <>
                    {productState?.selectedVariation?.price != productState?.selectedVariation?.sale_price || (productState?.product?.price != productState?.product?.sale_price && <del>{convertCurrency(productState?.product?.price)}</del>)}
                    <span className="discounted-price">
                      {productState?.selectedVariation ? productState?.selectedVariation.discount : productState?.product?.discount}% {t("Off")}
                    </span>
                  </>
                )}
          </h4>
        </div>
        <div className="abs-product">
          <div className="product-detail mt-0">
            {productState?.product?.brand && (
              <Link href={`/brand/${productState?.product?.brand.slug}`} className="product-title mb-2">
                {productState?.product?.brand.name}
              </Link>
            )}
            <h4 className="price">
              {productState?.selectedVariation ? convertCurrency(Number(productState?.selectedVariation.sale_price).toFixed(2)) : convertCurrency(Number(productState?.product?.sale_price).toFixed(2))}
              {productState?.selectedVariation
                ? productState?.selectedVariation.discount
                : productState?.product?.discount && (
                    <>
                      {productState?.selectedVariation?.price != productState?.selectedVariation?.sale_price || (productState?.product?.price != productState?.product?.sale_price && <del>{convertCurrency(productState?.product?.price)}</del>)}
                      <span className="discounted-price">
                        {productState?.selectedVariation ? productState?.selectedVariation.discount : productState?.product?.discount}% {t("Off")}
                      </span>
                    </>
                  )}
            </h4>
          </div>
          <ProductBoxVariantAttribute productState={productState} setProductState={setProductState} showVariableType={["color", "rectangle", "circle", "radio", "dropdown", "image"]} />
          <CartButton productState={productState} selectedVariation={productState?.selectedVariation} text="Add To Cart" iconClass="" classes="add-cart-btn" />
        </div>
      </div>
    </>
  );
};

export default ProductBox12;
