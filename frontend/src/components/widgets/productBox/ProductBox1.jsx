import { useSettings } from "@/utils/hooks/useSettings";
import { storageURL, cleanText } from "@/utils/constants";
import { useShopLayout } from "@/context/shopLayoutContext";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import CartButton from "./widgets/CartButton";
import ImageVariant from "./widgets/ImageVariant";
import ProductHoverButton from "./widgets/ProductHoverButton";

const ASPECT_RATIOS = { "1:1": "100%", "4:5": "125%", "3:4": "133.33%", "auto": null };
const FONT_SIZES = { small: "0.8rem", medium: "1rem", large: "1.2rem" };

const ProductBox1 = ({ productState, setProductState }) => {
  const { settingData } = useSettings();
  const { settings: shopLayout } = useShopLayout();
  const cc = shopLayout?.card_content;
  const ci = shopLayout?.card_image;
  const tx = shopLayout?.text;

  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // Get product data - support both old and new API format
  const product = productState?.product;
  const firstVariant = product?.variants?.[0];

  // Helper to get proper URL (handles external URLs)
  const getProperUrl = (url) => {
    if (!url) return null;
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) return url;
    return `${storageURL}/${url}`;
  };

  // Extract values supporting both formats
  const productName = lang === 'ar' && product?.name_ar ? product.name_ar : (product?.name || product?.title);
  const productSlug = product?.slug || product?.article;
  const productThumbnail =
    product?.product_thumbnail?.original_url ||
    (typeof product?.product_thumbnail === 'string' ? product?.product_thumbnail : null) ||
    (product?.main_image ? getProperUrl(product.main_image) : null);
  const productGalleries =
    product?.product_galleries ||
    product?.media?.map((m) => ({
      id: m.id,
      original_url: getProperUrl(m.url),
    })) ||
    [];

  const parsePrice = (priceValue) => {
    if (typeof priceValue === "number") return priceValue;
    if (typeof priceValue === "string") {
      return parseFloat(priceValue.replace(/[^\d.]/g, "")) || 0;
    }
    return 0;
  };

  const salePriceNum = parsePrice(product?.sale_price);
  const regularPriceNum = parsePrice(product?.price);
  const variantSalePriceNum = parsePrice(firstVariant?.sale_price);
  const variantPriceNum = parsePrice(firstVariant?.price);

  const productPrice = salePriceNum > 0
    ? salePriceNum
    : (regularPriceNum > 0
        ? regularPriceNum
        : (variantSalePriceNum > 0
            ? variantSalePriceNum
            : variantPriceNum));

  const originalPrice = regularPriceNum > 0 ? regularPriceNum : variantPriceNum;

  const getProductImage = () => productThumbnail;

  // Image wrapper styles from shop layout
  const imageWrapperStyle = {};
  const imgStyle = {};
  if (ci) {
    const ratio = ASPECT_RATIOS[ci.aspect_ratio];
    if (ci.height_mode === "fixed" && ci.fixed_height) {
      imageWrapperStyle.height = `${ci.fixed_height}px`;
      imageWrapperStyle.overflow = "hidden";
      imgStyle.objectFit = ci.image_fit || "cover";
      imgStyle.height = "100%";
      imgStyle.width = "100%";
    } else if (ci.height_mode === "ratio" && ratio) {
      imageWrapperStyle.paddingBottom = ratio;
      imageWrapperStyle.position = "relative";
      imageWrapperStyle.height = 0;
      imageWrapperStyle.overflow = "hidden";
      imgStyle.position = "absolute";
      imgStyle.top = 0;
      imgStyle.left = 0;
      imgStyle.width = "100%";
      imgStyle.height = "100%";
      imgStyle.objectFit = ci.image_fit || "cover";
    }
  }

  // Title style from text settings
  const titleStyle = {};
  if (tx) {
    if (tx.title_font_size && FONT_SIZES[tx.title_font_size]) {
      titleStyle.fontSize = FONT_SIZES[tx.title_font_size];
    }
    if (tx.title_max_lines) {
      titleStyle.display = "-webkit-box";
      titleStyle.WebkitLineClamp = tx.title_max_lines;
      titleStyle.WebkitBoxOrient = "vertical";
      titleStyle.overflow = "hidden";
    }
  }

  const priceStyle = {};
  if (tx?.price_font_size && FONT_SIZES[tx.price_font_size]) {
    priceStyle.fontSize = FONT_SIZES[tx.price_font_size];
  }

  const showAddToCart = cc?.show_add_to_cart !== false;
  const showWishlist = cc?.show_wishlist !== false;
  const showQuickView = cc?.show_quick_view !== false;
  const showSaleBadge = cc?.show_sale_badge !== false;
  const showTitle = cc?.show_title !== false;
  const showPrice = cc?.show_price !== false;

  // Check if image needs custom styling
  const hasCustomImageStyle = Object.keys(imageWrapperStyle).length > 0;

  return (
    <div className="basic-product">
      <div className="img-wrapper" style={hasCustomImageStyle ? imageWrapperStyle : undefined}>
        {hasCustomImageStyle ? (
          <Link href={`/product/${productSlug}`}>
            <img
              src={getProductImage() || "/assets/images/placeholder.png"}
              alt={productName || "Product"}
              style={imgStyle}
            />
          </Link>
        ) : (
          <ImageVariant
            thumbnail={getProductImage()}
            gallery_images={productGalleries}
            product={product}
            width={750}
            height={750}
          />
        )}

        <div className="cart-info">
          {showAddToCart && (
            <CartButton
              classes={"addto-cart-bottom"}
              productState={productState}
              selectedVariation={firstVariant}
              text="Add to Cart"
            />
          )}
          {(showWishlist || showQuickView) && (
            <ProductHoverButton
              productstate={product}
              actionsToHide={[
                ...(!showWishlist ? ["wishlist"] : []),
                ...(!showQuickView ? ["view"] : []),
              ]}
            />
          )}
        </div>

        {showSaleBadge && (
          <ul className="trending-label">
            {product?.has_offer ? <li>{t("Offer")}</li> : null}
            {product?.is_sale_enable ? <li>{t("Sale")}</li> : null}
            {product?.is_featured ? <li>{t("Featured")}</li> : null}
            {product?.is_trending ? <li>{t("Trending")}</li> : null}
          </ul>
        )}
      </div>

      <div className="product-detail">
        {product?.sku && (
          <span className="product-sku text-muted" style={{ fontSize: '12px' }}>
            {product.sku}
          </span>
        )}

        {showTitle && (
          <Link href={`/product/${productSlug}`}>
            <h6 style={titleStyle}>{cleanText(productName)}</h6>
          </Link>
        )}

        {showPrice && (
          <h4 className="price" style={priceStyle}>
            {productPrice > 0 ? convertCurrency(productPrice) : 'Price not available'}
            {originalPrice > productPrice && productPrice > 0 && (
              <del className="text-muted ms-2" style={{ fontSize: '14px' }}>
                {convertCurrency(originalPrice)}
              </del>
            )}
          </h4>
        )}
      </div>
    </div>
  );
};

export default ProductBox1;
