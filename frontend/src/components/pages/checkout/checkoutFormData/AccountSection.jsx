import SimpleInputField from "@/components/widgets/inputFields/SimpleInputField";
import SearchableSelectInput from "@/components/widgets/inputFields/SearchableSelectInput";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { AllCountryCode } from "@/data/CountryCode";
import useAxios from "@/utils/api/helpers/useAxios";
import React, { useEffect, useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Col, Input, Label, Row } from "reactstrap";

const AccountSection = ({ values, setFieldValue, emailExists, setEmailExists, checkingEmail, setCheckingEmail }) => {
  const { t } = useTranslation("common");
  const axios = useAxios();
  const { setOpenAuthModal } = useContext(ThemeOptionContext);
  const lastCheckedEmail = useRef("");

  // Check email when it changes (with debounce)
  useEffect(() => {
    const email = values.email;

    // Skip if email is same as last checked or invalid
    if (!email || !email.includes("@") || email === lastCheckedEmail.current) {
      if (!email || !email.includes("@")) {
        setEmailExists(false);
      }
      return;
    }

    setCheckingEmail(true);

    const timer = setTimeout(async () => {
      try {
        lastCheckedEmail.current = email;
        const response = await axios.post("/check-email", { email });
        // Only update if email hasn't changed during the request
        // Backend wraps response: { success: true, data: { exists: true/false } }
        if (values.email === email) {
          setEmailExists(response?.data?.data?.exists || false);
        }
      } catch (error) {
        if (values.email === email) {
          setEmailExists(false);
        }
      } finally {
        if (values.email === email) {
          setCheckingEmail(false);
        }
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      setCheckingEmail(false);
    };
  }, [values.email]);

  // Auto-uncheck create_account when email exists
  useEffect(() => {
    if (emailExists && values.create_account) {
      setFieldValue("create_account", false);
      setFieldValue("password", "");
      setFieldValue("password_confirmation", "");
    }
  }, [emailExists]);

  const handleLoginClick = () => {
    setOpenAuthModal(true);
  };

  return (
    <div className="checkbox-main-box">
      <div className="checkout-title1">
        <h2>{t("AccountDetails")}</h2>
      </div>
      <Row className="checkout-form g-md-4 g-sm-3 g-2">
        <SimpleInputField
          nameList={[
            { name: "name", placeholder: t("EnterFullName"), toplabel: "Full Name", colprops: { md: 6 }, require: "true" },
          ]}
        />
        <Col md={6}>
          <div className="country-input position-relative phone-field">
            <SimpleInputField
              nameList={[
                { name: "phone", type: "tel", placeholder: t("EnterPhoneNumber"), require: "true", toplabel: "Phone", colclass: "country-input-box", maxLength: 15 }
              ]}
            />
            <SearchableSelectInput
              nameList={[
                {
                  name: "country_code",
                  notitle: "true",
                  inputprops: {
                    name: "country_code",
                    id: "country_code",
                    options: AllCountryCode,
                  },
                },
              ]}
            />
          </div>
        </Col>
        <Col xs={12}>
          <SimpleInputField
            nameList={[
              { name: "email", placeholder: t("EnterEmailAddress"), toplabel: "Email", colprops: { xs: 12 }, require: "true" },
            ]}
          />
          {/* Show checking indicator */}
          {checkingEmail && (
            <div style={{ marginTop: "-10px", marginBottom: "10px" }}>
              <span className="text-muted small">
                <i className="ri-loader-4-line me-1" style={{ animation: "spin 1s linear infinite" }}></i>
                {t("Checking email...")}
              </span>
            </div>
          )}
          {/* Show error message under email field if email already exists */}
          {!checkingEmail && emailExists && (
            <div
              className="email-exists-error"
              style={{
                marginTop: "-5px",
                marginBottom: "15px",
                padding: "12px 15px",
                backgroundColor: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <i className="ri-error-warning-fill" style={{ color: "#856404", fontSize: "20px" }}></i>
              <div>
                <span style={{ color: "#856404", fontWeight: "500" }}>
                  {t("This email is already registered.")}
                </span>
                <br />
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleLoginClick(); }}
                  style={{
                    color: "#0d6efd",
                    fontWeight: "600",
                    textDecoration: "underline",
                    cursor: "pointer"
                  }}
                >
                  {t("Already have an account? Login")}
                </a>
              </div>
            </div>
          )}
        </Col>

        {/* Only show create account option if email doesn't exist and not checking */}
        {!emailExists && !checkingEmail && (
          <Col xs={12}>
            <div className="form-box form-checkbox">
              <Input
                className="checkbox_animated check-box"
                type="checkbox"
                name="create_account"
                onChange={(e) => {
                  setFieldValue("create_account", e.target.checked);
                }}
                checked={values.create_account}
              />
              <Label className="form-check-label" htmlFor="flexCheckDefault">
                {t("Create an account ?")}
              </Label>
            </div>
          </Col>
        )}

        {values.create_account === true && !emailExists && !checkingEmail && (
          <>
            <Col md={6}>
              <div className="form-box">
                <SimpleInputField nameList={[{ name: "password", placeholder: t("EnterPassword"), type: "password", toplabel: "Password", require: "true" }]} />
              </div>
            </Col>
            <Col md={6}>
              <div className="form-box">
                <SimpleInputField nameList={[{ name: "password_confirmation", placeholder: t("ConfirmPassword"), type: "password", toplabel: "Confirm Password", require: "true" }]} />
              </div>
            </Col>
          </>
        )}
      </Row>
    </div>
  );
};

export default AccountSection;
