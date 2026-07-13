import { useTranslation } from "react-i18next";

const ProductDetails = ({ productState }) => {
  const { t } = useTranslation("common");
  const currency = "AED"; // Currency symbol

  // Get price from selected variation or product
  const getDisplayPrice = () => {
    const variation = productState?.selectedVariation;
    const product = productState?.product;

    // For variation
    if (variation) {
      const salePrice = parseFloat(variation.sale_price) || 0;
      const regularPrice = parseFloat(variation.price) || 0;
      // Use sale_price if it's set and less than regular price, otherwise use regular price
      return salePrice > 0 && salePrice < regularPrice ? salePrice : (regularPrice > 0 ? regularPrice : salePrice);
    }

    // For product
    const productSalePrice = parseFloat(product?.sale_price) || 0;
    const productPrice = parseFloat(product?.price) || 0;
    return productSalePrice > 0 && productSalePrice < productPrice ? productSalePrice : (productPrice > 0 ? productPrice : productSalePrice);
  };

  const getOriginalPrice = () => {
    const variation = productState?.selectedVariation;
    const product = productState?.product;

    if (variation) {
      return parseFloat(variation.price) || 0;
    }
    return parseFloat(product?.price) || 0;
  };

  const displayPrice = getDisplayPrice();
  const originalPrice = getOriginalPrice();
  const hasDiscount = originalPrice > 0 && displayPrice > 0 && displayPrice < originalPrice;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;

  return (
    <>
      <h2 className="name">{productState?.selectedVariation?.name ?? productState?.product?.name}</h2>
      <div className="price-rating">
        <h3 className="theme-color price">
          {displayPrice > 0 ? `${displayPrice.toFixed(2)} ${currency}` : `0.00 ${currency}`}
          {hasDiscount && (
            <>
              <del className="text-content ms-2">{originalPrice.toFixed(2)} {currency}</del>
              <span className="offer-top ms-2">{discountPercent}% {t("Off")}</span>
            </>
          )}
        </h3>
        {/* Reviews disabled */}
      </div>
      <div className="product-contain">
        <p>{productState?.selectedVariation?.short_description ?? productState?.product?.short_description}</p>
      </div>
    </>
  );
};

export default ProductDetails;
