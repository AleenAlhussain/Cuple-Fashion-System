"use client";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Loader from "@/layout/loader";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Col } from "reactstrap";
import TrackingForm from "./TrackingForm";

const heroStyle = {
  background: "linear-gradient(135deg, #f6e4d1, #efdecc 40%, #fffdf9)",
  borderRadius: "32px",
  padding: "3rem 2rem",
  marginBottom: "3rem",
  boxShadow: "0 20px 45px rgba(0,0,0,0.08)",
};

const statusItems = [
  { titleKey: "TrackingStatusReceivedTitle", descriptionKey: "TrackingStatusReceivedDescription" },
  { titleKey: "TrackingStatusPreparingTitle", descriptionKey: "TrackingStatusPreparingDescription" },
  { titleKey: "TrackingStatusOnTheWayTitle", descriptionKey: "TrackingStatusOnTheWayDescription" },
  { titleKey: "TrackingStatusDeliveredTitle", descriptionKey: "TrackingStatusDeliveredDescription" },
];

const TrackingData = ({ params }) => {
  const { t } = useTranslation("common");
  const { isLoading } = useContext(ThemeOptionContext);

  if (isLoading) return <Loader />;

  return (
    <>
      <Breadcrumbs title={"Order Tracking"} subNavigation={[{ name: "Order Tracking" }]} />
      <div className="container w-100 mb-5">
        <div style={heroStyle}>
          <div className="d-flex flex-column flex-sm-row align-items-start gap-4">
            <div className="flex-grow-1">
              <p className="text-uppercase text-muted mb-2 small">{t("TrackingHeroLead")}</p>
              <h1 className="display-5 fw-bold">{t("TrackingHeroTitle")}</h1>
              <p className="mb-0 text-dark">{t("TrackingHeroDescription")}</p>
            </div>
            <div>
              <span className="badge bg-dark text-white fs-6 px-4 py-2">{t("TrackingHeroBadge")}</span>
            </div>
          </div>
          <div className="row g-3 mt-4">
            {statusItems.map((item) => (
              <div className="col-sm-6 col-xl-3" key={item.titleKey}>
                <div className="bg-white rounded-4 p-3 h-100 shadow-sm">
                  <h6 className="fw-bold">{t(item.titleKey)}</h6>
                  <p className="mb-0 small text-muted">{t(item.descriptionKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WrapperComponent
        classes={{ sectionClass: "section-b-space", fluidClass: "container w-100" }}
        customCol={true}
      >
        <Col xxl={4} xl={5} lg={6} sm={8} className="mx-auto">
          <div className="p-4 rounded-4 border border-2 border-light shadow-sm">
            <div className="mb-4 text-center">
              <h3 className="fw-bold mb-1">{t("OrderTracking")}</h3>
              <p className="mb-0 text-muted">{t("OrderTrackingDescription")}</p>
            </div>
            <TrackingForm />
            <div className="mt-4 text-center text-muted small">
              <p className="mb-1">{t("TrackingHelpLine")}</p>
              <p className="mb-0">{t("TrackingHelpResponse")}</p>
            </div>
          </div>
        </Col>
      </WrapperComponent>
    </>
  );
};

export default TrackingData;
