import { useSettings } from "@/utils/hooks/useSettings";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useRouter } from "next/navigation";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import AddToCartButton from "./AddToCartButton";
import ProductWholesale from "./ProductWholesale";
import { useCartState } from "@/states";

const StickyCheckoutButtons = ({
  productState,
  setProductState,
  extraOption,
  isLoading,
  isDisplay = true,
}) => {
  const { t } = useTranslation("common");
  const { addToCart: addToCartState, updateQuantity } = useCartState();
  const { setCartCanvas } = useContext(ThemeOptionContext);
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };

  const router = useRouter();
  const addToCart = () => {
    setCartCanvas(true);
    addToCartState(productState?.product, productState?.productQty);
  };
  const buyNow = () => {
    addToCartState(productState?.product, productState?.productQty);
    router.push(`/checkout`);
  };

  return (
    <>
      {productState?.product?.wholesales?.length ? (
        <>
          <ProductWholesale productState={productState} />
          <h4>
            {t("TotalPrice")}:{" "}
            <span className="theme-color">
              {convertCurrency(productState?.totalPrice)}
            </span>
          </h4>
        </>
      ) : null}

      {isDisplay && (
        <div>
          <AddToCartButton
            productState={productState}
            isLoading={isLoading}
            addToCart={addToCart}
            buyNow={buyNow}
            extraOption={extraOption}
          />
        </div>
      )}
    </>
  );
};

export default StickyCheckoutButtons;
