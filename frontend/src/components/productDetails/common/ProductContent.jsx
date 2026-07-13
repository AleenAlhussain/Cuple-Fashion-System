import { useCartState } from "@/states";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { Href, cleanText, localizedValue } from "@/utils/constants";
import { useRouter } from "next/navigation";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiFlashlightFill, RiRulerLine, RiTruckLine } from "react-icons/ri";
import AddToCartButton from "./AddToCartButton";
import DeliveryReturnModal from "./allModal/DeliveryReturnModal";
import SizeModal from "./allModal/SizeModal";
import ProductAttribute from "./productAttribute/ProductAttribute";
import ProductDetailAction from "./ProductDetailAction";
import VariantSelector from "./VariantSelector";

const hasRenderablePolicyContent = (content) =>
  String(content || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim().length > 0;

const DELIVERY_ESTIMATE_DAYS = 3;

const getEstimatedDeliveryLabel = (lang) => {
  const date = new Date();
  date.setDate(date.getDate() + DELIVERY_ESTIMATE_DAYS);
  const month = date.toLocaleDateString(lang === "ar" ? "ar" : "en-US", { month: "long" });
  return `${date.getDate()},${month}`;
};

const ProductContent = ({
  productState,
  setProductState,
  productAccordion,
  noDetails,
  noQuantityButtons,
  noModals,
}) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { addToCart: addToCartState, isLoading: cartLoading } = useCartState();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const isLoading = cartLoading;
  const { setCartCanvas, themeOption } = useContext(ThemeOptionContext);
  const router = useRouter();
  const addToCart = () => {
    setCartCanvas(true);
    addToCartState(
      productState?.product,
      productState?.productQty || 1,
      productState?.selectedVariation
    );
  };
  const buyNow = () => {
    addToCartState(
      productState?.product,
      productState?.productQty || 1,
      productState?.selectedVariation
    );
    router.push(`/checkout`);
  };
  const [modal, setModal] = useState("");
  const activeModal = {
    size: (
      <SizeModal
        modal={modal}
        setModal={setModal}
        productState={productState}
      />
    ),
    delivery: (
      <DeliveryReturnModal
        modal={modal}
        setModal={setModal}
        productState={productState}
      />
    ),
  };
  const hasShippingAndReturn = hasRenderablePolicyContent(themeOption?.product?.shipping_and_return) || hasRenderablePolicyContent(themeOption?.product?.shipping_and_return_ar);

  // Normalize product data to support both old and new (transformed) product structures
  const rawProduct = productState?.product;
  const isTransformed = rawProduct?._isTransformed;

  const titleEn =
    productState?.selectedVariation?.title ??
    productState?.selectedVariation?._original?.article ??
    rawProduct?.name ??
    rawProduct?.title ??
    "";
  const title = lang === 'ar' && rawProduct?.name_ar ? rawProduct.name_ar : titleEn;

  // Get prices - variants have the actual prices
  const variantPrice = parseFloat(productState?.selectedVariation?.price) || 0;
  const variantSalePrice = parseFloat(productState?.selectedVariation?.sale_price) || 0;
  const productPrice = parseFloat(rawProduct?.price) || 0;
  const productSalePrice = parseFloat(rawProduct?.sale_price) || 0;

  // Calculate price range from all variants
  const variations = rawProduct?.variations || rawProduct?.variants || [];
  const variantPrices = variations
    .map(v => parseFloat(v.sale_price) || parseFloat(v.price) || 0)
    .filter(p => p > 0);
  const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
  const maxPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0;
  const showPriceRange = !productState?.selectedVariation && minPrice > 0 && maxPrice > minPrice;

  // Use sale_price only if it's greater than 0, otherwise use regular price
  const getEffectivePrice = (salePrice, regularPrice) => {
    if (salePrice && salePrice > 0) return salePrice;
    return regularPrice || 0;
  };

  const salePrice = variantPrice > 0
    ? getEffectivePrice(variantSalePrice, variantPrice)
    : getEffectivePrice(productSalePrice, productPrice);
  const originalPrice = variantPrice > 0 ? variantPrice : productPrice;

  // Only show discount if sale_price is greater than 0 and less than regular price
  const hasDiscount = variantSalePrice > 0 && variantSalePrice < variantPrice;
  const discount = hasDiscount
    ? (productState?.selectedVariation?.discount ?? rawProduct?.discount ?? null)
    : null;
  return (
    <>
      {!noDetails && (
        <>
          <h2 className="main-title">{cleanText(title)}</h2>

          <div className="price-text">
            <h3>
              <span className="text-dark fw-normal"></span>
              {showPriceRange ? (
                <>
                  {convertCurrency(minPrice)} - {convertCurrency(maxPrice)}
                </>
              ) : (
                <>
                  {convertCurrency(salePrice || maxPrice || minPrice)}
                  {discount ? <del>{convertCurrency(originalPrice)}</del> : null}
                  {discount ? (
                    <span className="discounted-price">
                      {discount} % {t("Off")}
                    </span>
                  ) : null}
                </>
              )}
            </h3>
            <span>{t("InclusiveAllTheTax")}</span>
            {productState?.product?.article ? (
              <p style={{ color: "#AAAAAA" }}>
                {t("Article")}: {productState?.product.article}
              </p>
            ) : null}
          </div>
        </>
      )}
      {!noModals ? (
        <>
          <div className="size-delivery-info">
            {productState?.product?.size_chart_image &&
              productState?.product?.size_chart_image.original_url && (
                <a href={Href} onClick={() => setModal("size")}>
                  <RiRulerLine /> {t("SizeChart")}
                </a>
              )}
            {hasShippingAndReturn && productState?.product?.is_return ? (
              <a href={Href} onClick={() => setModal("delivery")}>
                <RiTruckLine /> {t("DeliveryReturn")}
              </a>
            ) : null}
            <span className="delivery-estimate-badge">
              <RiFlashlightFill /> {t("GetItOn", { date: getEstimatedDeliveryLabel(lang) })}
            </span>
          </div>
          {modal && activeModal[modal]}
        </>
      ) : null}

      {!noQuantityButtons && (
        <>
          {(productState?.selectedVariation?.short_description || productState?.product?.short_description) && (
            <div className="product-contain">
              <p>
                {localizedValue(productState?.product, 'short_description', lang) || productState?.selectedVariation?.short_description}
              </p>
            </div>
          )}
          {productState?.product?.status && !productAccordion && (
            <>
              {/* Use VariantSelector for transformed product-variants data */}
              {isTransformed ? (
                <VariantSelector
                  productState={productState}
                  setProductState={setProductState}
                />
              ) : (
                /* Use original ProductAttribute for legacy products */
                productState?.product?.type == "classified" && (
                  <ProductAttribute
                    productState={productState}
                    setProductState={setProductState}
                  />
                )
              )}
            </>
          )}
        </>
      )}
      {!productAccordion && (
        <div className="product-buttons">
          <ProductDetailAction
            productState={productState}
            setProductState={setProductState}
          />
          <AddToCartButton
            productState={productState}
            isLoading={isLoading}
            addToCart={addToCart}
            buyNow={buyNow}
          />
        </div>
      )}
    </>
  );
};

export default ProductContent;
