import NavTabTitles from "@/components/widgets/NavTabs";
//import NoDataFound from "@/components/widgets/NoDataFound";
import TextLimit from "@/utils/customFunctions/TextLimit";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { localizedValue } from "@/utils/constants";
import { Col, Row, TabContent, TabPane } from "reactstrap";
//import CustomerReview from "../common/CustomerReview";

const VerticalProductDetails = ({ productState }) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  let [showMore, setShowMore] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const ProductDetailsTabTitle = [
    { id: 1, name: t("Description") },
    { id: 2, name: t("AdditionalInformation") },
  ];

    const rows = [];
      if (Array.isArray(attributes)) {
    attributes.forEach((attr) => {
      if (!attr) return;
      const name = attr.name || attr.label;
      const values = Array.isArray(attr.values)
        ? attr.values.join(", ")
        : attr.value || "";
      if (name && values) {
        rows.push({ label: name, value: values });
      }
    });
  } else if (typeof attributes === "object" && attributes !== null) {
    Object.entries(attributes).forEach(([key, val]) => {
      let valueText = "";
      if (Array.isArray(val)) valueText = val.join(", ");
      else if (val != null) valueText = String(val);

      if (valueText) {
        rows.push({
          label: key.charAt(0).toUpperCase() + key.slice(1), 
          value: valueText,
        });
      }
    });
  }

 return (
    <>
      <Col xl="2">
        <NavTabTitles
          classes={{
            navClass: "nav nav-tabs nav-material flex-column nav-border",
          }}
          titleList={ProductDetailsTabTitle}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </Col>

      <Col xl="10">
        <TabContent className="nav-material" activeTab={activeTab}>
          {/* Description */}
          <TabPane tabId={1} className={activeTab === 1 ? "show fade active" : ""}>
            <div className={`product-description more-less-box ${showMore ? "more" : ""}`}>
              {showMore ? (
                <TextLimit value={localizedValue(product, 'description', lang)} />
              ) : (
                <TextLimit value={localizedValue(product, 'description', lang)?.substring(0, 1600)} />
              )}
            </div>
          </TabPane>

          {/* Additional information */}
          <TabPane tabId={2} className={activeTab === 2 ? "show fade active" : ""}>
            {rows.length ? (
              <div className="table-responsive">
                <table className="table table-bordered mb-0">
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index}>
                        <th style={{ width: "25%" }}>{row.label}</th>
                        <td>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mb-0">{t("NoAdditionalInformation")}</p>
            )}
          </TabPane>
        </TabContent>
      </Col>
    </>
  );
};

export default VerticalProductDetails;
