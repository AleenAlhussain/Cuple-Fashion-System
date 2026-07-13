import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import SimpleInputField from "@/components/inputFields/SimpleInputField";
import TabTitle from "@/components/widgets/TabTitle";
import { mediaConfig } from "@/data/MediaConfig";
import { DigitalDownloadProduct2Title } from "@/data/TabTitleList";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TabContent, TabPane } from "reactstrap";
import CommonRedirect from "../../CommonRedirect";

const ProductList2Tab = ({ values, setFieldValue, productData, categoryData, setSearch }) => {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState("1");
  return (
    <div className="inside-horizontal-tabs">
      <CheckBoxField name={`[content][products_list_2][status]`} title="Status" />
      <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="productListMainImage" title="Image" id="productListMainImage" showImage={values["productListMainImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("376x231px")} />
      <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={DigitalDownloadProduct2Title} />
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <SimpleInputField
            nameList={[
              { name: `[content][products_list_2][left_panel][title]`, placeholder: t("EnterTitle"), title: "Title" },
              { name: `[content][products_list_2][left_panel][description]`, placeholder: t("EnterTitle"), title: "Description", type: "textarea" },
            ]}
          />
          <CheckBoxField name={`[content][products_list_2][left_panel][status]`} title="MoreButton" />

          <SimpleInputField nameList={[{ name: `[content][products_list_2][left_panel][button_text]`, placeholder: t("EnterButtonText"), title: "ButtonText" }]} />

          <CommonRedirect values={values} setFieldValue={setFieldValue} productData={productData} categoryData={categoryData} nameList={{ selectNameKey: "productListLeftContentLinkType", multipleNameKey: "productListLeftContentLink" }} setSearch={setSearch} />
          <CheckBoxField name={`[content][products_list_2][left_panel][status]`} title="Status" />
        </TabPane>
        <TabPane tabId="2">
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
        </TabPane>
      </TabContent>
    </div>
  );
};

export default ProductList2Tab;
