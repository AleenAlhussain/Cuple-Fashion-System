import ThemeOptionContext from "@/context/themeOptionsContext";
import { resolveImageUrl } from "@/utils/constants";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Container, Media, Row } from "reactstrap";

const ServicesSection = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { t, i18n } = useTranslation("common");
  const isArabic = i18n.language === "ar";

  return (
    <Container className="container about-cls section-b-space">
      <section className="service border-section small-section section-t-space">
        <Row className="g-sm-4 g-3">
          {themeOption?.about_us?.about?.futures?.map((service, i) => {
            const iconUrl = resolveImageUrl(service?.icon);
            const title = isArabic ? service?.title_ar || t(service?.title) : service?.title;
            const description = isArabic ? service?.description_ar || service?.description : service?.description;
            return (
              <div className="service-block col-md-4" key={i}>
                <Media>
                  {iconUrl && <img src={iconUrl} alt={title || "Service icon"} />}
                  <div className="skeleton-img-box"></div>
                  <Media body>
                    <h4>{title}</h4>
                    <h4 className="skeleton-content-h4"></h4>
                    <p>{description}</p>
                    <p className="skeleton-content-p"></p>
                  </Media>
                </Media>
              </div>
            );
          })}
        </Row>
      </section>
    </Container>
  );
};

export default ServicesSection;
