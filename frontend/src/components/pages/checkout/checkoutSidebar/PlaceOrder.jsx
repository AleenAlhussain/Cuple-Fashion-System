import Btn from "@/elements/buttons/Btn";
import { useCartState } from "@/states";
import useDiscountState from "@/states/DiscountState";
import useAxios from "@/utils/api/helpers/useAxios";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// BNPL payment methods that require redirect
const BNPL_PAYMENT_METHODS = ["tabby", "tamara"];

const PlaceOrder = ({ values, addToCartData, errors, emailExists, checkingEmail, stripeConfirmHandler, isStripeActive }) => {
  const { t } = useTranslation("common");
  const access_token = Cookies.get("uat");
  const [disable, setDisable] = useState(true);
  const [loading, setLoading] = useState(false);
  const cart = useCartState((state) => state.cart);
  const clearCart = useCartState((state) => state.clearCart);
  const { appliedRuleIds, totals: discountTotals, clearDiscounts } = useDiscountState();
  const axios = useAxios();
  const router = useRouter();

  // Extract specific primitive values to avoid infinite loop from Formik object reference changes
  const billingAddress = values["billing_address"];
  const vName = values["name"];
  const vEmail = values["email"];
  const vPhone = values["phone"];
  const vPaymentMethod = values["payment_method"];
  const vBillingAddressId = values["billing_address_id"];
  const vCreateAccount = values["create_account"];
  const vPassword = values["password"];
  const vPasswordConfirmation = values["password_confirmation"];
  const billingStreet = billingAddress?.street;
  const billingCity = billingAddress?.city;
  const billingCountryId = billingAddress?.country_id;
  const billingState = billingAddress?.state;

  useEffect(() => {
    if (!access_token) {
      // For guest checkout - check if required fields are filled
      const hasAccountDetails = vName && vEmail && vPhone && vPaymentMethod;
      const hasBillingAddress = billingStreet && billingCity && billingCountryId && billingState;

      // If create_account is checked, validate passwords
      let passwordsValid = true;
      if (vCreateAccount) {
        passwordsValid = vPassword &&
                        vPassword.length >= 8 &&
                        vPasswordConfirmation &&
                        vPassword === vPasswordConfirmation;
      }

      const emailCheckCompleted = !checkingEmail;

      setDisable(!(hasAccountDetails && hasBillingAddress && cart.length > 0 && passwordsValid && emailCheckCompleted));
    } else {
      // For logged in users
      setDisable(!(vBillingAddressId && vPaymentMethod && cart.length > 0));
    }
  }, [access_token, vName, vEmail, vPhone, vPaymentMethod, vBillingAddressId, vCreateAccount, vPassword, vPasswordConfirmation, billingStreet, billingCity, billingCountryId, billingState, cart, checkingEmail]);

  const handleClick = async () => {
    if (loading || cart.length === 0) return;

    // Prevent order if email is being checked
    if (checkingEmail && !access_token) {
      ToastNotification("info", t("Please wait while we verify your email..."));
      return;
    }

    setLoading(true);
    try {
      // Check if this is a BNPL payment
      const isBnplPayment = BNPL_PAYMENT_METHODS.includes(values["payment_method"]);

      if (isStripeActive && !isBnplPayment) {
        const confirmFn = stripeConfirmHandler?.handler;
        if (!confirmFn) {
          throw new Error(t("Please wait for the payment form to load before placing your order."));
        }
        await confirmFn();
      }

      const stripePaymentIntentId = values["stripe_payment_intent_id"] || null;
      let orderData;
      let endpoint;

      if (access_token) {
        // Logged-in user - only billing address required (backend uses it for shipping too)
        const billingId = values["billing_address_id"];
        // Also send cart items since backend cart may be empty (frontend uses local state)
        orderData = {
          billing_address_id: parseInt(billingId, 10) || null,
          country_id: values["country_id"] || 1,
          payment_method: values["payment_method"] || "cod",
          payment_intent_id: stripePaymentIntentId,
          coupon_code: values["coupon"] || null,
          customer_notes: values["notes"] || "",
          // Include cart items for backend to use
          items: cart.map(item => ({
            product_id: item.product_id,
            variant_id: item.variation_id || null,
            quantity: item.quantity,
            color: item.color || null,
            size: item.size || null,
            custom_price: item.price ?? null,
            base_price: item.base_price ?? null,
            matchi_bundle_key: item.matchi_bundle_key || null,
            matchi_bundle_sale_total: item.matchi_bundle_sale_total ?? null,
            matchi_bundle_original_total: item.matchi_bundle_original_total ?? null,
            matchi_pair_id: item.matchi_pair_id || null,
          })),
          // Include applied discount rules from Offer Engine
          discount_rule_ids: appliedRuleIds || [],
          discount_amount: discountTotals?.total_discount || 0,
          // Points redemption
          points_to_use: values["points_to_use"] || 0,
        };
        endpoint = "/order";
      } else {
        // Guest checkout - send full address details
        const billing = values["billing_address"];
        const fullPhone = values["country_code"] ? `+${values["country_code"]}${values["phone"]}` : values["phone"];

        orderData = {
          items: cart.map(item => ({
            product_id: item.product_id,
            variant_id: item.variation_id || null,
            quantity: item.quantity,
            color: item.color || null,
            size: item.size || null,
            custom_price: item.price ?? null,
            base_price: item.base_price ?? null,
            matchi_bundle_key: item.matchi_bundle_key || null,
            matchi_bundle_sale_total: item.matchi_bundle_sale_total ?? null,
            matchi_bundle_original_total: item.matchi_bundle_original_total ?? null,
            matchi_pair_id: item.matchi_pair_id || null,
          })),
          shipping_name: values["name"] || "",
          shipping_email: values["email"] || "",
          shipping_phone: fullPhone || "",
          shipping_street: billing?.street || "",
          shipping_city: billing?.city || "",
          shipping_state: billing?.state || "",
          shipping_postal_code: billing?.postal_code || "",
          shipping_country_id: billing?.country_id || 1,
          shipping_latitude: billing?.latitude || null,
          shipping_longitude: billing?.longitude || null,
          country_id: billing?.country_id || 1,
          payment_method: values["payment_method"] || "cod",
          payment_intent_id: stripePaymentIntentId,
          coupon_code: values["coupon"] || null,
          customer_notes: values["notes"] || "",
          create_account: values["create_account"] || false,
          password: values["password"] || null,
          password_confirmation: values["password_confirmation"] || null,
          // Include applied discount rules from Offer Engine
          discount_rule_ids: appliedRuleIds || [],
          discount_amount: discountTotals?.total_discount || 0,
        };
        endpoint = "/checkout/guest";
      }

      const response = await axios({ url: endpoint, method: "POST", data: orderData });

      if (response?.data?.success || response?.status === 201) {
        const orderId = response?.data?.data?.id;

        // If BNPL payment, initiate payment and redirect
        if (isBnplPayment && orderId) {
          await initiateBnplPayment(orderId, values["payment_method"]);
          return; // Don't clear cart yet - wait for payment completion
        }

        // Non-BNPL payment - clear cart and redirect to success
        clearCart();
        clearDiscounts();
        router.push(orderId ? `/order/success/${orderId}` : "/order/success");
      }
    } catch (error) {
      console.error("Order placement failed:", error?.response?.data?.message || error.message);

      // Show specific validation errors if available
      const validationErrors = error?.response?.data?.errors;
      const message = error?.response?.data?.message;

      if (validationErrors && Object.keys(validationErrors).length > 0) {
        const firstError = Object.values(validationErrors)[0];
        ToastNotification("error", Array.isArray(firstError) ? firstError[0] : firstError);
      } else if (message) {
        ToastNotification("error", message);
      } else {
        ToastNotification("error", t("Failed to place order. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initiate BNPL payment (Tabby/Tamara) and redirect to checkout
   */
  const initiateBnplPayment = async (orderId, gateway) => {
    try {
      ToastNotification("info", t("Redirecting to payment..."));

      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      const response = await axios({
        url: "/payment/initiate",
        method: "POST",
        data: {
          order_id: orderId,
          gateway: gateway,
          success_url: `${baseUrl}/checkout/payment/success`,
          failure_url: `${baseUrl}/checkout/payment/failure`,
          cancel_url: `${baseUrl}/checkout`,
        },
      });

      if (response?.data?.success && response?.data?.data?.checkout_url) {
        // Store order ID for later reference
        if (typeof window !== "undefined") {
          sessionStorage.setItem("pending_bnpl_order_id", orderId);
          sessionStorage.setItem("pending_bnpl_gateway", gateway);
        }

        // Redirect to BNPL checkout
        window.location.href = response.data.data.checkout_url;
      } else {
        throw new Error(response?.data?.message || "Failed to initiate payment");
      }
    } catch (error) {
      console.error("BNPL payment initiation failed:", error);
      ToastNotification("error", error?.response?.data?.message || t("Failed to initiate payment. Please try again."));

      // Still show order success but with pending payment
      clearCart();
      clearDiscounts();
      router.push(`/order/success/${orderId}?payment=pending`);
    }
  };

  // Get button text based on payment method
  const getButtonText = () => {
    if (loading) return t("Processing") + "...";

    if (BNPL_PAYMENT_METHODS.includes(values?.payment_method)) {
      return t("ContinueToPayment");
    }

    return t("PlaceOrder");
  };

  return (
    <div className="text-end">
      <Btn
        className="order-btn"
        onClick={handleClick}
        disabled={disable || loading}
        loading={loading}
      >
        {getButtonText()}
      </Btn>
    </div>
  );
};

export default PlaceOrder;
