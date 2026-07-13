import { useSettings } from "@/utils/hooks/useSettings";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import CartButton from "./widgets/CartButton";
import ProductHoverButton from "./widgets/ProductHoverButton";

const ProductBox7 = ({ productState }) => {
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
      <div className="basic-product theme-product-6">
        <div className="img-wrapper">
          {productState?.product?.unit && <label className="unit-label">{productState?.product?.unit}</label>}

          <ul className="trending-label">
            {productState?.product?.is_sale_enable ? <li>{t("Sale")}</li> : null}
            {productState?.product?.is_featured ? <li>{t("Featured")}</li> : null}
            {productState?.product?.is_trending ? <li>{t("Trending")}</li> : null}
          </ul>

          <Link href={`/product/${productState?.product?.slug}`} className="img-fluid lazyload bg-img bg-top">
            <img src={productState?.product?.product_thumbnail?.original_url} className="img-fluid bg-img" alt="product-image" />
          </Link>
          <div className="cart-info">
            <ProductHoverButton productstate={productState.product} />
          </div>
        </div>
        <div className="product-detail">
          <Link href={`/product/${productState?.product?.slug}`} className="product-title">
            {lang === 'ar' && productState?.product?.name_ar ? productState.product.name_ar : productState?.product?.name}
          </Link>
          <h4 className="price">
            {convertCurrency(productState?.product?.sale_price)}{" "}
            {productState?.product?.discount && (
              <>
                {productState?.selectedVariation?.price != productState?.selectedVariation?.sale_price || (productState?.product?.price != productState?.product?.sale_price && <del>{convertCurrency(productState?.product?.price)}</del>)}
                <span className="discounted-price">{productState?.product?.discount}% Off</span>
              </>
            )}
          </h4>
          <div className="addtocart_btn">
            <CartButton productState={productState} selectedVariation={productState.selectedVariation} quantity={true} classes="add-button add_cart" text="Add to cart" />
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductBox7;
