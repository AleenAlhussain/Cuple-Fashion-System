import CheckBoxField from "@/components/inputFields/CheckBoxField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import SimpleInputField from "@/components/inputFields/SimpleInputField";
import TabTitle from "@/components/widgets/TabTitle";
import { JewelleryTwoProductBannerTitle } from "@/data/TabTitleList";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TabContent, TabPane } from "reactstrap";

const ProductBannerTab = ({ productData, setSearch }) => {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState("1");
  return (
    <div className="inside-horizontal-tabs">
      <CheckBoxField name={`[content][product_banner][status]`} title="Status" />
      <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={JewelleryTwoProductBannerTitle} />
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <SimpleInputField nameList={[{ name: `[content][product_banner][left_content][title]`, placeholder: t("EnterTitle"), title: "Title" }]} />
          <SearchableSelectInput
            nameList={[
              {
                name: "productBannerLeftPanelProduct",
                title: "Products",
                inputprops: {
                  name: "productBannerLeftPanelProduct",
                  id: "productBannerLeftPanelProduct",
                  options: productData || [],
                  setsearch: setSearch,
                },
              },
            ]}
          />
          <CheckBoxField name={`[content][product_banner][left_content][status]`} title="Status" />
        </TabPane>
        <TabPane tabId="2">
          <SimpleInputField
            nameList={[
              { name: `[content][product_banner][center_content][tag]`, placeholder: t("EnterTag"), title: "Tag" },
              { name: `[content][product_banner][center_content][title]`, placeholder: t("EnterTitle"), title: "Title" },
            ]}
          />
          <SearchableSelectInput
            nameList={[
              {
                name: "productBannerCenterPanelProduct",
                title: "Products",
                inputprops: {
                  name: "productBannerCenterPanelProduct",
                  id: "productBannerCenterPanelProduct",
                  options: productData || [],
                  setsearch: setSearch,
                },
              },
            ]}
          />
          <CheckBoxField name={`[content][product_banner][center_content][status]`} title="Status" />
        </TabPane>
        <TabPane tabId="3">
          <SimpleInputField nameList={[{ name: `[content][product_banner][right_content][title]`, placeholder: t("EnterTitle"), title: "Title" }]} />
          <SearchableSelectInput
            nameList={[
              {
                name: "productBannerRightPanelProduct",
                title: "Products",
                inputprops: {
                  name: "productBannerRightPanelProduct",
                  id: "productBannerRightPanelProduct",
                  options: productData || [],
                  setsearch: setSearch,
                },
              },
            ]}
          />
          <CheckBoxField name={`[content][product_banner][right_content][status]`} title="Status" />
        </TabPane>
      </TabContent>
    </div>
  );
};

export default ProductBannerTab;
