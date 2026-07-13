import { useEffect, useMemo } from "react";
import { useFormikContext } from "formik";
import { Col, FormGroup, Input, Label, Row } from "reactstrap";
import { useTranslation } from "react-i18next";
import PaymentGatewaysTab from "./PaymentGatewaysTab";

const SUPPORTED_PAYMENT_METHODS = [
  { name: "cod", labelKey: "CashOnDelivery" },
  { name: "stripe_card", labelKey: "CreditDebitCards" },
  { name: "apple_pay", labelKey: "ApplePay" },
  { name: "google_pay", labelKey: "GooglePay" },
  { name: "tabby", labelKey: "PayWithTabby" },
  { name: "tamara", labelKey: "PayWithTamara" },
];

const LEGACY_METHOD_KEY_MAP = {
  cod: ["cod"],
  stripe_card: ["stripe_card", "stripe"],
  apple_pay: ["apple_pay", "stripe"],
  google_pay: ["google_pay", "stripe"],
  tabby: ["tabby"],
  tamara: ["tamara"],
};

const BNPL_GATEWAYS = ["tabby", "tamara"];
const STRIPE_MODE_OPTIONS = ["test", "live"];

const normalizeStatus = (value, fallback = true) => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
};

const toStringValue = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized === "" ? fallback : normalized;
};

const normalizeStripeMode = (value, fallback = "live") => {
  const normalized = toStringValue(value, "").toLowerCase();
  return STRIPE_MODE_OPTIONS.includes(normalized) ? normalized : fallback;
};

const normalizeStripeSettings = (source = {}, fallback = {}) => {
  const fallbackMode = normalizeStripeMode(fallback?.mode, "live");
  const modeFromIsSandbox = source?.is_sandbox === false || source?.is_sandbox === "0" || source?.is_sandbox === 0
    ? "live"
    : source?.is_sandbox === true || source?.is_sandbox === "1" || source?.is_sandbox === 1
      ? "test"
      : fallbackMode;

  const mode = normalizeStripeMode(source?.mode ?? source?.stripe_mode, modeFromIsSandbox);
  const legacyPublishable = toStringValue(source?.publishable_key ?? source?.public_key, "");
  const legacySecret = toStringValue(source?.secret_key, "");

  return {
    mode,
    test_publishable_key: toStringValue(
      source?.test_publishable_key ?? source?.test_public_key,
      mode === "test" ? legacyPublishable : toStringValue(fallback?.test_publishable_key, "")
    ),
    test_secret_key: toStringValue(
      source?.test_secret_key ?? source?.test_private_key,
      mode === "test" ? legacySecret : toStringValue(fallback?.test_secret_key, "")
    ),
    live_publishable_key: toStringValue(
      source?.live_publishable_key ?? source?.live_public_key,
      mode === "live" ? legacyPublishable : toStringValue(fallback?.live_publishable_key, "")
    ),
    live_secret_key: toStringValue(
      source?.live_secret_key ?? source?.live_private_key,
      mode === "live" ? legacySecret : toStringValue(fallback?.live_secret_key, "")
    ),
  };
};

const normalizePaymentMethods = (raw, t) => {
  const defaults = SUPPORTED_PAYMENT_METHODS.map((method) => ({
    name: method.name,
    title: t(method.labelKey),
    status: true,
    ...(method.name === "stripe_card"
      ? {
          mode: "live",
          test_publishable_key: "",
          test_secret_key: "",
          live_publishable_key: "",
          live_secret_key: "",
        }
      : {}),
  }));

  const result = defaults.reduce((acc, method) => {
    acc[method.name] = { ...method };
    return acc;
  }, {});

  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      const name = item?.name;
      if (!name || !result[name]) return;

      result[name] = {
        ...result[name],
        title: item?.title || result[name].title,
        status: normalizeStatus(item?.status, result[name].status),
        ...(name === "stripe_card" ? normalizeStripeSettings(item, result[name]) : {}),
      };
    });

    return SUPPORTED_PAYMENT_METHODS.map((method) => result[method.name]);
  }

  if (raw && typeof raw === "object") {
    SUPPORTED_PAYMENT_METHODS.forEach((method) => {
      const keys = LEGACY_METHOD_KEY_MAP[method.name] || [method.name];
      const legacy = keys
        .map((key) => raw?.[key])
        .find((entry) => entry && typeof entry === "object");

      if (!legacy) return;

      result[method.name] = {
        ...result[method.name],
        title: legacy?.title || result[method.name].title,
        status: normalizeStatus(legacy?.status, result[method.name].status),
        ...(method.name === "stripe_card"
          ? normalizeStripeSettings(legacy, result[method.name])
          : {}),
      };
    });
  }

  return SUPPORTED_PAYMENT_METHODS.map((method) => result[method.name]);
};

