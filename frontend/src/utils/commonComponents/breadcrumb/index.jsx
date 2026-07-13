 "use client";
import { Href } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { Breadcrumb, Container } from "reactstrap";

const Breadcrumbs = ({ mainHeading, subNavigation, subTitle, title, bannerImage }) => {
  const { t } = useTranslation("common");
  const normalizeLabel = (value) =>
    typeof value === "string" ? value.split("-").join(" ") : value;

  const sectionStyle = bannerImage
    ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${bannerImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : {};

  return (
    <div className={`breadcrumb-section${bannerImage ? " has-banner" : ""}`} style={sectionStyle}>
      <Container>
        <h2 style={bannerImage ? { color: "#fff" } : {}}>{t(normalizeLabel(title))}</h2>
        <nav className="theme-breadcrumb">
          <Breadcrumb>
            <div className="breadcrumb-item active">
              <a href={Href} style={bannerImage ? { color: "#fff" } : {}}> {t("Home")} </a>
            </div>
            {subNavigation?.map((result, i) => (
              <div key={i} className="breadcrumb-item active ">
                <a href={Href} style={bannerImage ? { color: "#fff" } : {}}> {t(normalizeLabel(result?.name))} </a>
              </div>
            ))}
          </Breadcrumb>
        </nav>
      </Container>
    </div>
  );
};

export default Breadcrumbs;
