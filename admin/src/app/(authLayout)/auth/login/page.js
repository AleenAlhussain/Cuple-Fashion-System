"use client";
import { ReactstrapInput } from "@/components/reactstrapFormik";
import ShowBox from "@/elements/alerts&Modals/ShowBox";
import Btn from "@/elements/buttons/Btn";
import SettingContext from "@/helper/settingContext";
import LoginBoxWrapper from "@/utils/hoc/LoginBoxWrapper";
import request from "@/utils/axiosUtils";
import { login } from "@/utils/axiosUtils/API";
import { YupObject, emailSchema, nameSchema } from "@/utils/validation/ValidationSchemas";
import { ErrorMessage, Field, Form, Formik } from "formik";
import Image from "next/image";
import Link from "next/link";
import { useContext, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useTranslation } from "react-i18next";
import { Col } from "reactstrap";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { isOrdersOnlyAdminRole } from "@/utils/customFunctions/adminRoles";

const Login = () => {
  const [showBoxMessage, setShowBoxMessage] = useState();
  const { settingObj, state } = useContext(SettingContext);
  const { t } = useTranslation("common");
  const reCaptchaRef = useRef();
  const router = useRouter();
  const handleLogin = async (values, { setSubmitting }) => {
    setShowBoxMessage(undefined);
    try {
      Cookies.remove("uat", { path: "/" });
      Cookies.remove("ue", { path: "/" });
      localStorage.removeItem("uat");
      localStorage.removeItem("account");
      localStorage.removeItem("role");
      if (typeof window !== "undefined") {
        window.__accountData = null;
      }

      const response = await request(
        {
          url: login,
          method: "POST",
          data: values,
        },
        router
      );
      const payload = response?.data?.data || {};
      const token = payload?.access_token || payload?.token;
      const user = payload?.user;

      if (!token || !user) {
        throw new Error("ThereWasAProblem");
      }

      Cookies.set("uat", token, { path: "/" });
      localStorage.setItem("uat", token);

      const normalizedUser = {
        ...user,
        role: user?.role ? { name: user.role } : user?.role,
      };
      localStorage.setItem("account", JSON.stringify(normalizedUser));
      localStorage.setItem("role", JSON.stringify(normalizedUser.role));
      if (typeof window !== "undefined") {
        window.__accountData = normalizedUser;
        window.location.replace(isOrdersOnlyAdminRole(user?.role) ? `/order` : `/dashboard`);
        return;
      }

      router.push(isOrdersOnlyAdminRole(user?.role) ? `/order` : `/dashboard`);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "ThereWasAProblem";
      setShowBoxMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="box-wrapper">
      <ShowBox showBoxMessage={showBoxMessage} />
      <LoginBoxWrapper>
        <div className="log-in-title text-center">
          <Image className="for-white" src={state?.setDarkLogo?.original_url ? state?.setDarkLogo?.original_url : "/assets/images/settings/logo-dark.png"} alt="Light Logo" width={140} height={28} priority />
          <h4>{t("LogInYourAccount")}</h4>
        </div>
        <div className="input-box">
          <Formik
            initialValues={{
              email: "admin@cuple.shop",
              password: "",
            }}
            validationSchema={YupObject({
              email: emailSchema,
              password: nameSchema,
              // recaptcha: settingObj?.google_reCaptcha?.status ? recaptchaSchema : "",
            })}
            onSubmit={handleLogin}
          >
            {({ errors, touched, setFieldValue }) => (
              <Form className="row g-4">
                <Col sm="12">
                  <Field inputprops={{ noExtraSpace: true }} autoComplete={true} name="email" type="email" component={ReactstrapInput} className="form-control" id="email" placeholder="Email Address" label="EmailAddress" />
                </Col>
                <Col sm="12">
                  <Field inputprops={{ noExtraSpace: true }} name="password" component={ReactstrapInput} type="password" className="form-control" id="password" placeholder="Password" label="Password" />
                </Col>
                {settingObj?.google_reCaptcha?.status && (
                  <Col sm="12">
                    <ReCAPTCHA
                      ref={reCaptchaRef}
                      sitekey={settingObj?.google_reCaptcha?.site_key}
                      onChange={(value) => {
                        setFieldValue("recaptcha", value);
                      }}
                    />
                    {errors.recaptcha && touched.recaptcha && <ErrorMessage name="recaptcha" render={(msg) => <div className="invalid-feedback d-block">{errors.recaptcha}</div>} />}
                  </Col>
                )}
                <Col sm="12">
                  <div className="forgot-box">
                    <Link href={`/auth/forgot-password`} className="forgot-password">
                      {t("ForgotPassword")}?
                    </Link>
                  </div>
                </Col>
                <Col sm="12">
                  <Btn title="Login" className="btn btn-animation w-100 justify-content-center" type="submit" color="false" />
                </Col>
              </Form>
            )}
          </Formik>
        </div>
      </LoginBoxWrapper>
    </div>
  );
};

export default Login;
