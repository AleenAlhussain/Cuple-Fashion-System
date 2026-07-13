import Btn from "@/elements/buttons/Btn";
import { useTranslation } from "react-i18next";
import { RiShoppingCartLine } from "react-icons/ri";

const AddToCartButton = ({ productState, addToCart, isLoading, buyNow, extraOption }) => {
  const { t } = useTranslation("common");

  // Support both variations and variants field names
  const variants = productState?.product?.variations || productState?.product?.variants || [];

  // Support both quantity and stock_quantity field names
  const getQuantity = (item) => item?.quantity ?? item?.stock_quantity ?? 0;

  const productQty = getQuantity(productState?.product);
  const variationQty = getQuantity(productState?.selectedVariation);

  // Check if all variants are out of stock
  const allVariantsOutOfStock = variants.length > 0 && variants.every((data) => data.status === 0 || !data.is_active);

  // Check if product or selected variation is out of stock
  const isOutOfStock = productState?.selectedVariation
    ? productState?.selectedVariation?.stock_status === "out_of_stock" || variationQty < (productState?.productQty || 1)
    : productState?.product?.stock_status === "out_of_stock" || productQty < (productState?.productQty || 1);

  // Determine if add to cart should be disabled
  const isSimple = productState?.product?.type === "simple" || !variants.length;
  const isDisabled = isSimple
    ? productState?.product?.status === 0 || isOutOfStock
    : !productState?.selectedVariation || productState?.product?.status === 0 || allVariantsOutOfStock || isOutOfStock;

  const externalProductLink = (link) => {
    if (link) {
      window.open(link, "_blank");
    }
  };

  return (
    <div className="product-buy-btn-group">
      {!productState?.product?.is_external ? (
        <>
          <Btn
            color="transparent"
            className={`btn-animation btn-solid hover-solid buy-button ${isDisabled ? "btn-md scroll-button" : "bg-theme btn-md scroll-button"}`}
            onClick={addToCart}
            disabled={isDisabled}
          >
            {!isOutOfStock && (
              <div className="d-inline-block ring-animation">
                <RiShoppingCartLine className="me-2" />
              </div>
            )}
            {isOutOfStock ? t("OutOfStock") : t("AddToCart")}
          </Btn>

          {extraOption !== false && (
            <Btn
              className="btn-solid buy-button"
              onClick={buyNow}
              disabled={isDisabled}
            >
              {t("BuyNow")}
            </Btn>
          )}
        </>
      ) : (
        <Btn className="btn-md bg-theme scroll-button" onClick={() => externalProductLink(productState.product.external_url)}>
          {productState?.product?.external_button_text ? productState?.product?.external_button_text : t("BuyNow")}
        </Btn>
      )}
    </div>
  );
};

export default AddToCartButton;
