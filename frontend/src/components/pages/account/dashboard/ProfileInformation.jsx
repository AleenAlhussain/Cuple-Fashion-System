import { useAuthState } from "@/states";
import { CapitalizeMultiple } from "@/utils/customFunctions/Capitalize";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Col, Row } from "reactstrap";
import EmailPassword from "./EmailPassword";

const ProfileInformation = () => {
  const { t } = useTranslation("common");
  const { accountData } = useAuthState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use consistent values for SSR to prevent hydration mismatch
  const displayName = mounted ? CapitalizeMultiple(accountData?.name) : '';
  const countryCode = mounted ? (accountData?.country_code || '') : '';
  const phone = mounted ? (accountData?.phone || '') : '';
  const primaryAddress = mounted ? (accountData?.addresses?.[0] || accountData?.address?.[0]) : null;

  return (
    <div className='box-account box-info'>
      <Row>
        <Col xs={12}>
          <div className='box-account box-info'>
            <div className='box-head'>
              <h4>{t("AccountInformation")}</h4>
            </div>
            <ul className='box-content'>
              <li>
                <h6>
                  {t("FullName")} : {displayName}
                </h6>
              </li>
              <li>
                <h6>
                  {t("Phone")} : +{countryCode} {phone}
                </h6>
              </li>
              {primaryAddress ? (
                <li>
                  <h6>
                    {t("Address")} : {primaryAddress?.street}
                    {primaryAddress?.city}, {primaryAddress?.state?.name}, {primaryAddress?.country?.name} {primaryAddress?.pincode}
                  </h6>
                </li>
              ) : null}
            </ul>
            <div className='box mt-3'>
              <div className='box-head'>
                <h4>{t("LoginDetails")}</h4>
              </div>
            </div>
            <EmailPassword />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ProfileInformation;
