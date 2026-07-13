import { useSettings } from "@/utils/hooks/useSettings";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import CartButton from "./widgets/CartButton";
import WishlistButton from "./widgets/hoverButton/WishlistButton";
import ProductBoxVariantAttribute from "./widgets/ProductBoxVariantAttributes";
import ProductHoverButton from "./widgets/ProductHoverButton";

const ProductBox9 = ({ productState, setProductState }) => {
  const router = useRouter();
  const { t, i18n } = useTranslation("common");
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
      <div className="basic-product theme-product-8">
        <div className="img-wrapper">
          <Link href={`/product/${productState?.product?.slug}`} className="img-fluid lazyload bg-img bg-top">
            <img  src={productState?.hoverVariation?.variation_image ? productState?.hoverVariation.variation_image.original_url : productState?.selectedVariation?.variation_image ? productState?.selectedVariation.variation_image.original_url : productState?.product?.product_thumbnail?.original_url} className="img-fluid bg-img" alt="product-image" />
          </Link>
          <div className="cart-info">
            <WishlistButton productstate={productState?.product} />
            <ProductHoverButton productstate={productState.product} actionsToHide={"wishlist"} />
          </div>
          {productState?.product?.product_galleries?.length > 0 && (
            <ul className="general-variant thumbnail">
              <ProductBoxVariantAttribute productState={productState} setProductState={setProductState} showVariableType={["image"]} onSelectVariant={productState?.selectedVariant} />
            </ul>
          )}
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
                <span className="discounted-price">
                  {productState?.product?.discount}% {t("Off")}
                </span>
              </>
            )}
          </h4>
          <CartButton productState={productState} selectedVariation={productState.selectedVariation} classes="add-round-btn" />
        </div>
      </div>
    </>
  );
};

export default ProductBox9;
