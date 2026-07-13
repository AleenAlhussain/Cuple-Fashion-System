import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";
import useCartDiscount from "@/utils/hooks/useCartDiscount";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Btn from "@/elements/buttons/Btn";
import Cookies from "js-cookie";
import Link from "next/link";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { RiArrowLeftLine } from "react-icons/ri";
import { Col } from "reactstrap";

const CartSidebar = () => {
  const cart = useCartState((state) => state.cart);
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const { setOpenAuthModal } = useContext(ThemeOptionContext);
  const { t } = useTranslation("common");
  const isAuth = Cookies.get("uat");

  // Rule-based discounts from Offer Engine
  const { totalDiscount: ruleDiscount, appliedDiscounts, isCalculating } = useCartDiscount({
    enabled: cart?.length > 0
  });

  const subTotal = cart?.reduce((sum, item) => sum + (item?.sub_total || 0), 0) || 0;
  const giftDiscount = cart?.reduce((sum, item) => sum + (item?.gift_box_discount || 0), 0) || 0;
  const allDiscounts = giftDiscount + (ruleDiscount || 0);
  const total = Math.max(0, subTotal - allDiscounts);
  return (
    <Col xxl={3} xl={4}>
      <div className="summery-box p-sticky">
        <div className="summery-header">
          <h3>{t("CartTotal")}</h3>
        </div>

        <div className="summery-contain">
          <ul>
            <li>
              <h4>{t("Subtotal")}</h4>
              <h4 className="price">{convertCurrency(subTotal.toFixed(2))}</h4>
            </li>
            {giftDiscount > 0 && (
              <li>
                <h4>{t("GiftDiscount")}</h4>
                <h4 className="price text-success">-{convertCurrency(giftDiscount.toFixed(2))}</h4>
              </li>
            )}
            {appliedDiscounts?.map((discount, idx) => (
              <li key={idx}>
                <h4 className="text-success">{discount.name}</h4>
                <h4 className="price text-success">-{convertCurrency(Number(discount.amount).toFixed(2))}</h4>
              </li>
            ))}
            {isCalculating && (
              <li>
                <h4 className="text-muted">{t("Calculating")}...</h4>
                <h4 className="price text-muted">...</h4>
              </li>
            )}

            <li className="align-items-start">
              <h4>{t("Shipping")}</h4>
              <h4 className="price text-end">{t("CostatCheckout")}</h4>
            </li>

            <li className="align-items-start">
              <h4>{t("Tax")}</h4>
              <h4 className="price text-end">{t("CostatCheckout")}</h4>
            </li>
          </ul>
        </div>

        <ul className="summery-total">
          {allDiscounts > 0 && (
            <li className="list-total border-top-0 text-success">
              <h4>{t("YouSave")}</h4>
              <h4 className="price text-success">{convertCurrency(allDiscounts.toFixed(2))}</h4>
            </li>
          )}
          <li className="list-total border-top-0">
            <h4>{t("Total")}</h4>
            <h4 className="price theme-color">{convertCurrency(total.toFixed(2))}</h4>
          </li>
        </ul>

        <div className="button-group cart-button">
          <ul>
            <li>
              <Link href={isAuth ? `/checkout` : `${setOpenAuthModal(true)}`} className="btn btn-animation proceed-btn fw-bold">
                {t("ProcessToCheckout")}
              </Link>
            </li>

            <li>
              <Btn className="btn-light shopping-button text-dark">
                <RiArrowLeftLine /> {t("ReturnToShopping")}
              </Btn>
            </li>
          </ul>
        </div>
      </div>
    </Col>
  );
};

export default CartSidebar;
