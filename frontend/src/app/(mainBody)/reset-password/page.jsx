"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Container, Row, Col, FormGroup, Alert } from "reactstrap";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Btn from "@/elements/buttons/Btn";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import useAxios from "@/utils/api/helpers/useAxios";

const ResetPasswordPage = () => {
  const { t } = useTranslation("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const axios = useAxios();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validationSchema = Yup.object({
    password: Yup.string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
    password_confirmation: Yup.string()
      .oneOf([Yup.ref("password"), null], "Passwords must match")
      .required("Please confirm your password"),
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    setError("");

    try {
      await axios.post("/reset-password", {
        token,
        email,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <>
        <Breadcrumbs title={t("Home")} subTitle={t("ResetPassword")} />
        <section className="login-page section-t-space section-b-space">
          <Container>
            <Row className="justify-content-center">
              <Col lg="6">
                <div className="theme-card text-center">
                  <h3 className="text-danger">{t("InvalidResetLink")}</h3>
                  <p className="mt-3">
                    {t("PasswordResetLinkExpired")}
                  </p>
                  <Btn className="btn-solid mt-3" onClick={() => router.push("/auth/login")}>
                    {t("BackToLogin")}
                  </Btn>
                </div>
              </Col>
            </Row>
          </Container>
        </section>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Breadcrumbs title={t("Home")} subTitle={t("ResetPassword")} />
        <section className="login-page section-t-space section-b-space">
          <Container>
            <Row className="justify-content-center">
              <Col lg="6">
                <div className="theme-card text-center">
                  <h3 className="text-success">{t("PasswordResetSuccessful")}</h3>
                  <p className="mt-3">
                    {t("PasswordResetSuccessMessage")}
                  </p>
                  <Btn className="btn-solid mt-3" onClick={() => router.push("/auth/login")}>
                    {t("GoToLogin")}
                  </Btn>
                </div>
              </Col>
            </Row>
          </Container>
        </section>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs title="Home" subTitle="Reset Password" />
      <section className="login-page section-t-space section-b-space">
        <Container>
          <Row className="justify-content-center">
            <Col lg="6">
              <h3>{t("ResetPassword")}</h3>
              <div className="theme-card">
                <p className="mb-4">
                  {t("EnterNewPasswordFor")} <strong>{email}</strong>
                </p>

                {error && (
                  <Alert color="danger" className="mb-3">
                    {error}
                  </Alert>
                )}

                <Formik
                  initialValues={{
                    password: "",
                    password_confirmation: "",
                  }}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                >
                  {({ errors, touched }) => (
                    <Form className="theme-form">
                      <FormGroup>
                        <label htmlFor="password">{t("NewPassword") || "New Password"}</label>
                        <Field
                          name="password"
                          type="password"
                          className={`form-control ${errors.password && touched.password ? "is-invalid" : ""}`}
                          id="password"
                          placeholder={t("EnterNewPassword")}
                        />
                        <ErrorMessage name="password" component="div" className="invalid-feedback" />
                      </FormGroup>

                      <FormGroup>
                        <label htmlFor="password_confirmation">{t("ConfirmPassword") || "Confirm Password"}</label>
                        <Field
                          name="password_confirmation"
                          type="password"
                          className={`form-control ${errors.password_confirmation && touched.password_confirmation ? "is-invalid" : ""}`}
                          id="password_confirmation"
                          placeholder={t("ConfirmNewPassword")}
                        />
                        <ErrorMessage name="password_confirmation" component="div" className="invalid-feedback" />
                      </FormGroup>

                      <Btn type="submit" className="btn-solid" disabled={loading}>
                        {loading ? t("Resetting") : t("ResetPassword")}
                      </Btn>
                    </Form>
                  )}
                </Formik>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  );
};

export default ResetPasswordPage;
