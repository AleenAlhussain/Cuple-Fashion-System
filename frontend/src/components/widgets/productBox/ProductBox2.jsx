import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import { RiDiscountPercentFill } from "react-icons/ri";
import { placeHolderImage } from "../Placeholder";
import CartButton from "./widgets/CartButton";
import WishlistButton from "./widgets/hoverButton/WishlistButton";
import ProductHoverButton from "./widgets/ProductHoverButton";
import { storageURL } from "@/utils/constants";

// Helper to get proper image URL
const getImageUrl = (product) => {
  // Check for product_thumbnail first (from backend) - it's an object with original_url
  let img = product?.product_thumbnail?.original_url ||
            product?.product_thumbnail ||
            product?.primary_image ||
            product?.main_image;
  if (!img) return placeHolderImage;

  // If already a full URL, use it directly
  if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
    return img;
  }

  // Otherwise prepend storage URL
  return `${storageURL}/${img}`;
};

const ProductBox2 = ({ productState }) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // Helper to parse price safely
  const parsePrice = (price) => {
    if (price === null || price === undefined) return 0;
    const parsed = parseFloat(price);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Get the first variant
  const firstVariant = productState?.product?.variants?.[0];

  // Get prices - check product price first, then fall back to variant price
  const productSalePrice = parsePrice(productState?.product?.sale_price);
  const productPrice = parsePrice(productState?.product?.price);
  const variantSalePrice = parsePrice(firstVariant?.sale_price);
  const variantPrice = parsePrice(firstVariant?.price);

  // Determine display price (priority: product sale > product price > variant sale > variant price)
  let displayPrice = productSalePrice > 0
    ? productSalePrice
    : (productPrice > 0
        ? productPrice
        : (variantSalePrice > 0
            ? variantSalePrice
            : variantPrice));

  // Determine original price for strikethrough
  let originalPrice = productPrice > 0 ? productPrice : variantPrice;

  // If sale price is set, original should be the regular price
  if (productSalePrice > 0 && productPrice > 0) {
    originalPrice = productPrice;
    displayPrice = productSalePrice;
  } else if (variantSalePrice > 0 && variantPrice > 0) {
    originalPrice = variantPrice;
    displayPrice = variantSalePrice;
  }

  // Calculate discount percentage
  const discountPercent = originalPrice > 0 && displayPrice < originalPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;

  const hasDiscount = discountPercent > 0 && originalPrice !== displayPrice;

  return (
    <div className="basic-product theme-product-1">
      <div className="overflow-hidden">
        <div className="img-wrapper">
          {productState?.product?.is_trending ||
          productState?.product?.is_sale_enable ||
          productState?.product?.is_featured ? (
            <div
              className={`ribbon ${
                productState?.product?.is_sale_enable
                  ? "sale-tag"
                  : productState?.product?.is_featured
                  ? "featured-tag"
                  : productState?.product?.is_trending
                  ? "trending-tag"
                  : ""
              }`}
            >
              <span>
                {productState?.product?.is_sale_enable
                  ? "sale"
                  : productState?.product?.is_featured
                  ? "featured"
                  : productState?.product?.is_trending
                  ? "trending"
                  : ""}
              </span>
            </div>
          ) : null}

          <Link href={`/product/${productState?.product?.slug || productState?.product?.id}`}>
            <img
              src={getImageUrl(productState?.product)}
              className="img-fluid bg-img"
              alt={productState?.product?.name}
            />
          </Link>
          <div className="cart-info">
            <WishlistButton
              customAnchor={true}
              productstate={productState?.product}
            />
            <CartButton
              productState={productState}
              selectedVariation={productState.product.variants[0]}
            />
            <ProductHoverButton
              productstate={productState?.product}
              actionsToHide={"wishlist"}
            />
          </div>
        </div>
        <div className="product-detail">
          <div>
            <div className="brand-w-color">
              <a
                className="product-title"
                href={`/brand/${productState?.product?.title}`}
              >
                {productState?.product?.title}
              </a>
            </div>
            <a href={`/product/${productState?.product?.slug}`}>
              <h6>
                {lang === 'ar' && productState?.product?.name_ar
                  ? productState.product.name_ar
                  : (productState?.selectedVariation
                    ? productState?.selectedVariation?.name
                    : productState?.product?.name)}
              </h6>
            </a>
            <h4 className="price">
              {displayPrice > 0 ? displayPrice.toFixed(2) : "0.00"} AED
              {hasDiscount && (
                <>
                  <del>{originalPrice.toFixed(2)} AED</del>
                  <span className="discounted-price">
                    {discountPercent}% Off
                  </span>
                </>
              )}
            </h4>
          </div>
          {hasDiscount && (
            <ul className="offer-panel">
              <li>
                <span className="offer-icon">
                  <RiDiscountPercentFill />
                </span>{" "}
                {t("LimitedTimeOffer")}: {discountPercent}% off
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductBox2;
