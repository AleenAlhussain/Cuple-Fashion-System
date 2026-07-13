import ThemeOptionContext from "@/context/themeOptionsContext";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Col, Container, Row } from "reactstrap";
import FooterAbout from "../widgets/FooterAbout";
import FooterHelpCenter from "../widgets/FooterHelpCenter";
import FooterLogo from "../widgets/FooterLogo";
import FooterNewsLetter from "../widgets/FooterNewsLetter";
import FooterSocial from "../widgets/FooterSocial";
import FooterStoreInformation from "../widgets/FooterStoreInformation";
import FooterUsefulLinks from "../widgets/FooterUsefulLinks";
import SubFooter from "../widgets/SubFooter";

const FooterThree = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { t } = useTranslation("common");
  const [openClose, setOpenClose] = useState({
    helpCenter: false,
    categories: false,
    useFulLinks: false,
    storeInfo: false,
  });
  const toggle = (toggleKey) => {
    setOpenClose((prevState) => ({
      ...prevState,
      [toggleKey]: !prevState[toggleKey],
    }));
  };

  return (
    <footer className="footer-style-1" style={{ backgroundColor: themeOption?.footer?.bg_color }}>
      <section className="section-b-space darken-layout section-t-space">
        <Container>
          <Row className="footer-theme g-md-5 g-2">
            <Col xl="3" lg="5" md="6" className="sub-title">
              <div>
                <FooterLogo />
                <FooterAbout />
                <FooterStoreInformation icon={true} />
              </div>
            </Col>
            <Col lg="2" md="3" onClick={() => toggle("useFulLinks")}>
              <div className="sub-title">
                <div className={`footer-title ${openClose?.useFulLinks ? "show" : ""}`}>
                  <h4>{t("UsefulLinks")}</h4>
                </div>
                <FooterUsefulLinks />
              </div>
            </Col>
            <Col xl="2" md="3" onClick={() => toggle("helpCenter")}>
              <div className="sub-title">
                <div className={`footer-title ${openClose?.helpCenter ? "show" : ""}`}>
                  <h4>{t("HelpCenter")}</h4>
                </div>
                <FooterHelpCenter />
              </div>
            </Col>
            <Col xl="3" lg="4" md="6" onClick={() => toggle("storeInfo")}>
              <div className="sub-title">
                <div className={`footer-title ${openClose?.storeInfo ? "show" : ""}`}>
                  <h4>{t("FollowUs")}</h4>
                </div>
                <div className="footer-content">
                  <p className="mb-cls-content">{t("NeverMissAnythingFromStoreBySigningUpToOurNewsletter")}.</p>
                  <FooterNewsLetter style="classic" />
                  {themeOption?.footer?.social_media_enable && <FooterSocial />}
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
      <SubFooter classes={{ sectionClass: "dark-subfooter" }} />
    </footer>
  );
};

export default FooterThree;
