"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useTranslation } from "react-i18next";
import useAxios from "@/utils/api/helpers/useAxios";
import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";

export const STRIPE_PAYMENT_METHODS = ["stripe_card", "apple_pay", "google_pay"];

const toStringValue = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized === "" ? fallback : normalized;
};

const normalizeStripeMode = (value, fallback = "live") => {
  const normalized = toStringValue(value, "").toLowerCase();
  return normalized === "live" || normalized === "test" ? normalized : fallback;
};

const extractStripeMethodConfig = (rawPaymentMethods) => {
  const defaults = {
    mode: "live",
    test_publishable_key: "",
    test_secret_key: "",
    live_publishable_key: "",
    live_secret_key: "",
  };

  let source = null;
  if (Array.isArray(rawPaymentMethods)) {
    source = rawPaymentMethods.find(
      (entry) => entry?.name === "stripe_card" && typeof entry === "object"
    );
  } else if (rawPaymentMethods && typeof rawPaymentMethods === "object") {
    source = rawPaymentMethods?.stripe_card || rawPaymentMethods?.stripe || null;
  }

  if (!source || typeof source !== "object") {
    return defaults;
  }

  const modeFromSandbox =
    source?.is_sandbox === false || source?.is_sandbox === "0" || source?.is_sandbox === 0
      ? "live"
      : source?.is_sandbox === true || source?.is_sandbox === "1" || source?.is_sandbox === 1
        ? "test"
        : defaults.mode;

  const mode = normalizeStripeMode(source?.mode ?? source?.stripe_mode, modeFromSandbox);
  const legacyPublishable = toStringValue(source?.publishable_key ?? source?.public_key, "");
  const legacySecret = toStringValue(source?.secret_key, "");

  return {
    mode,
    test_publishable_key: toStringValue(
      source?.test_publishable_key ?? source?.test_public_key,
      mode === "test" ? legacyPublishable : ""
    ),
    test_secret_key: toStringValue(
      source?.test_secret_key ?? source?.test_private_key,
      mode === "test" ? legacySecret : ""
    ),
    live_publishable_key: toStringValue(
      source?.live_publishable_key ?? source?.live_public_key,
      mode === "live" ? legacyPublishable : ""
    ),
    live_secret_key: toStringValue(
      source?.live_secret_key ?? source?.live_private_key,
      mode === "live" ? legacySecret : ""
    ),
  };
};

const getActivePublishableKey = (stripeConfig) => {
  if (!stripeConfig || typeof stripeConfig !== "object") return "";

  if (stripeConfig.mode === "live") {
    return (
      toStringValue(stripeConfig.live_publishable_key, "") ||
      toStringValue(stripeConfig.test_publishable_key, "")
    );
  }

  return (
    toStringValue(stripeConfig.test_publishable_key, "") ||
    toStringValue(stripeConfig.live_publishable_key, "")
  );
};

