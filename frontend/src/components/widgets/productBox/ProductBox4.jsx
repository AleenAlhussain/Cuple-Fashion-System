import { useSettings } from "@/utils/hooks/useSettings";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import CartButton from "./widgets/CartButton";
import WishlistButton from "./widgets/hoverButton/WishlistButton";
import ProductHoverButton from "./widgets/ProductHoverButton";
import { useTranslation } from "react-i18next";

const ProductBox4 = ({ productState }) => {
  const router = useRouter();
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
      <div className="basic-product theme-product-3">
        <div className="img-wrapper">
          {productState?.product?.discount && <div className="ribbon-round">{productState?.product?.discount}%</div>}
          <Link href={`/product/${productState?.product?.slug}`}>
            <img src={productState?.product?.product_thumbnail?.original_url} className="img-fluid bg-img" alt={productState?.product?.name} />
          </Link>
          <div className="cart-info">
            <WishlistButton productstate={productState?.product} classes="wishlist-icon" />
            <ProductHoverButton productstate={productState.product} actionsToHide={"wishlist"} />
          </div>
        </div>
        <div className="product-detail">
          <a className="product-title" onClick={() => router.push(`/product/${productState?.product?.slug}`)}>
            {lang === 'ar' && productState?.product?.name_ar ? productState.product.name_ar : productState?.product?.name}
          </a>
          <h4 className="price">
            {convertCurrency(productState?.product?.sale_price)} {productState?.product?.discount && <>{productState?.selectedVariation?.price != productState?.selectedVariation?.sale_price || (productState?.product?.price != productState?.product?.sale_price && <del>{convertCurrency(productState?.product?.price)}</del>)}</>}
          </h4>
          <div className="add-cart-button">
            <CartButton productState={productState} selectedVariation={productState.selectedVariation} classes="add-cart-btn" text="Add to cart" />
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductBox4;
