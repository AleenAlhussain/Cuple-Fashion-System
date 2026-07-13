import SearchableSelectInput from "@/components/widgets/inputFields/SearchableSelectInput";
import { AllCountryCode } from "@/data/CountryCode";
import Btn from "@/elements/buttons/Btn";

import useCreate from "@/utils/hooks/useCreate";

const RegisterAPI = "/register";
import { YupObject, emailSchema, nameSchema, passwordConfirmationSchema, passwordSchema, phoneSchema } from "@/utils/validation/ValidationSchema";
import { ErrorMessage, Field, Form, Formik } from "formik";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

const termsSections = [
  {
    title: "1. Account Registration",
    content: [
      "You confirm that all information provided (name, email, phone number) is accurate and up to date.",
      "You are responsible for maintaining the confidentiality of your account credentials.",
    ],
  },
  {
    title: "2. Use of Services",
    content: [
      "Your account is for personal shopping use only.",
      "Any misuse, fraudulent activity, or violation of our policies may result in account suspension or termination.",
    ],
  },
  {
    title: "3. Privacy & Data Protection",
    content: [
      "Cuple collects personal data such as your name, email, phone number, and order history to:",
    ],
    list: ["Process orders and payments", "Provide customer support", "Improve our services and user experience"],
    postList:
      "Your data is securely stored and will never be sold or shared with third parties, except where required to fulfill orders (e.g., payment gateways, delivery partners).",
  },
  {
    title: "4. Marketing Communication",
    content: [
      "By creating an account, you may receive order-related notifications.",
      "Promotional messages will only be sent if you opt in, and you may unsubscribe at any time.",
    ],
  },
  {
    title: "5. Security",
    content: [
      "We use industry-standard security measures to protect your data.",
      "You are responsible for keeping your password secure.",
    ],
  },
  {
    title: "6. Policy Updates",
    content: [
      "Cuple reserves the right to update these Terms & Privacy Policy at any time.",
      "Continued use of your account implies acceptance of any updates.",
    ],
  },
];

