import CommonRedirect from "@/components/homePages/CommonRedirect";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import TabTitle from "@/components/widgets/TabTitle";
import { mediaConfig } from "@/data/MediaConfig";
import { FurnitureTwoProductListOfferBannersTitle } from "@/data/TabTitleList";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import { useState } from "react";
import { TabContent, TabPane } from "reactstrap";

const ProductListTab = ({ values, productData, setSearch, setFieldValue, categoryData }) => {
  const [activeTab, setActiveTab] = useState("1");

  return (
    <>
      <SearchableSelectInput
        nameList={[
          {
            name: "productList2Product",
            title: "Products",
            inputprops: {
              name: "productList2Product",
              id: "productList2Product",
              options: productData || [],
              setsearch: setSearch,
            },
          },
        ]}
      />
      <h4 className="fw-semibold mb-3 txt-primary w-100">Offer Banner </h4>
      <div className="inside-horizontal-tabs">
        <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={FurnitureTwoProductListOfferBannersTitle} />
        <TabContent activeTab={activeTab}>
          <TabPane tabId="1">
            <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name={`productList2Banner1Image`} title="Image" id={`productList2Banner1Image`} type="file" values={values} setFieldValue={setFieldValue} showImage={values[`productList2Banner1Image`]} helpertext={getHelperText("806x670px")} />
            <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: `productList2Banner1RedirectLinkType`, multipleNameKey: `productList2Banner1RedirectLink` }} setSearch={setSearch} />
            <CheckBoxField name={`[content][product_list_2][products][product_banner][banner_1][status]`} title="Status" />
          </TabPane>
          <TabPane tabId="2">
            <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name={`productList2Banner2Image`} title="Image" id={`productList2Banner2Image`} type="file" values={values} setFieldValue={setFieldValue} showImage={values[`productList2Banner2Image`]} helpertext={getHelperText("806x670px")} />
            <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: `productList2Banner2RedirectLinkType`, multipleNameKey: `productList2Banner2RedirectLink` }} setSearch={setSearch} />
            <CheckBoxField name={`[content][product_list_2][products][product_banner][banner_2][status]`} title="Status" />
          </TabPane>
        </TabContent>
      </div>
    </>
  );
};

export default ProductListTab;
