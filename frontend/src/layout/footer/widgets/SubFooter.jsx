import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Col, Container, Row } from "reactstrap";

const SubFooter = ({ classes }) => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { t, i18n } = useTranslation("common");
  const isArabic = i18n.language === "ar";
  const copyrightContent = themeOption?.footer?.copyright_content || "";
  const copyrightYear = copyrightContent.match(/20\d{2}/)?.[0] || new Date().getFullYear();
  const footerCopyright = isArabic
    ? t("FooterCopyright", { year: copyrightYear })
    : copyrightContent || t("FooterCopyright", { year: copyrightYear });

  return (
    <div className={`sub-footer ${classes?.sectionClass ? classes?.sectionClass : ""}`}>
      <Container>
        <Row>
          {themeOption?.footer?.footer_copyright && (
            <Col xl="6" md="6" sm="12">
              <div className="footer-end">
                <p>{footerCopyright}</p>
              </div>
            </Col>
          )}
          {themeOption?.footer?.payment_option_image_url && (
            <div className="col-xl-6 col-md-6 col-sm-12">
              <div className="payment-card-bottom">
                {/* <Image height={34} width={130} src={storageURL + themeOption?.footer?.payment_option_image_url} alt="payment options" /> */}
              </div>
            </div>
          )}
        </Row>
      </Container>
    </div>
  );
};

export default SubFooter;
