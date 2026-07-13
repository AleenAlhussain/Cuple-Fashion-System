import NoDataFound from "@/components/widgets/NoDataFound";
import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";
import useCartDiscount from "@/utils/hooks/useCartDiscount";
import useDiscountState from "@/states/DiscountState";
import Loader from "@/layout/loader";
import React from "react";
import { useTranslation } from "react-i18next";
import ApplyCoupon from "./ApplyCoupon";
import PlaceOrder from "./PlaceOrder";
import PointWallet from "./PointWallet";
import DiscountSummary from "./DiscountSummary";
import PromotionMessage from "./PromotionMessage";

const BillingSummary = ({
  data,
  values,
  setFieldValue,
  isLoading,
  mutate,
  storeCoupon,
  setStoreCoupon,
  errorCoupon,
  setErrorCoupon,
  appliedCoupon,
  setAppliedCoupon,
  couponDiscount,
  setCouponDiscount,
  cartTotal: propCartTotal,
  errors,
  emailExists,
  checkingEmail,
  stripeConfirmHandler,
  isStripeActive,
  shippingAmount = 0,
  shippingLabel = "",
  shippingDescription = "",
  shippingLoading = false,
  paymentFee = 0,
  paymentMethod = "",
}) => {
  const { settingData } = useSettings();

  // Get cart state
  const cart = useCartState((state) => state.cart);

  // Format currency with AED symbol
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };

  // Legacy convertCurrency for compatibility
  const convertCurrency = formatCurrency;

  const { t } = useTranslation("common");

  // Calculate subTotal - use sub_total if available, otherwise calculate from price * quantity
  // Ensure we always get a valid number
  const calculateSubTotal = () => {
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return 0;
    }
    return cart.reduce((sum, item) => {
      // Try sub_total first, then calculate from price * quantity
      let itemTotal = 0;
      if (item?.sub_total && !isNaN(Number(item.sub_total))) {
        itemTotal = Number(item.sub_total);
      } else {
        const price = Number(item?.price) || 0;
        const qty = Number(item?.quantity) || 1;
        itemTotal = price * qty;
      }
      return sum + itemTotal;
    }, 0);
  };

  const subTotal = calculateSubTotal();
  const giftDiscount = cart?.reduce((sum, item) => sum + (Number(item?.gift_box_discount) || 0), 0) || 0;
  const baseTotal = Math.max(0, subTotal - giftDiscount);

  // Rule-based discounts from Offer Engine
  const {
    appliedDiscounts,
    totalDiscount: ruleBasedDiscount,
    isCalculating: isCalculatingDiscounts,
    hasDiscounts,
    promotionMessages,
    hasPromotionMessages,
    isCartInitialized,
  } = useCartDiscount({ enabled: true }); // Always enabled - hook handles initialization

  // Also get promotion messages directly from DiscountState as a fallback
  const statePromotionMessages = useDiscountState((state) => state.promotionMessages);

  // Use direct state if hook returns empty (fallback)
  const effectivePromotionMessages = promotionMessages?.length > 0 ? promotionMessages : statePromotionMessages;
  const effectiveHasPromotionMessages = effectivePromotionMessages?.length > 0;


  // Calculate totals
  const discount = couponDiscount || 0;
  const pointsDiscount = Number(values["points_amount"]) || 0;
  const allDiscounts = discount + (ruleBasedDiscount || 0); // Combine coupon + rule-based discounts (without points)
  const paymentFeeValue = Number(paymentFee || 0) || 0;
  const finalTotal = baseTotal - allDiscounts + Number(shippingAmount || 0) + paymentFeeValue;
  const displayTotal = finalTotal - pointsDiscount;
  const shippingLabelText = shippingLabel || shippingDescription;
  const formattedShippingAmount = shippingLoading ? t("Calculating") + "..." : formatCurrency(shippingAmount);
  const formattedPaymentFee = formatCurrency(paymentFeeValue);
  const showPaymentFeeLine = paymentFeeValue > 0 && String(paymentMethod).toLowerCase() === "cod";

  return (
    <div className="checkout-details ">
      {cart?.length > 0 ? (
        <div className="order-box">
          <div className="title-box">
            <h4>{t("BillingSummary")}</h4>
            <ApplyCoupon values={values} setFieldValue={setFieldValue} data={data} storeCoupon={storeCoupon} setStoreCoupon={setStoreCoupon} errorCoupon={errorCoupon} setErrorCoupon={setErrorCoupon} appliedCoupon={appliedCoupon} setAppliedCoupon={setAppliedCoupon} couponDiscount={couponDiscount} setCouponDiscount={setCouponDiscount} cartTotal={baseTotal} mutate={mutate} isLoading={isLoading} />
          </div>
          <div>
            <div className="custom-box-loader">
              {isLoading && (
                <div className="box-loader">
                  <Loader />
                </div>
              )}
              <ul className="sub-total">
                <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t("Subtotal")}</span>
                  <span className="count" style={{ display: 'inline-block', fontWeight: 'bold' }}>{formatCurrency(subTotal)}</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t("ShippingFee")}</span>
                  <span className="count" style={{ display: 'inline-block', fontWeight: 'bold' }}>{formattedShippingAmount}</span>
                </li>
                {showPaymentFeeLine && (
                  <li>
                    {t("CashOnDeliveryFee")}
                    <span className="count">{formattedPaymentFee}</span>
                  </li>
                )}
                {giftDiscount > 0 && (
                  <li className="text-success giftbox-discount-summary">
                    {t("GiftDiscount")}
                    <span className="count text-success">-{formatCurrency(giftDiscount)}</span>
                  </li>
                )}
                {appliedCoupon === "applied" && discount > 0 && (
                  <li className="text-success">
                    {t("CouponDiscount")}
                    <span className="count text-success">-{formatCurrency(discount)}</span>
                  </li>
                )}
                <DiscountSummary
                  appliedDiscounts={appliedDiscounts}
                  isCalculating={isCalculatingDiscounts}
                  convertCurrency={convertCurrency}
                />
                {pointsDiscount > 0 && (
                  <li className="text-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t("PointsDiscount")}</span>
                    <span className="count text-success" style={{ display: 'inline-block', fontWeight: 'bold' }}>-{formatCurrency(pointsDiscount)}</span>
                  </li>
                )}
                <PointWallet values={values} setFieldValue={setFieldValue} cartTotal={finalTotal} />
              </ul>
              <ul className="total">
                {(allDiscounts > 0 || giftDiscount > 0 || pointsDiscount > 0) && (
                  <li className="list-total text-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t("YouSave")}</span>
                    <span className="count text-success" style={{ display: 'inline-block', fontWeight: 'bold' }}>{formatCurrency(allDiscounts + giftDiscount + pointsDiscount)}</span>
                  </li>
                )}
                <li className="list-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t("Total")}</span>
                  <span className="count" style={{ display: 'inline-block', fontWeight: 'bold', fontSize: '18px' }}>{formatCurrency(displayTotal)}</span>
                </li>
              </ul>
              {/* Promotion messages - spend more to unlock discounts */}
              {effectiveHasPromotionMessages && (
                <PromotionMessage messages={effectivePromotionMessages} />
              )}
              <PlaceOrder values={values} errors={errors} emailExists={emailExists} checkingEmail={checkingEmail} stripeConfirmHandler={stripeConfirmHandler} isStripeActive={isStripeActive} />
            </div>
          </div>
        </div>
      ) : (
        <NoDataFound customClass="no-data-added" height={156} width={180} imageUrl={`/assets/svg/empty-items.svg`} title="EmptyCart" />
      )}
    </div>
  );
};

export default BillingSummary;
