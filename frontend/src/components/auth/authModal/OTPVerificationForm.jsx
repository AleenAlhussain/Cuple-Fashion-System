import Btn from "@/elements/buttons/Btn";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useAuthState, useCartState, useWishlistState } from "@/states";
import { Href, LoginPhnAPI, VerifyTokenAPI } from "@/utils/constants";
import { obscureEmail } from "@/utils/customFunctions/EmailFormats";
import { Form, Formik } from "formik";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "reactstrap";
import { YupObject } from "@/utils/validation/ValidationSchema";
import * as Yup from "yup";
import useAxios from "@/utils/api/helpers/useAxios";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;

const normalizeOtpDigits = (value = "") =>
  value
    .toString()
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit).toString())
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit).toString())
    .replace(/\D+/g, "")
    .slice(0, OTP_LENGTH);

const getInitialRetryAfter = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  const sentAt = Number(Cookies.get("upts") || 0);
  if (!sentAt) {
    return 0;
  }

  const elapsedSeconds = Math.floor((Date.now() - sentAt) / 1000);
  return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsedSeconds);
};

const OTPVerificationForm = ({ setState }) => {
  const mobileNumber = Cookies.get("up");
  const countryCode = Cookies.get("uc");
  const email = Cookies.get("ue");
  const isPhoneFlow = Boolean(mobileNumber && !email);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState(() => (isPhoneFlow ? getInitialRetryAfter() : 0));
  const { t } = useTranslation("common");
  const axios = useAxios();
  const router = useRouter();
  const otpInputRef = useRef(null);
  const { setOpenAuthModal } = useContext(ThemeOptionContext);
  const { login } = useAuthState();
  const { initCart } = useCartState();
  const { initWishlist } = useWishlistState();

  useEffect(() => {
    if (!retryAfter) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRetryAfter((currentValue) => (currentValue > 0 ? currentValue - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retryAfter]);

  const validationSchema = isPhoneFlow
    ? YupObject({
        otp: Yup.string()
          .length(OTP_LENGTH, "OTP must be 6 digits")
          .required("OTP is required"),
      })
    : YupObject({
        otp: Yup.string()
          .length(OTP_LENGTH, "OTP must be 6 digits")
          .required("OTP is required"),
        password: Yup.string()
          .min(6, "Password must be at least 6 characters")
          .required("Password is required"),
        password_confirmation: Yup.string()
          .oneOf([Yup.ref("password"), null], "Passwords must match")
          .required("Please confirm your password"),
      });

  const handleSubmit = async (values, { resetForm }) => {
    setLoading(true);
    try {
      const normalizedOtp = normalizeOtpDigits(values.otp);
      const res = isPhoneFlow
        ? await axios.post(VerifyTokenAPI, {
            country_code: countryCode,
            phone: mobileNumber,
            otp: normalizedOtp,
          })
        : await axios.post("/reset-password", {
            token: normalizedOtp,
            email,
            password: values.password,
            password_confirmation: values.password_confirmation,
          });

      if (res?.status === 200 || res?.status === 201) {
        if (isPhoneFlow) {
          const payload = res?.data?.data || {};
          const accessToken = payload?.access_token || payload?.token;

          if (!accessToken) {
            throw new Error("Missing access token in login response.");
          }

          Cookies.set("uat", accessToken, { path: "/", expires: new Date(Date.now() + 24 * 60 * 60 * 1000) });

          if (typeof window !== "undefined") {
            Cookies.set("account", JSON.stringify(payload));
            localStorage.setItem("account", JSON.stringify(payload));
          }

          login({
            token: accessToken,
            user: payload?.user || payload,
            role: payload?.user?.role || payload?.role,
          });

          initCart();
          initWishlist();

          Cookies.remove("up");
          Cookies.remove("uc");
          Cookies.remove("ue");
          Cookies.remove("upts");
          Cookies.remove("showAuthToast");

          resetForm();
          setState("login");
          setOpenAuthModal(false);

          ToastNotification("success", res?.data?.message || "Login successful.");
          router.push(Cookies.get("CallBackUrl") || "/account/dashboard");
          return;
        }

        ToastNotification("success", res.data.message || "Password reset successful.");
        resetForm();
        setState("login");
        Cookies.remove("ue");
      }
    } catch (err) {
      ToastNotification(
        "error",
        err?.response?.data?.message ||
          (isPhoneFlow ? "Failed to verify WhatsApp OTP." : "Failed to reset password.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isPhoneFlow || resendLoading || retryAfter > 0) {
      return;
    }

    setResendLoading(true);

    try {
      const res = await axios.post(LoginPhnAPI, {
        country_code: countryCode,
        phone: mobileNumber,
      });

      const resendAfter = Number(res?.data?.data?.resend_after || RESEND_COOLDOWN_SECONDS);
      Cookies.set("upts", String(Date.now()));
      setRetryAfter(resendAfter);
      ToastNotification("success", res?.data?.message || "OTP sent via WhatsApp.");
    } catch (err) {
      const nextRetryAfter = Number(err?.response?.data?.errors?.retry_after || 0);

      if (nextRetryAfter > 0) {
        setRetryAfter(nextRetryAfter);
      }

      ToastNotification("error", err?.response?.data?.message || "Unable to resend WhatsApp code.");
    } finally {
      setResendLoading(false);
    }
  };

  const displayTarget = isPhoneFlow
    ? (() => {
        const cc = String(countryCode || "").replace(/\D+/g, "");
        const phone = String(mobileNumber || "").replace(/\D+/g, "");
        if (!phone) return "";
        if (cc && phone.startsWith(cc)) {
          return `+${phone}`;
        }
        return `${cc ? `+${cc} ` : ""}${phone}`.trim();
      })()
    : obscureEmail(email);

  return (
    <>
      <Formik
        initialValues={{
          otp: "",
          password: "",
          password_confirmation: "",
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched, values, handleChange, setFieldValue }) => (
          <Form className="auth-form-box">
            <div className="log-in-title">
              <h5>
                {t("CodeSend") + " "}
                <span>{displayTarget}</span>
              </h5>
            </div>
            <div className="auth-box mb-3 outer-otp">
              <div
                className="inner-otp"
                id="otp"
                onClick={() => otpInputRef.current?.focus()}
              >
                <Input
                  type="text"
                  className="otp-hidden-input"
                  maxLength={OTP_LENGTH}
                  name="otp"
                  value={values.otp}
                  inputMode="numeric"
                  autoComplete={isPhoneFlow ? "one-time-code" : "off"}
                  pattern="[0-9]*"
                  dir="ltr"
                  innerRef={otpInputRef}
                  onChange={(event) => setFieldValue("otp", normalizeOtpDigits(event.target.value))}
                />
                <div className="otp-slots" aria-hidden="true">
                  {Array.from({ length: OTP_LENGTH }, (_, index) => (
                    <span key={index} className="otp-slot">
                      {values.otp[index] || ""}
                    </span>
                  ))}
                </div>
              </div>
              {errors.otp && touched.otp && <div className="invalid-feedback d-block">{errors.otp}</div>}
            </div>
            {isPhoneFlow && (
              <div className="otp-resend-row">
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleResendCode}
                  disabled={resendLoading || retryAfter > 0}
                >
                  {resendLoading
                    ? t("PleaseWait")
                    : retryAfter > 0
                    ? t("ResendCodeIn", { seconds: retryAfter })
                    : t("ResendCode")}
                </button>
              </div>
            )}
            {!isPhoneFlow && (
              <>
                <div className="auth-box mb-3">
                  <label htmlFor="password">{t("Password")}</label>
                  <Input
                    type="password"
                    name="password"
                    className="form-control"
                    id="password"
                    placeholder={t("EnterYourPassword")}
                    value={values.password}
                    onChange={handleChange}
                  />
                  {errors.password && touched.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                </div>
                <div className="auth-box mb-3">
                  <label htmlFor="password_confirmation">{t("ConfirmPassword")}</label>
                  <Input
                    type="password"
                    name="password_confirmation"
                    className="form-control"
                    id="password_confirmation"
                    placeholder={t("ConfirmYourPassword")}
                    value={values.password_confirmation}
                    onChange={handleChange}
                  />
                  {errors.password_confirmation && touched.password_confirmation && (
                    <div className="invalid-feedback d-block">{errors.password_confirmation}</div>
                  )}
                </div>
              </>
            )}
            <Btn loading={loading} type="submit" title={isPhoneFlow ? t("Verify") : "Verify"} />
            <a onClick={() => setState(isPhoneFlow ? "number" : "forgot")} href={Href} className="modal-back">
              <i className="ri-arrow-left-line"></i>
            </a>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default OTPVerificationForm;
