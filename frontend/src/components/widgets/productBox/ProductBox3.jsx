import { useSettings } from "@/utils/hooks/useSettings";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import CartButton from "./widgets/CartButton";
import QuickViewButton from "./widgets/hoverButton/QuickViewButton";
import WishlistButton from "./widgets/hoverButton/WishlistButton";
import ProductBoxVariantAttribute from "./widgets/ProductBoxVariantAttributes";

const ProductBox3 = ({ productState, setProductState }) => {
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
      <div className="basic-product theme-product-2">
        <div className="product-detail mt-0">
          <Link className="product-title" href={`/product/${productState?.product?.slug}`}>
            {lang === 'ar' && productState?.product?.name_ar ? productState.product.name_ar : (productState?.selectedVariation ? productState?.selectedVariation.name : productState?.product?.name)}
          </Link>
          {productState?.product?.unit && (
            <ul className="details">
              <li>{productState?.product?.unit}</li>
            </ul>
          )}
          <div className="add-wish">
            <WishlistButton productstate={productState?.product} />
          </div>
        </div>
        <div className="img-wrapper">
          <Link href={`/product/${productState?.product?.slug}`}>
            <img src={productState?.hoverVariation?.variation_image ? productState?.hoverVariation.variation_image.original_url : productState?.selectedVariation?.variation_image ? productState?.selectedVariation.variation_image.original_url : productState?.product?.product_thumbnail?.original_url} className="img-fluid" alt={productState?.product?.name} />
          </Link>
          <div className="quick-view-part">
            <QuickViewButton productstate={productState?.product} />
          </div>
        </div>
        <div className="bottom-detail">
          <div>
            <div className="color-panel color-lg">
              <ProductBoxVariantAttribute productState={productState} setProductState={setProductState} showVariableType={["color"]} />
            </div>
            <h4 className="price">
              {productState?.selectedVariation ? convertCurrency(productState?.selectedVariation.sale_price) : convertCurrency(productState?.product?.sale_price)}{" "}
              {productState?.selectedVariation ? (
                <>
                  {productState?.selectedVariation?.price != productState?.selectedVariation?.sale_price || (productState?.product?.price != productState?.product?.sale_price && <del>{convertCurrency(productState?.product?.price)}</del>)}
                  <span className="discounted-price">
                    {productState?.selectedVariation.discount}% {t("Off")}
                  </span>
                </>
              ) : (
                <>
                  {productState?.selectedVariation?.price != productState?.selectedVariation?.sale_price || (productState?.product?.price != productState?.product?.sale_price && <del>{convertCurrency(productState?.product?.price)}</del>)}
                  <span className="discounted-price">
                    {productState?.product?.discount}% {t("Off")}
                  </span>
                </>
              )}
            </h4>
          </div>
        </div>
        <ul className="cart-detail">
          <li>
            <CartButton productState={productState} selectedVariation={productState.selectedVariation} text="Add to cart" />
          </li>
        </ul>
      </div>
    </>
  );
};

export default ProductBox3;
