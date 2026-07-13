import { useSettings } from "@/utils/hooks/useSettings";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import CartButton from "./widgets/CartButton";
import WishlistButton from "./widgets/hoverButton/WishlistButton";
import ProductBoxVariantAttribute from "./widgets/ProductBoxVariantAttributes";
import ProductHoverButton from "./widgets/ProductHoverButton";

const ProductBox5 = ({ productState, setProductState }) => {
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
      <div className="basic-product theme-product-4">
        <div className="img-wrapper">
          <Link href={`/product/${productState?.product?.slug}`}>
            <img src={productState?.hoverVariation?.variation_image ? productState?.hoverVariation.variation_image.original_url : productState?.selectedVariation?.variation_image ? productState?.selectedVariation.variation_image.original_url : productState?.product?.product_thumbnail.original_url} className="img-fluid bg-img" alt={productState?.product?.name} />
          </Link>
          <ul className="trending-label">
            {productState?.product?.is_sale_enable ? <li>{t("Sale")}</li> : null}
            {productState?.product?.is_featured ? <li>{t("Featured")}</li> : null}
            {productState?.product?.is_trending ? <li>{t("Trending")}</li> : null}
          </ul>

          <div className="color-panel coverflow">
            <ProductBoxVariantAttribute productState={productState} setProductState={setProductState} showVariableType={["color"]} />
          </div>

          <div className="cart-info">
            <WishlistButton productstate={productState?.product} classes="wishlist-icon" />
            <CartButton productState={productState} selectedVariation={productState.selectedVariation} />
            <ProductHoverButton productstate={productState.product} actionsToHide={"wishlist"} />
          </div>
        </div>

        <div className="product-detail">
          <a className="product-title mb-2" onClick={() => router.push(`/product/${productState?.product?.slug}`)}>
            {lang === 'ar' && productState?.product?.name_ar ? productState.product.name_ar : (productState?.selectedVariation ? productState?.selectedVariation.name : productState?.product?.name)}
          </a>

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
    </>
  );
};

export default ProductBox5;
