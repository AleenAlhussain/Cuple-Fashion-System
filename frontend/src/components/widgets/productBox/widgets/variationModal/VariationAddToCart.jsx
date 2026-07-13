import { useCartState } from "@/states";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Btn from "@/elements/buttons/Btn";
import { useRouter } from "next/navigation";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiShoppingCartLine } from "react-icons/ri";

const VariationAddToCart = ({ cloneVariation, setVariationModal }) => {
  const { cartCanvas, setCartCanvas } = useContext(ThemeOptionContext);
  const { t } = useTranslation("common");
  const addToCartAction = useCartState((state) => state.addToCart);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const variations =
    cloneVariation?.product?.variations || cloneVariation?.product?.variants || [];
  const requiresVariantSelection = Array.isArray(variations) && variations.length > 0;
  const availableQuantity = cloneVariation?.selectedVariation
    ? cloneVariation?.selectedVariation?.quantity ??
      cloneVariation?.selectedVariation?.stock_quantity ??
      0
    : cloneVariation?.product?.quantity ??
      cloneVariation?.product?.stock_quantity ??
      0;
  const isSelectionMissing =
    requiresVariantSelection && !cloneVariation?.selectedVariation;
  const productInStock =
    !isSelectionMissing &&
    (cloneVariation?.selectedVariation
      ? cloneVariation?.selectedVariation?.stock_status == "in_stock"
      : cloneVariation?.product?.stock_status == "in_stock");
  const isDisabled =
    cloneVariation?.product?.status === 0 ||
    isSelectionMissing ||
    !productInStock ||
    availableQuantity < (cloneVariation?.productQty || 1);
  const addToCartLabel =
    !isSelectionMissing && !productInStock ? t("SoldOut") : t("AddToCart");

  const addToCart = () => {
    if (isDisabled) return;
    setVariationModal(false);
    setCartCanvas(true);
    addToCartAction(cloneVariation?.product, cloneVariation?.productQty || 1, cloneVariation?.selectedVariation);
  };
  const buyNow = () => {
    if (isDisabled) return;
    addToCartAction(cloneVariation?.product, cloneVariation?.productQty || 1, cloneVariation?.selectedVariation);
    router.push(`/checkout`);
  };

  return (
    <div className="product-buy-btn-group">
      <Btn className="btn-animation btn-solid hover-solid scroll-button buy-button" disabled={isDisabled} onClick={addToCart} loading={isLoading}>
        <RiShoppingCartLine className="me-2" />
        <span>{addToCartLabel}</span>
      </Btn>
      <Btn className="btn-solid buy-button" onClick={() => buyNow(cloneVariation)} disabled={isDisabled} loading={Number(isLoading)}>
        {t("BuyNow")}
      </Btn>
    </div>
  );
};
export default VariationAddToCart;