const signature = (value) => {
  if (!Array.isArray(value)) return "";

  return JSON.stringify(
    value
      .map((item) => ({
        name: item?.name || "",
        title: item?.title || "",
        status: normalizeStatus(item?.status, false),
        mode: item?.name === "stripe_card" ? normalizeStripeMode(item?.mode, "live") : undefined,
        test_publishable_key:
          item?.name === "stripe_card" ? toStringValue(item?.test_publishable_key, "") : undefined,
        test_secret_key:
          item?.name === "stripe_card" ? toStringValue(item?.test_secret_key, "") : undefined,
        live_publishable_key:
          item?.name === "stripe_card" ? toStringValue(item?.live_publishable_key, "") : undefined,
        live_secret_key:
          item?.name === "stripe_card" ? toStringValue(item?.live_secret_key, "") : undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
};

const PaymentMethodsTab = () => {
  const { t } = useTranslation("common");
  const { values, setFieldValue } = useFormikContext();

  const rawPaymentMethods = values?.values?.payment_methods;

  const normalizedMethods = useMemo(
    () => normalizePaymentMethods(rawPaymentMethods, t),
    [rawPaymentMethods, t]
  );

  useEffect(() => {
    if (signature(rawPaymentMethods) === signature(normalizedMethods)) return;
    setFieldValue("values.payment_methods", normalizedMethods, false);
  }, [rawPaymentMethods, normalizedMethods, setFieldValue]);

  const paymentMethods = Array.isArray(rawPaymentMethods)
    ? rawPaymentMethods
    : normalizedMethods;

  const codFee = values?.values?.general?.cod_fee ?? "0";

  const updatePaymentMethod = (name, updates) => {
    const nextMethods = paymentMethods.map((method) =>
      method.name === name
        ? {
            ...method,
            ...updates,
          }
        : method
    );

    setFieldValue("values.payment_methods", nextMethods);
  };

  return (
    <div className="inside-horizontal-tabs">
      <Row className="gy-3">
        <Col xs="12">
          <h6 className="mb-1">{t("CheckoutPaymentMethods")}</h6>
          <p className="text-muted mb-0 small">{t("CheckoutPaymentMethodsDesc")}</p>
        </Col>

        {paymentMethods.map((method) => (
          <Col xs="12" key={method.name}>
            <div className="border rounded p-3">
              <Row className="gy-2 align-items-end">
                <Col md="3">
                  <Label className="form-label mb-1">{t("MethodCode")}</Label>
                  <Input type="text" value={method.name} disabled />
                </Col>

                <Col md="6">
                  <Label className="form-label mb-1">{t("TitleLabel")}</Label>
                  <Input
                    type="text"
                    value={method?.title || ""}
                    onChange={(event) =>
                      updatePaymentMethod(method.name, { title: event.target.value })
                    }
                  />
                </Col>

                <Col md="3">
                  <FormGroup check className="d-flex align-items-center gap-2 mb-2">
                    <Input
                      type="checkbox"
                      checked={normalizeStatus(method?.status, false)}
                      onChange={(event) =>
                        updatePaymentMethod(method.name, { status: event.target.checked })
                      }
                    />
                    <Label check>{t("Enabled")}</Label>
                  </FormGroup>
                </Col>
              </Row>

              {method.name === "stripe_card" && (
                <Row className="gy-2 mt-2">
                  <Col xs="12">
                    <hr className="my-1" />
                    <h6 className="mb-1">{t("StripeConfiguration")}</h6>
                    <p className="text-muted small mb-2">{t("StripeConfigurationDesc")}</p>
                  </Col>

                  <Col md="3">
                    <Label className="form-label mb-1">{t("StripeMode")}</Label>
                    <Input
                      type="select"
                      value={normalizeStripeMode(method?.mode, "live")}
                      onChange={(event) =>
                        updatePaymentMethod(method.name, {
                          mode: normalizeStripeMode(event.target.value, "live"),
                        })
                      }
                    >
                      <option value="test">{t("TestMode")}</option>
                      <option value="live">{t("LiveMode")}</option>
                    </Input>
                  </Col>

                  <Col md="9">
                    <small className="text-muted d-block mt-4">{t("StripeKeyHint")}</small>
                  </Col>

                  <Col md="6">
                    <Label className="form-label mb-1">{t("TestPublishableKey")}</Label>
                    <Input
                      type="text"
                      value={toStringValue(method?.test_publishable_key, "")}
                      placeholder="pk_test_..."
                      onChange={(event) =>
                        updatePaymentMethod(method.name, {
                          test_publishable_key: event.target.value,
                        })
                      }
                    />
                  </Col>

                  <Col md="6">
                    <Label className="form-label mb-1">{t("TestSecretKey")}</Label>
                    <Input
                      type="password"
                      value={toStringValue(method?.test_secret_key, "")}
                      placeholder="sk_test_..."
                      onChange={(event) =>
                        updatePaymentMethod(method.name, {
                          test_secret_key: event.target.value,
                        })
                      }
                    />
                  </Col>

                  <Col md="6">
                    <Label className="form-label mb-1">{t("LivePublishableKey")}</Label>
                    <Input
                      type="text"
                      value={toStringValue(method?.live_publishable_key, "")}
                      placeholder="pk_live_..."
                      onChange={(event) =>
                        updatePaymentMethod(method.name, {
                          live_publishable_key: event.target.value,
                        })
                      }
                    />
                  </Col>

                  <Col md="6">
                    <Label className="form-label mb-1">{t("LiveSecretKey")}</Label>
                    <Input
                      type="password"
                      value={toStringValue(method?.live_secret_key, "")}
                      placeholder="sk_live_..."
                      onChange={(event) =>
                        updatePaymentMethod(method.name, {
                          live_secret_key: event.target.value,
                        })
                      }
                    />
                  </Col>
                </Row>
              )}
            </div>
          </Col>
        ))}

        <Col xs="12">
          <div className="border rounded p-3">
            <Label className="form-label mb-1">{t("CashOnDeliveryFee")}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={codFee}
              onChange={(event) => setFieldValue("values.general.cod_fee", event.target.value)}
            />
            <small className="text-muted d-block mt-1">{t("CashOnDeliveryFeeHint")}</small>
          </div>
        </Col>
      </Row>

      <div className="mt-4">
        <h6 className="mb-1">{t("BnplGatewaySettings")}</h6>
        <p className="text-muted mb-3 small">{t("BnplGatewaySettingsDesc")}</p>
        <PaymentGatewaysTab
          gatewayNames={BNPL_GATEWAYS}
          showIntro={false}
          allowStatusEdit={false}
        />
      </div>
    </div>
  );
};

export default PaymentMethodsTab;
