import NoDataFound from "@/components/widgets/NoDataFound";
import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";

import useCreate from "@/utils/hooks/useCreate";
import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";
import { Col } from "reactstrap";
import BillingSummary from "./BillingSummary";
import SidebarProduct from "./SidebarProduct";

const CheckoutAPI = "/order";

const CheckoutSidebar = ({
  values,
  setFieldValue,
  errors,
  addToCartData,
  emailExists,
  checkingEmail,
  stripeConfirmHandler,
  isStripeActive,
  shippingAmount,
  shippingLabel,
  shippingDescription,
  shippingLoading,
  paymentFee = 0,
  paymentMethod = "",
}) => {
  const [storeCoupon, setStoreCoupon] = useState("");
  const cart = useCartState((state) => state.cart);
  const cartTotal = useCartState((state) => state.cartTotal);
  const [errorCoupon, setErrorCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const { settingData } = useSettings();
  const access_token = Cookies.get("uat");
  const [resData, setResData] = useState({});

  const { isLoading } = useCreate(
    CheckoutAPI,
    false,
    false,
    true,
    (resDta) => {
      if (resDta?.status == 200 || resDta?.status == 201) {
        setResData(resDta);
        setErrorCoupon("");
        storeCoupon !== "" && setAppliedCoupon("applied");
      } else {
        setErrorCoupon(resDta?.response?.data?.message);
      }
    },
    false,
    setErrorCoupon,
    false,
    false,
    false,
    (resDta) => {
      setStoreCoupon("");
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setFieldValue("coupon", "");
      values["coupon"] = "";
    }
  );

  // Extract primitive values to avoid infinite loop from Formik object reference changes
  const vPointsAmount = values["points_amount"];
  const vWalletBalance = values["wallet_balance"];
  const vBillingAddressId = values["billing_address_id"];
  const vDeliveryDescription = values["delivery_description"];
  const vPaymentMethod = values["payment_method"];
  const vShippingAddressId = values["shipping_address_id"];
  const vDeliveryInterval = values["delivery_interval"];

  // Submitting data on Checkout
  useEffect(() => {
    if (settingData?.activation?.guest_checkout && !access_token) {
      if (vDeliveryDescription && vPaymentMethod) {
        setFieldValue("products", cart);
        // Put your logic here
      }
    } else {
      if (access_token && vBillingAddressId && vShippingAddressId && vDeliveryDescription && vPaymentMethod) {
        // Put Your logic here
      }
    }
  }, [cart, cartTotal, vPointsAmount, vWalletBalance, vBillingAddressId, vDeliveryDescription, vPaymentMethod, vShippingAddressId, vDeliveryInterval]);

  return (
    <>
      <Col lg="5">
        {cart?.length > 0 ? (
          <div className="checkout-right-box">
            <SidebarProduct values={values} setFieldValue={setFieldValue} />
            <BillingSummary
              values={values}
              errors={errors}
              setFieldValue={setFieldValue}
              data={resData}
              errorCoupon={errorCoupon}
              setErrorCoupon={setErrorCoupon}
              appliedCoupon={appliedCoupon}
              setAppliedCoupon={setAppliedCoupon}
              storeCoupon={storeCoupon}
              setStoreCoupon={setStoreCoupon}
              couponDiscount={couponDiscount}
              setCouponDiscount={setCouponDiscount}
              cartTotal={cartTotal}
              isLoading={isLoading}
              addToCartData={addToCartData}
              emailExists={emailExists}
              checkingEmail={checkingEmail}
              stripeConfirmHandler={stripeConfirmHandler}
              isStripeActive={isStripeActive}
              shippingAmount={shippingAmount}
              shippingLabel={shippingLabel}
              shippingDescription={shippingDescription}
              shippingLoading={shippingLoading}
              paymentFee={paymentFee}
              paymentMethod={paymentMethod}
            />
          </div>
        ) : (
          <NoDataFound customClass="no-data-added" height={156} width={180} imageUrl={`/assets/svg/empty-items.svg`} title="EmptyCart" />
        )}
      </Col>
    </>
  );
};

export default CheckoutSidebar;
