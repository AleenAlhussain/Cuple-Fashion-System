import TabTitle from "@/components/widgets/TabTitle";
import { dateSubmitValue } from "@/utils/customFunctions/DateFormat";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Col, Row } from "reactstrap";
import { SettingTabTitleListData } from "../../data/TabTitleList";
import Btn from "../../elements/buttons/Btn";
import request from "../../utils/axiosUtils";
import { setting } from "../../utils/axiosUtils/API";
import { YupObject, emailSchema, nameSchema } from "../../utils/validation/ValidationSchemas";
import AllTabs from "./AllTabs";
import { checkPermission } from "../common/CheckPermissionList";

const safeJsonParse = (val) => {
  if (!val) return null;
  if (typeof val === "object") return val;
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
};

const PAYMENT_METHOD_DEFAULTS = [
  { name: "cod", title: "Cash On Delivery", status: true },
  {
    name: "stripe_card",
    title: "Credit/Debit Cards",
    status: true,
    mode: "live",
    test_publishable_key: "",
    test_secret_key: "",
    live_publishable_key: "",
    live_secret_key: "",
  },
  { name: "apple_pay", title: "Apple Pay", status: true },
  { name: "google_pay", title: "Google Pay", status: true },
  { name: "tabby", title: "Pay with Tabby", status: true },
  { name: "tamara", title: "Pay with Tamara", status: true },
];

const LEGACY_PAYMENT_KEY_MAP = {
  cod: ["cod"],
  stripe_card: ["stripe_card", "stripe"],
  apple_pay: ["apple_pay", "stripe"],
  google_pay: ["google_pay", "stripe"],
  tabby: ["tabby"],
  tamara: ["tamara"],
};

const parsePaymentStatus = (value, fallback = true) => {
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
  return normalized === "live" || normalized === "test" ? normalized : fallback;
};

const normalizeStripeSettings = (source = {}, fallback = {}) => {
  const fallbackMode = normalizeStripeMode(fallback?.mode, "live");
  const modeFromSandbox =
    source?.is_sandbox === false || source?.is_sandbox === "0" || source?.is_sandbox === 0
      ? "live"
      : source?.is_sandbox === true || source?.is_sandbox === "1" || source?.is_sandbox === 1
        ? "test"
        : fallbackMode;
  const mode = normalizeStripeMode(source?.mode ?? source?.stripe_mode, modeFromSandbox);
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

const normalizePaymentMethods = (raw) => {
  const result = PAYMENT_METHOD_DEFAULTS.reduce((acc, method) => {
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
        status: parsePaymentStatus(item?.status, result[name].status),
        ...(name === "stripe_card" ? normalizeStripeSettings(item, result[name]) : {}),
      };
    });

    return PAYMENT_METHOD_DEFAULTS.map((method) => result[method.name]);
  }

  if (raw && typeof raw === "object") {
    PAYMENT_METHOD_DEFAULTS.forEach((method) => {
      const keys = LEGACY_PAYMENT_KEY_MAP[method.name] || [method.name];
      const legacyValue = keys
        .map((key) => raw?.[key])
        .find((entry) => entry && typeof entry === "object");

      if (!legacyValue) return;

      result[method.name] = {
        ...result[method.name],
        title: legacyValue?.title || result[method.name].title,
        status: parsePaymentStatus(legacyValue?.status, result[method.name].status),
        ...(method.name === "stripe_card"
          ? normalizeStripeSettings(legacyValue, result[method.name])
          : {}),
      };
    });
  }

  return PAYMENT_METHOD_DEFAULTS.map((method) => result[method.name]);
};

const normalizeSettingsData = (settings) => {
  if (!settings) return {};

  const parsedValues = safeJsonParse(settings?.values) || {};
  const parsedOptions = safeJsonParse(settings?.options) || {};
  const normalizedPaymentMethods = normalizePaymentMethods(
    parsedValues?.payment_methods ?? settings?.payment_methods
  );

  return {
    ...settings,
    ...parsedValues,
    values: {
      ...parsedValues,
      payment_methods: normalizedPaymentMethods,
    },
    options: parsedOptions,
    payment_methods: normalizedPaymentMethods,
    general: {
      ...(parsedValues?.general || {}),
      ...(settings?.general || {}),
    },
    email: {
      ...(parsedValues?.email || {}),
      ...(settings?.email || {}),
    },
    maintenance: {
      ...(parsedValues?.maintenance || {}),
      ...(settings?.maintenance || {}),
    },
  };
};

