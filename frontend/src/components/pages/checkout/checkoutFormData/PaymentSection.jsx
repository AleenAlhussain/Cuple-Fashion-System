import { Col, Input, Label, Row, Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import StripePaymentForm, { STRIPE_PAYMENT_METHODS } from "../StripePaymentForm";
import useAxios from "@/utils/api/helpers/useAxios";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";
import Image from "next/image";

const STANDARD_PAYMENT_OPTIONS = [
  { value: "cod", labelKey: "CashOnDelivery" },
  { value: "stripe_card", labelKey: "CreditDebitCards" },
  { value: "apple_pay", labelKey: "ApplePay" },
  { value: "google_pay", labelKey: "GooglePay" },
];

// BNPL payment methods
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

const PaymentSection = ({ values, setFieldValue, setStripeConfirmHandler }) => {
  const { t } = useTranslation("common");
  const { settingData } = useSettings();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isStripeMethod = STRIPE_PAYMENT_METHODS.includes(values?.payment_method);
  const axios = useAxios();
  const cartTotal = useCartState((state) => state.cartTotal);

  const paymentMethodStatus = useMemo(
    () => normalizePaymentMethodStatusMap(settingData?.payment_methods),
    [settingData?.payment_methods]
  );

  // Fetch BNPL gateways from API
  const { data: bnplGateways, isLoading: loadingGateways } = useFetchQuery(
    ["bnpl-gateways-guest", cartTotal],
    async () => {
      const response = await axios.get("/payment/gateways", {
        params: { amount: cartTotal || 0 },
      });
      return response?.data?.data ?? [];
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      enabled: true,
    }
  );

  // Combine standard options with BNPL gateways
  const allPaymentOptions = useMemo(() => {
    const options = STANDARD_PAYMENT_OPTIONS.filter(
      (option) => paymentMethodStatus[option.value] !== false
    ).map((option) => ({
      ...option,
      label: t(option.labelKey),
    }));

    // Add eligible BNPL gateways
    if (bnplGateways && Array.isArray(bnplGateways)) {
      bnplGateways.forEach((gateway) => {
        if (gateway.is_eligible && paymentMethodStatus[gateway.name] !== false) {
          options.push({
            value: gateway.name,
            label: gateway.display_name,
            description: gateway.message,
            logo: gateway.logo,
            isBnpl: true,
          });
        }
      });
    }

    return options;
  }, [bnplGateways, paymentMethodStatus, t]);

  useEffect(() => {
    if (allPaymentOptions.length > 0) {
      setFieldValue("payment_method", allPaymentOptions[0].value);
      setSelectedIndex(0);
    }
  }, [allPaymentOptions, setFieldValue]);

  const handleChange = (option, index) => {
    setFieldValue("payment_method", option.value);
    setFieldValue("is_bnpl_payment", option.isBnpl || false);
    setSelectedIndex(index);
  };

  return (
    <div className="checkbox-main-box">
      <div className="checkout-title1">
        <h2>{t("PaymentDetails")}</h2>
      </div>
      {loadingGateways && (
        <div className="text-center py-2">
          <Spinner size="sm" /> {t("LoadingPaymentOptions")}...
        </div>
      )}
      <Row className="g-sm-4 g-3">
        {allPaymentOptions.map((option, index) => (
          <Col xxl={6} key={option.value}>
            <div className="payment-option">
              <div className="payment-category w-100">
                <div className="form-check custom-form-check gap-0 hide-check-box w-100">
                  <Input
                    className="form-check-input"
                    id={option.value}
                    checked={selectedIndex === index}
                    type="radio"
                    name="payment_method"
                    onChange={() => handleChange(option, index)}
                  />
                  <Label
                    className="form-check-label d-flex flex-column"
                    htmlFor={option.value}
                  >
                    <div className="d-flex align-items-center gap-2">
                      {option.logo && (
                        <Image
                          src={option.logo}
                          alt={option.label}
                          width={60}
                          height={20}
                          style={{ objectFit: "contain" }}
                          unoptimized
                        />
                      )}
                      <span>{option.label}</span>
                    </div>
                    {option.isBnpl && option.description && (
                      <small className="text-muted mt-1">{option.description}</small>
                    )}
                  </Label>
                </div>
              </div>
            </div>
          </Col>
        ))}

        {/* Show ineligible BNPL options with message */}
        {bnplGateways &&
          bnplGateways.some(
            (gw) => !gw.is_eligible && paymentMethodStatus[gw.name] !== false
          ) && (
          <Col xs="12">
            <div className="mt-2 pt-2 border-top">
              <small className="text-muted">{t("UnavailablePaymentOptions")}:</small>
              <div className="mt-1">
                {bnplGateways
                  .filter(
                    (gw) => !gw.is_eligible && paymentMethodStatus[gw.name] !== false
                  )
                  .map((gateway) => (
                    <div
                      key={gateway.name}
                      className="d-flex align-items-center gap-2 text-muted mb-1"
                    >
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
                  ))}
              </div>
            </div>
          </Col>
        )}

        {isStripeMethod && (
          <StripePaymentForm
            active={true}
            values={values}
            setFieldValue={setFieldValue}
            onReady={setStripeConfirmHandler}
            paymentMethod={values?.payment_method}
          />
        )}
      </Row>
    </div>
  );
};

export default PaymentSection;
