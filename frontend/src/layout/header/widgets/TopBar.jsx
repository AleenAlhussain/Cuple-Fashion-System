import ThemeOptionContext from "@/context/themeOptionsContext";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Col, Row } from "reactstrap";
import HeaderCurrency from "./HeaderCurrency";
import HeaderLanguage from "./HeaderLanguage";

const TopBar = ({ classes }) => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { i18n } = useTranslation("common");

  const isArabic = String(i18n?.language || "").toLowerCase().startsWith("ar");
  const promoTextEn = String(themeOption?.general?.topbar_promo_text || "").trim();
  const promoTextAr = String(themeOption?.general?.topbar_promo_text_ar || "").trim();
  const hasBothPromoTexts = Boolean(promoTextEn && promoTextAr);
  const promoText = hasBothPromoTexts ? (isArabic ? promoTextAr : promoTextEn) : "";

  return (
    <div className={`top-header ${classes?.top_bar_class ?? ""}`}>
      <div className={`${classes?.container_class ?? "container"}`}>
        <Row className="align-items-center">
          <Col xs={12} lg={6} className="text-center my-1 my-lg-0">
            {promoText ? (
              <p className="m-0 fw-500 topbar-promo" style={{ color: "#fff" }}>
                {promoText}
              </p>
            ) : null}
          </Col>

          <Col xs={12} lg={3} className="text-end mt-2 mt-lg-0">
            <ul className="right-nav-about list-unstyled d-inline-flex align-items-center gap-3 m-0">
              <li className="right-nav-list">
                <HeaderLanguage />
              </li>
              <li className="right-nav-list">
                <HeaderCurrency />
              </li>
            </ul>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default TopBar;