const StripePaymentForm = ({ active, values, setFieldValue, onReady, paymentMethod }) => {
  const { t } = useTranslation("common");
  const { settingData } = useSettings();
  const stripeConfig = useMemo(
    () => extractStripeMethodConfig(settingData?.payment_methods),
    [settingData?.payment_methods]
  );
  const envPublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  const publishableKey = useMemo(
    () => getActivePublishableKey(stripeConfig) || envPublishableKey,
    [stripeConfig, envPublishableKey]
  );
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  const cart = useCartState((state) => state.cart);

  // IMPORTANT: keep callbacks stable across renders
  const axiosInstance = useAxios();
  const axiosRef = useRef(axiosInstance);
  const onReadyRef = useRef(onReady);
  const setFieldValueRef = useRef(setFieldValue);
  useEffect(() => {
    axiosRef.current = axiosInstance;
  }, [axiosInstance]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    setFieldValueRef.current = setFieldValue;
  }, [setFieldValue]);

  const itemsPayload = useMemo(
    () =>
      cart.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variation_id ?? item.variant?.id ?? null,
        quantity: item.quantity,
        color: item.color || null,
        size: item.size || null,
      })),
    [cart]
  );
  const resolvedCountryId = useMemo(
    () => values?.billing_address?.country_id || values?.country_id || 1,
    [values?.billing_address?.country_id, values?.country_id]
  );

  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Guard: do not create payment intent multiple times for same payload
  const lastRequestKeyRef = useRef(null);

  // Track active request to avoid aborting on re-renders
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setClientSecret(null);
      setError(null);
      lastRequestKeyRef.current = null;
      setFieldValueRef.current?.("stripe_payment_intent_id", null);
      setFieldValueRef.current?.("stripe_client_secret", null);
      onReadyRef.current?.(null);
      return;
    }

    if (!itemsPayload.length) {
      setError("Add items to the cart before entering payment details.");
      return;
    }

    if (!stripePromise) {
      setError("Stripe is not configured. Please add publishable key in Payment Methods settings.");
      return;
    }

    const requestKey = JSON.stringify({
      items: itemsPayload,
      coupon_code: values?.coupon || null,
      country_id: resolvedCountryId,
      payment_method: paymentMethod || "stripe_card",
      publishableKey,
      stripe_mode: stripeConfig?.mode || "live",
    });

    // If nothing meaningful changed, don't re-hit backend
    if (lastRequestKeyRef.current === requestKey) return;
    lastRequestKeyRef.current = requestKey;

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    axiosRef.current
      .post(
        "/stripe/payment-intent",
        {
          items: itemsPayload,
          coupon_code: values?.coupon || null,
          country_id: resolvedCountryId,
          payment_method: paymentMethod || "stripe_card",
        },
        { signal: controller.signal }
      )
      .then((response) => {
        const intent = response?.data?.data;
        if (!intent?.client_secret) {
          throw new Error("Stripe client secret is missing.");
        }

        setClientSecret(intent.client_secret);
        setFieldValueRef.current?.("stripe_payment_intent_id", intent.payment_intent_id);
        setFieldValueRef.current?.("stripe_client_secret", intent.client_secret);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.message === "canceled") return;
        setError(err?.response?.data?.message || err?.message || "Unable to prepare the Stripe payment form.");
      })
      .finally(() => setLoading(false));

    // Only abort on unmount, not on re-renders
    return () => {
      // Don't abort - let the request complete
    };
  }, [active, itemsPayload, values?.coupon, resolvedCountryId, paymentMethod, stripePromise, publishableKey, stripeConfig?.mode]);

  if (!active) return null;

  return (
    <div className="mt-4">
      <div className="mb-2 text-sm text-muted">
        {t("StripeSecureCheckout")}
      </div>

      {loading && <div className="text-muted mb-2">{t("PreparingPaymentForm")}</div>}
      {error && <div className="text-danger mb-2">{error}</div>}

      {clientSecret && stripePromise ? (
        <Elements
          key={`elements-${clientSecret}-${paymentMethod || "stripe_card"}`}
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
            },
          }}
        >
          <PaymentElementWrapper onReady={onReady} paymentMethod={paymentMethod} />
        </Elements>
      ) : (
        !loading && !error && <div className="text-muted mb-2">{t("WaitingForStripe")}</div>
      )}
    </div>
  );
};

const PaymentElementWrapper = ({ onReady, paymentMethod }) => {
  const { t } = useTranslation("common");
  const stripe = useStripe();
  const elements = useElements();

  // Keep onReady stable across renders
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!stripe || !elements) {
      // Don't call onReady(null) here - just wait for Stripe to load
      return;
    }

    const confirmPayment = async () => {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: typeof window !== "undefined" ? window.location.href : undefined,
        },
        redirect: "if_required",
      });

      if (result.error) throw result.error;

      if (!result.paymentIntent || result.paymentIntent.status !== "succeeded") {
        throw new Error("The payment could not be confirmed.");
      }

      return result.paymentIntent;
    };

    onReadyRef.current?.(confirmPayment);
  }, [stripe, elements]);

  const [elementError, setElementError] = useState(null);

  // Configure PaymentElement options based on selected payment method
  const paymentElementOptions = useMemo(() => {
    const options = {
      layout: 'tabs',
      wallets: {
        applePay: 'auto',
        googlePay: 'auto',
      },
    };

    // Keep selected wallet first while preserving card fallback.
    if (paymentMethod === 'apple_pay') {
      options.wallets.googlePay = 'never';
      options.paymentMethodOrder = ['apple_pay'];
    } else if (paymentMethod === 'google_pay') {
      options.wallets.applePay = 'never';
      options.paymentMethodOrder = ['google_pay'];
    } else {
      options.paymentMethodOrder = ['card', 'apple_pay', 'google_pay'];
    }

    return options;
  }, [paymentMethod]);

  return (
    <div className="stripe-payment-element">
      {elementError && (
        <div className="text-danger mb-2">
          {t("PaymentFormError")}: {elementError}
        </div>
      )}
      <PaymentElement
        key={`payment-element-${paymentMethod || "stripe_card"}`}
        options={paymentElementOptions}
        onReady={() => {
          setElementError(null);
        }}
        onLoaderError={(event) => {
          console.error("[Stripe] PaymentElement loader error:", event);
          const errMsg = event?.error?.message || JSON.stringify(event) || "Failed to load payment form";
          setElementError(errMsg);
        }}
        onLoadError={(event) => {
          console.error("[Stripe] PaymentElement load error:", event);
          const errMsg = event?.error?.message || JSON.stringify(event) || "Failed to load payment form";
          setElementError(errMsg);
        }}
      />
    </div>
  );
};

export default StripePaymentForm;
