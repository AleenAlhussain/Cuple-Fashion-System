import CheckoutCard from "./common/CheckoutCard";
import { Col, Input, Label, Row, Spinner } from "reactstrap";
import { RiBankCardLine } from "react-icons/ri";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/utils/hooks/useSettings";
import StripePaymentForm, { STRIPE_PAYMENT_METHODS } from "./StripePaymentForm";
import useAxios from "@/utils/api/helpers/useAxios";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import Image from "next/image";

// BNPL payment methods (Tabby, Tamara)
const BNPL_PAYMENT_METHODS = ["tabby", "tamara"];

const LEGACY_PAYMENT_METHOD_KEY_MAP = {
  cod: ["cod"],
  stripe_card: ["stripe_card", "stripe"],
  apple_pay: ["apple_pay", "stripe"],
  google_pay: ["google_pay", "stripe"],
  tabby: ["tabby"],
  tamara: ["tamara"],
};

const toBool = (value, fallback = true) => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
};

const normalizePaymentMethodStatusMap = (raw) => {
  const defaults = {
    cod: true,
    stripe_card: true,
    apple_pay: true,
    google_pay: true,
    tabby: true,
    tamara: true,
  };

  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      const name = item?.name;
      if (!name || !(name in defaults)) return;
      defaults[name] = toBool(item?.status, defaults[name]);
    });
    return defaults;
  }

  if (raw && typeof raw === "object") {
    Object.keys(defaults).forEach((name) => {
      const keys = LEGACY_PAYMENT_METHOD_KEY_MAP[name] || [name];
      const source = keys.map((key) => raw?.[key]).find((entry) => entry && typeof entry === "object");
      if (!source) return;
      defaults[name] = toBool(source?.status, defaults[name]);
    });
  }

  return defaults;
};

const PaymentOptions = ({ values, setFieldValue, onStripeReady, cartTotal }) => {
  const { t } = useTranslation("common");
  const { settingData } = useSettings();
  const axios = useAxios();
  const [initial, setInitial] = useState(0);

  const paymentMethodStatus = useMemo(
    () => normalizePaymentMethodStatusMap(settingData?.payment_methods),
    [settingData?.payment_methods]
  );

  // Fetch BNPL gateways from API
  const { data: bnplGateways, isLoading: loadingGateways } = useFetchQuery(
    ["bnpl-gateways", cartTotal],
    async () => {
      const response = await axios.get("/payment/gateways", {
        params: { amount: cartTotal || 0 },
      });
      return response?.data?.data ?? [];
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
      enabled: true,
    }
  );

  // Filter standard payment options based on settings and translate labels
  const standardPaymentOptions = useMemo(
    () =>
      SUPPORTED_PAYMENT_OPTIONS.filter((option) => {
        // Skip BNPL options as they come from API
        if (BNPL_PAYMENT_METHODS.includes(option.name)) return false;
        return paymentMethodStatus[option.name] !== false;
      }).map((option) => ({
        ...option,
        label: t(option.labelKey),
      })),
    [paymentMethodStatus, t]
  );

  // Combine standard options with BNPL gateways
  const allPaymentOptions = useMemo(() => {
    const options = [...standardPaymentOptions];

    // Add eligible BNPL gateways
    if (bnplGateways && Array.isArray(bnplGateways)) {
      bnplGateways.forEach((gateway) => {
        if (gateway.is_eligible && paymentMethodStatus[gateway.name] !== false) {
          options.push({
            name: gateway.name,
            label: gateway.display_name,
            description: gateway.message,
            logo: gateway.logo,
            installments: gateway.installments_count,
            installmentAmount: gateway.installment_amount,
            isBnpl: true,
          });
        }
      });
    }

    return options;
  }, [standardPaymentOptions, bnplGateways, paymentMethodStatus]);

  // Set default payment method
  useEffect(() => {
    if (allPaymentOptions.length) {
      setFieldValue("payment_method", allPaymentOptions[0].name);
      setInitial(0);
    }
  }, [allPaymentOptions, setFieldValue]);

  return (
    <CheckoutCard icon={<RiBankCardLine />}>
      <div className="checkout-title">
        <h4>{t("PaymentOption")}</h4>
      </div>
      <div className="checkout-detail">
        {loadingGateways && (
          <div className="text-center py-2">
            <Spinner size="sm" /> {t("LoadingPaymentOptions")}...
          </div>
        )}
        <Row className="g-sm-4 g-3">
          {allPaymentOptions.length > 0 &&
            allPaymentOptions.map((elem, i) => (
              <Col xxl={6} key={elem.name}>
                <div className="payment-option">
                  <div className="payment-category w-100">
                    <div className="form-check custom-form-check hide-check-box w-100">
                      <Input
                        className="form-check-input"
                        id={`payment-${elem.name}`}
                        checked={i === initial}
                        type="radio"
                        name="payment_method"
                        onChange={() => {
                          setFieldValue("payment_method", elem.name);
                          setFieldValue("is_bnpl_payment", elem.isBnpl || false);
                          setInitial(i);
                        }}
                      />
                      <Label
                        className="form-check-label d-flex flex-column"
                        htmlFor={`payment-${elem.name}`}
                      >
                        <div className="d-flex align-items-center gap-2">
                          {elem.logo && (
                            <Image
                              src={elem.logo}
                              alt={elem.label}
                              width={60}
                              height={20}
                              style={{ objectFit: "contain" }}
                              unoptimized
                            />
                          )}
                          <span>{elem.label}</span>
                        </div>
                        {elem.isBnpl && elem.description && (
                          <small className="text-muted mt-1">
                            {elem.description}
                          </small>
                        )}
                      </Label>
                    </div>
                  </div>
                </div>
              </Col>
            ))}
        </Row>

        {/* Show ineligible BNPL options with message */}
        {bnplGateways &&
          bnplGateways.some(
            (gw) => !gw.is_eligible && paymentMethodStatus[gw.name] !== false
          ) && (
          <div className="mt-3 pt-3 border-top">
            <small className="text-muted">{t("UnavailablePaymentOptions")}:</small>
            <Row className="g-2 mt-1">
              {bnplGateways
                .filter(
                  (gw) => !gw.is_eligible && paymentMethodStatus[gw.name] !== false
                )
                .map((gateway) => (
                  <Col xs="12" key={gateway.name}>
                    <div className="d-flex align-items-center gap-2 text-muted">
                      {gateway.logo && (
                        <Image
                          src={gateway.logo}
                          alt={gateway.display_name}
                          width={40}
                          height={15}
                          style={{ objectFit: "contain", opacity: 0.5 }}
                          unoptimized
                        />
                      )}
                      <small>
                        {gateway.display_name}: {gateway.message}
                      </small>
                    </div>
                  </Col>
                ))}
            </Row>
          </div>
        )}
      </div>

      {/* Stripe payment form for card payments */}
      {STRIPE_PAYMENT_METHODS.includes(values?.payment_method) && (
        <StripePaymentForm
          active={true}
          values={values}
          setFieldValue={setFieldValue}
          onReady={onStripeReady}
          paymentMethod={values?.payment_method}
        />
      )}
    </CheckoutCard>
  );
};

const SUPPORTED_PAYMENT_OPTIONS = [
  { name: "cod", labelKey: "CashOnDelivery" },
  { name: "stripe_card", labelKey: "CreditDebitCards" },
  { name: "apple_pay", labelKey: "ApplePay" },
  { name: "google_pay", labelKey: "GooglePay" },
];

export default PaymentOptions;
