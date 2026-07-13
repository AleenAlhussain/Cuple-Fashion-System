import { useSettings } from "@/utils/hooks/useSettings";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import CartButton from "./widgets/CartButton";
import ImageVariant from "./widgets/ImageVariant";
import ProductBoxVariantAttribute from "./widgets/ProductBoxVariantAttributes";
import ProductHoverButton from "./widgets/ProductHoverButton";
import { placeHolderImage } from "../Placeholder";
import { storageURL } from "@/utils/constants";

// Helper to get proper image URL
const getImageUrl = (product) => {
  let img = product?.product_thumbnail?.original_url ||
            product?.product_thumbnail ||
            product?.primary_image ||
            product?.main_image;
  if (!img) return placeHolderImage;
  if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) return img;
  return `${storageURL}/${img}`;
};

const ProductBox11 = ({ productState, setProductState }) => {
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
      <div className="basic-product theme-product-10">
        <div className="img-wrapper">
          <ImageVariant
            thumbnail={getImageUrl(productState?.product)}
            gallery_images={productState.product?.product_galleries || productState.product?.media}
            product={productState.product}
            width={750}
            height={750}
          />
          <CartButton
            productState={productState}
            selectedVariation={productState.selectedVariation}
            text="Add to cart"
            classes="addto-cart-bottom"
          />
          <div className="cart-info">
            <ProductHoverButton productstate={productState?.product} />
          </div>
        </div>
        <div className="product-detail">
          {productState?.product?.brand && (
            <Link
              href={`/brand/${productState?.product?.brand.name}`}
              className="product-title"
            >
              {productState?.product?.brand.name}
            </Link>
          )}

          <Link
            href={`/product/${productState?.product?.slug}`}
            className="product-title"
          >
            <h6>
              {lang === 'ar' && productState?.product?.name_ar
                ? productState.product.name_ar
                : (productState?.selectedVariation
                  ? productState?.selectedVariation.name
                  : productState?.product?.name)}
            </h6>
          </Link>

          <h4 className="price">
            {productState?.selectedVariation
              ? convertCurrency(productState?.selectedVariation.sale_price)
              : convertCurrency(productState?.product?.sale_price)}
            {productState?.selectedVariation ? (
              productState?.selectedVariation.discount ? (
                <>
                  {productState?.selectedVariation?.price !=
                    productState?.selectedVariation?.sale_price ||
                    (productState?.product?.price !=
                      productState?.product?.sale_price && (
                      <del>{convertCurrency(productState?.product?.price)}</del>
                    ))}
                  <span className="discounted-price">
                    {productState?.selectedVariation.discount}% {t("Off")}
                  </span>
                </>
              ) : null
            ) : productState?.product?.discount ? (
              <>
                {productState?.selectedVariation?.price !=
                  productState?.selectedVariation?.sale_price ||
                  (productState?.product?.price !=
                    productState?.product?.sale_price && (
                    <del>{convertCurrency(productState?.product?.price)}</del>
                  ))}
                <span className="discounted-price">
                  {productState?.product?.discount}% {t("Off")}
                </span>
              </>
            ) : null}{" "}
            AED
          </h4>

          <ProductBoxVariantAttribute
            productBox11={true}
            productState={productState}
            setProductState={setProductState}
            showVariableType={["dropdown"]}
          />
        </div>
      </div>
    </>
  );
};

export default ProductBox11;
