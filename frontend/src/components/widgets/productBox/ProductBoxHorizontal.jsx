import { useSettings } from "@/utils/hooks/useSettings";
import { ImagePath } from "@/utils/constants";
import Link from "next/link";
import React from "react";
import CartButton from "./widgets/CartButton";
import ImageVariant from "./widgets/ImageVariant";
import ProductBoxVariantAttribute from "./widgets/ProductBoxVariantAttributes";
import { useTranslation } from "react-i18next";

const ProductBoxHorizontal = ({ productState, style }) => {
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
      {style == "single_product" ? (
        <div className="deal-box">
          <div className="deal-image">
            <ImageVariant height={313} width={402} product={productState?.product} gallery_images={productState?.selectedVariation ? productState?.selectedVariation?.variation_image : productState?.product?.product_galleries} thumbnail={productState?.hoverVariation?.variation_image ? productState?.hoverVariation?.variation_image : productState?.selectedVariation ? productState?.selectedVariation?.variation_image : productState?.product?.product_thumbnail} />
          </div>
          <div className="deal-content">
            {productState?.product?.brand && (
              <Link href={`/brand/${productState?.product?.brand.slug}`} className="product-title">
                <h5 className="gradient-text">{productState?.product?.brand?.name}</h5>
              </Link>
            )}
            <Link href={`/product/ ${productState?.product?.slug}`}>
              <h2>{lang === 'ar' && productState?.product?.name_ar ? productState.product.name_ar : (productState?.selectedVariation ? productState?.selectedVariation?.name : productState?.product?.name)}</h2>
            </Link>
            {(productState?.product?.short_description || productState?.product?.short_description_ar) && <p>{lang === 'ar' && productState?.product?.short_description_ar ? productState.product.short_description_ar : productState?.product?.short_description}</p>}
            <ProductBoxVariantAttribute productState={productState} showVariableType={["color", "rectangle", "circle", "radio", "dropdown", "image"]} />
            <CartButton classes="btn gradient-btn" text="Add To Cart" productState={productState} />
          </div>
        </div>
      ) : (
        <div className="media">
          {productState?.product?.product_thumbnail && (
            <Link href={`/product/${productState?.product?.slug}`}>
              <img className="img-fluid" src={productState?.hoverVariation?.variation_image ? productState?.hoverVariation?.variation_image?.original_url : productState?.selectedVariation?.variation_image ? productState?.selectedVariation?.variation_image?.original_url : productState?.product?.product_thumbnail?.original_url ? productState?.product?.product_thumbnail?.original_url : `${ImagePath}/placeholder.png`} alt="" />
            </Link>
          )}
          <div className="media-body align-self-center">
            <Link href={`/product/${productState?.product?.slug}`}>
              <h6>{lang === 'ar' && productState?.product?.name_ar ? productState.product.name_ar : productState?.product?.name}</h6>
            </Link>
            <h4>
              {productState?.product?.discount ? (
                <>
                  {convertCurrency(productState?.product?.sale_price)}
                  {productState?.selectedVariation?.price != productState?.selectedVariation?.sale_price || (productState?.product?.price != productState?.product?.sale_price && <del>{convertCurrency(productState?.product?.price)}</del>)}
                </>
              ) : (
                convertCurrency(productState?.product?.price)
              )}
            </h4>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductBoxHorizontal;
