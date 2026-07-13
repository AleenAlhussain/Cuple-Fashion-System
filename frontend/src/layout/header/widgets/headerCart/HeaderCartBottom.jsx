import React, { useState, useEffect } from "react";
import { Progress } from "reactstrap";
import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";
import { Href } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { RiShoppingCartLine, RiTruckLine } from "react-icons/ri";
import CartVariationModal from "./CartVariationModal";
import SelectedCart from "./SelectedCart";

const HeaderCartBottom = ({ modal, setModal, shippingFreeAmt, shippingCal }) => {
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const [selectedVariation, setSelectedVariation] = useState("");
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation("common");
  const cart = useCartState((state) => state.cart);
  const clearCart = useCartState((state) => state.clearCart);
  const cartTotal = useCartState((state) => state.cartTotal);
  // Use cartTotal directly from state (already calculated)
  const total = cartTotal;

  useEffect(() => setMounted(true), []);

  // Show empty cart on server and before mount to avoid hydration mismatch
  // (cart loads from localStorage on client only)
  const cartReady = mounted && cart?.length > 0;

  return (
    <>
      {cartReady && (
        <>
          <div className="pere-text-box success-box">
            {shippingFreeAmt > total ? (
              <p>
                {t("Spend")} <span className="shipping">{convertCurrency(shippingFreeAmt - total)}</span> {t("moreandenjoy")} <span className="shipping">{t("FREESHIPPING!")}</span>
              </p>
            ) : (
              <p>
                <span className="shipping">{t("Congratulations")}!</span> {t("Enjoyfreeshippingonus")}!
              </p>
            )}
            <Progress multi>
              {shippingCal <= 30 ? (
                <Progress striped animated color="danger" value={shippingCal}>
                  <div className="progress-icon">
                    <RiTruckLine />
                  </div>
                </Progress>
              ) : shippingCal >= 31 && shippingCal <= 80 ? (
                <Progress striped animated color="warning" value={shippingCal}>
                  <div className="progress-icon">
                    <RiTruckLine />
                  </div>
                </Progress>
              ) : (
                <Progress striped animated value={shippingCal}>
                  <div className="progress-icon">
                    <RiTruckLine />
                  </div>
                </Progress>
              )}
            </Progress>
          </div>
          <div className="sidebar-title">
            <a href={Href} onClick={clearCart}>
              {t("ClearCart")}
            </a>
          </div>
          <SelectedCart setSelectedVariation={setSelectedVariation} setModal={setModal} modal={modal} />
        </>
      )}
      <CartVariationModal modal={modal} setModal={setModal} selectedVariation={selectedVariation} />
      {!cartReady && (
        <div className="cart_media empty-cart">
          <ul className="empty-cart-box">
            <div>
              <div className="icon">
                <RiShoppingCartLine />
              </div>
              <h5>{t("EmptyCartDescription")}</h5>
            </div>
          </ul>
        </div>
      )}
    </>
  );
};

export default HeaderCartBottom;