const RegisterForm = () => {
  const [showBoxMessage, setShowBoxMessage] = useState();
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const { t } = useTranslation("common");
  const { mutate, isLoading } = useCreate(
    RegisterAPI,
    false,
    false,
    t("CheckYourEmailToVerifyYourAccount"),
    false,
    false,
    false,
    false,
    setShowBoxMessage
  );
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const toggleTermsModal = () => setIsTermsModalOpen((prev) => !prev);

  return (
    <Formik
      initialValues={{
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        country_code: "971",
        phone: "",
      }}
      validationSchema={YupObject({
        name: nameSchema,
        email: emailSchema,
        password: passwordSchema,
        password_confirmation: passwordConfirmationSchema,
        phone: phoneSchema,
      })}
      onSubmit={mutate}
    >
      {({ errors, touched, setFieldValue }) => (
        <Form className="auth-form-box">
          {showBoxMessage && (
            <div role="alert" className="alert alert-danger login-alert">
              <i className="ri-error-warning-line"></i> {typeof showBoxMessage === 'string' ? showBoxMessage : showBoxMessage?.response?.data?.message || showBoxMessage?.message || 'Registration failed'}
            </div>
          )}
          <div className="auth-box mb-3 form-box">
            <label htmlFor="email">{t("FullName")}</label>
            <Field className="form-control" name="name" type="text" id="fname" placeholder={t("FirstName")} required />
            {errors.name && touched.name && <ErrorMessage name="name" render={(msg) => <div className="invalid-feedback  d-block">{errors.name}</div>} />}
          </div>
          <div className="auth-box form-box mb-3">
            <label htmlFor="email">{t("Email")}</label>
            <Field className="form-control" name="email" type="text" id="email" placeholder={t("Email")} required />
            {errors.email && touched.email && <ErrorMessage name="email" render={(msg) => <div className="invalid-feedback d-block">{errors.email}</div>} />}
          </div>

          <div className="auth-box form-box mb-3 phone-field">
            <div className="form-box">
              <label htmlFor="phone">{t("Phone")}</label>
              <SearchableSelectInput nameList={[{ name: "country_code", notitle: "true", inputprops: { name: "country_code", id: "country_code", options: AllCountryCode, }, },]} />
              <Field className="form-control" name="phone" placeholder={t("EnterPhoneNumber")} type="tel" maxLength={15} />
              {errors.phone && touched?.phone && <ErrorMessage render={() => <div className="invalid-feedback">{errors.phone}</div>} />}
            </div>
          </div>

          <div className="auth-box form-box mb-3">
            <label htmlFor="review">{t("Password")}</label>
            <Field className="form-control" type="password" name="password" id="review" placeholder={t("EnterYourPassword")} required />
            {errors.password && touched.password && <ErrorMessage name="password" render={(msg) => <div className="invalid-feedback d-block">{errors.password}</div>} />}
          </div>
          <div className="mb-3">
            <div className="form-box">
              <label htmlFor="review">{t("ConfirmPassword")}</label>
              <Field className="form-control" name="password_confirmation" type="password" id="lname" placeholder={t("ConfirmYourPassword")} required />
              {errors.password_confirmation && touched.password_confirmation && <ErrorMessage name="password_confirmation" render={(msg) => <div className="invalid-feedback d-block">{errors.password_confirmation}</div>} />}
            </div>
          </div>
          <div className="auth-box form-box mb-3">
            <div className="forgot-box">
              <div className="form-check ps-0 m-0 custom-check-box">
                <Input
                  type="checkbox"
                  id="flexCheckDefault"
                  className="checkbox_animated check-box"
                  aria-label={t("IAgreeWithTermsAndPrivacy")}
                  aria-describedby="register-terms-link"
                  onChange={(e) => setCheckboxChecked(e.target.checked)}
                />
                <a
                  id="register-terms-link"
                  href="#terms"
                  className="form-check-label text-red mb-0"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleTermsModal();
                  }}
                >
                  {t("IAgreeWithTermsAndPrivacy")}
                </a>
              </div>
            </div>
          </div>

          <Btn loading={isLoading} type="submit" className={`btn ${Object.keys(errors).length === 0 && checkboxChecked ? "" : "disabled"}`}>
            {t("CreateAccount")}
          </Btn>

          <Modal centered size="lg" isOpen={isTermsModalOpen} toggle={toggleTermsModal} className="theme-modal-2 terms-modal">
            <ModalHeader toggle={toggleTermsModal} className="border-0">
              Terms & Privacy Policy - Cuple
            </ModalHeader>
            <ModalBody className="pt-0">
              <p className="mb-3">
                By creating an account with Cuple, you agree to the following terms and privacy practices:
              </p>
              {termsSections.map((section) => (
                <div className="mb-3" key={section.title}>
                  <h6 className="fw-bold mb-2">{section.title}</h6>
                  {section.content.map((paragraph, index) => (
                    <p className="mb-1" key={`${section.title}-${index}`}>
                      {paragraph}
                    </p>
                  ))}
                  {section.list && (
                    <ul className="ps-3 mb-1">
                      {section.list.map((item, listIndex) => (
                        <li key={`${section.title}-list-${listIndex}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {section.postList && <p className="mb-1">{section.postList}</p>}
                </div>
              ))}
              <p className="mt-4 mb-0">
                For any questions, please contact us at{" "}
                <a href="mailto:customerservice@ayzme.com">customerservice@ayzme.com</a>
              </p>
            </ModalBody>
            <ModalFooter className="border-0 pt-0 justify-content-center">
              <button type="button" className="btn btn-outline-secondary" onClick={toggleTermsModal}>
                Close
              </button>
            </ModalFooter>
          </Modal>
        </Form>
      )}
    </Formik>
  );
};

export default RegisterForm;
