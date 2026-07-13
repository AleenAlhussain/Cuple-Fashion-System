import FileUploadField from "@/components/inputFields/FileUploadField";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TabContent, TabPane } from "reactstrap";
import { YogaOfferBanner1Title } from "@/data/TabTitleList";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import TabTitle from "@/components/widgets/TabTitle";
import CommonRedirect from "../../CommonRedirect";
import { mediaConfig } from "@/data/MediaConfig";

const OfferBanner1Tab = ({ values, setFieldValue, productData, categoryData, setSearch }) => {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState("1");
  return (
    <div className="inside-horizontal-tabs">
      <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={YogaOfferBanner1Title} />
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="offerBanner1Image1" title="Image" id="offerBanner1Image1" showImage={values["offerBanner1Image1"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("806x670px")} />
          <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "offerBanner1LinkType1", multipleNameKey: "offerBanner1Link1" }} setSearch={setSearch} />
          <CheckBoxField name={`[content][offer_banner_1][banner_1][status]`} title="Status" />
        </TabPane>
        <TabPane tabId="2">
          <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="offerBanner1Image2" title="Image" id="offerBanner1Image2" showImage={values["offerBanner1Image2"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("806x670px")} />
          <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "offerBanner1LinkType2", multipleNameKey: "offerBanner1Link2" }} setSearch={setSearch} />
          <CheckBoxField name={`[content][offer_banner_1][banner_2][status]`} title="Status" />
        </TabPane>
        <TabPane tabId="3">
          <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="offerBanner1Image3" title="Image" id="offerBanner1Image3" showImage={values["offerBanner1Image3"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("806x670px")} />
          <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "offerBanner1LinkType3", multipleNameKey: "offerBanner1Link3" }} setSearch={setSearch} />
          <CheckBoxField name={`[content][offer_banner_1][banner_3][status]`} title="Status" />
        </TabPane>
      </TabContent>
    </div>
  );
};

export default OfferBanner1Tab;