const pickPersistedId = (selectedValue, existingValue) => {
  if (selectedValue !== null && selectedValue !== undefined && String(selectedValue).trim() !== "") {
    return selectedValue;
  }
  if (existingValue !== null && existingValue !== undefined && String(existingValue).trim() !== "") {
    return existingValue;
  }
  return "";
};

const SettingForm = ({ mutate, loading, title }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("1");
  const hasSettingPermission = useMemo(() => checkPermission("setting.index"), []);
  const { data, isLoading, refetch } = useCustomQuery([setting], () => request({ url: setting }, router), { enabled: false, refetchOnWindowFocus: false, select: (res) => res.data?.data });
  const [submitError, setSubmitError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  let IncludeList = ["status", "coupon_enable", "point_enable", "product_auto_approve", "stock_product_hide", "wallet_enable", "same_day_delivery", "is_category_based_commission", "multivendor", "sandbox_mode", "store_auto_approve", "maintenance_mode"];
  const RecursiveSet = ({ data }) => {
    if (data && typeof data == "object") {
      Object.keys(data).forEach((key) => {
        if (data[key] == 0 && IncludeList.includes(key)) {
          data[key] = false;
        } else if (data[key] == 1 && IncludeList.includes(key)) {
          data[key] = true;
        } else {
          RecursiveSet({ data: data[key] });
        }
      });
    }
  };
  useEffect(() => {
    if (!hasSettingPermission) return;
    refetch();
  }, [hasSettingPermission, refetch]);

  const normalizedSettings = useMemo(() => normalizeSettingsData(data), [data]);
  let NewSettingsData = normalizedSettings || {};
  RecursiveSet({ data: NewSettingsData });
  if (isLoading && !data) return null;
  if (!hasSettingPermission) {
    return (
      <Col>
        <Card>
          <div className="title-header option-title">
            <h5>{t(title)}</h5>
          </div>
          <div className="p-4 text-center">
            <div className="fw-semibold text-danger fs-4 mb-2">
              Permission Required
            </div>
            <div className="text-muted small fs-6">
              This section is available to administrators only.
            </div>
          </div>
        </Card>
      </Col>
    );
  }

  const validationSchema = YupObject({
    values: YupObject({
      general: YupObject({ site_title: nameSchema }),
    }),
  });
  return (
    <Formik
      enableReinitialize={true}
      validationSchema={validationSchema}
      initialValues={{
        submitButtonClicked: false,
        email: "",
        start_date: NewSettingsData ? NewSettingsData?.start_date || new Date() : new Date(),
        end_date: NewSettingsData ? NewSettingsData?.end_date || new Date() : new Date(),
        media_disk: NewSettingsData?.media_configuration?.media_disk || "local",
        light_logo_image: safeJsonParse(NewSettingsData?.general?.light_logo_image || NewSettingsData?.light_logo_image) || "",
        light_logo_image_id: NewSettingsData?.general?.light_logo_image_id || "",
        dark_logo_image: safeJsonParse(NewSettingsData?.general?.dark_logo_image || NewSettingsData?.dark_logo_image) || "",
        dark_logo_image_id: NewSettingsData?.general?.dark_logo_image_id || "",
        tiny_logo_image: safeJsonParse(NewSettingsData?.general?.tiny_logo_image || NewSettingsData?.tiny_logo_image) || "",
        tiny_logo_image_id: NewSettingsData?.general?.tiny_logo_image_id || "",
        favicon_image: safeJsonParse(NewSettingsData?.general?.favicon_image || NewSettingsData?.favicon_image) || "",
        favicon_image_id: NewSettingsData?.general?.favicon_image_id || "",
        values: {
          ...NewSettingsData,
          general: {
            site_title: NewSettingsData?.general?.site_title || "Cuple Shop",
            ...(NewSettingsData?.general || {}),
          },
        },
        default_timezone: NewSettingsData?.general?.default_timezone,
        mail_mailer: NewSettingsData?.email?.mail_mailer || "smtp",
        maintenance_image: safeJsonParse(NewSettingsData?.maintenance?.maintenance_image || NewSettingsData?.maintenance_image) || "",
        maintenance_image_id: NewSettingsData?.maintenance?.maintenance_image_id || "",
        mail_encryption: NewSettingsData?.email?.mail_encryption || "",
      }}
      onSubmit={async (values, { setFieldValue }) => {
        setSubmitError("");
        setSubmitStatus("");
        values["_method"] = "put";
        const payloadValues = values["values"] || {};
        payloadValues["maintenance"] = payloadValues["maintenance"] || {};
        payloadValues["email"] = payloadValues["email"] || {};
        payloadValues["general"] = payloadValues["general"] || {};

        payloadValues["maintenance"]["start_date"] = dateSubmitValue(values["start_date"]);
        payloadValues["maintenance"]["end_date"] = dateSubmitValue(values["end_date"]);
        payloadValues["general"]["default_timezone"] = values["default_timezone"];
        payloadValues["email"]["mail_mailer"] = values["mail_mailer"];
        payloadValues["email"]["mail_encryption"] = values["mail_encryption"];
        payloadValues["general"]["light_logo_image_id"] = pickPersistedId(values["light_logo_image_id"], payloadValues["general"]["light_logo_image_id"]);
        payloadValues["general"]["favicon_image_id"] = pickPersistedId(values["favicon_image_id"], payloadValues["general"]["favicon_image_id"]);
        payloadValues["general"]["dark_logo_image_id"] = pickPersistedId(values["dark_logo_image_id"], payloadValues["general"]["dark_logo_image_id"]);
        payloadValues["general"]["tiny_logo_image_id"] = pickPersistedId(values["tiny_logo_image_id"], payloadValues["general"]["tiny_logo_image_id"]);
        payloadValues["maintenance"]["maintenance_image_id"] = pickPersistedId(values["maintenance_image_id"], payloadValues["maintenance"]["maintenance_image_id"]);
        values["values"] = payloadValues;

        mutate(values, {
          onSuccess: (res) => {
            refetch && refetch();
            setSubmitStatus("تم حفظ التغييرات بنجاح");
          },
          onError: (error) => {
            console.error("Settings update error", error);
            setSubmitError(error?.response?.data?.message || error?.message || "حصل خطأ أثناء الحفظ");
          },
        });

        const walletPoints = payloadValues?.wallet_points || {};
        const pointsPayload = {
          signup_points: Number(walletPoints.signup_points || 0),
          reward_per_order_amount: Number(walletPoints.reward_per_order_amount || 0),
          currency_ratio: Number(walletPoints.currency_ratio || 0),
          max_redeem_percent: Number(walletPoints.max_redeem_percent || 0),
        };

        try {
          const pointsRes = await request({
            url: `${setting}/points`,
            method: "put",
            data: pointsPayload,
          }, router);
          const data = pointsRes?.data?.data || pointsPayload;
          setFieldValue("values.wallet_points.signup_points", data.signup_points ?? pointsPayload.signup_points);
          setFieldValue("values.wallet_points.reward_per_order_amount", data.reward_per_order_amount ?? pointsPayload.reward_per_order_amount);
          setFieldValue("values.wallet_points.currency_ratio", data.currency_ratio ?? pointsPayload.currency_ratio);
          setFieldValue("values.wallet_points.max_redeem_percent", data.max_redeem_percent ?? pointsPayload.max_redeem_percent);
        } catch (error) {
          console.error("Points settings update error", error);
        }

      }}
    >
      {({ values, errors, touched, setFieldValue }) => (
        <Col>
          <Card>
            <div className="title-header option-title">
              <h5>{t(title)}</h5>
            </div>
            <Form className="theme-form theme-form-2 mega-form vertical-tabs">
              <Row>
                <Col xl="3" lg="4">
                  <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={SettingTabTitleListData} errors={errors} touched={touched} />
                </Col>
                <AllTabs values={values} activeTab={activeTab} setFieldValue={setFieldValue} errors={errors} touched={touched} />
                <div className="ms-auto justify-content-end dflex-wgap mt-4 save-back-button">
                  {/* <Btn className="me-2 btn-outline btn-lg" title="Back" onClick={() => router.back()} /> */}
                  <Btn
                    className="btn-primary btn-lg"
                    type="button"
                    title="Save"
                    onClick={() => document.querySelector("form.theme-form")?.requestSubmit()}
                    loading={Number(loading)} />
                </div>
                {submitError && <p className="text-danger mt-2 small">{submitError}</p>}
                {submitStatus && <p className="text-success mt-2 small">{submitStatus}</p>}
              </Row>
            </Form>
          </Card>
        </Col>
      )}
    </Formik>
  );
};

export default SettingForm;
