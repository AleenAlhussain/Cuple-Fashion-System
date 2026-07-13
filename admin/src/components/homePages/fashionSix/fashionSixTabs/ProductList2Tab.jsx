import TabTitle from "@/components/widgets/TabTitle";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { TabContent, TabPane } from "reactstrap";
import { FashionSixProductList2Title } from "@/data/TabTitleList";
import { getHelperText } from "@/utils/customFunctions/getHelperText";
import CheckBoxField from "@/components/inputFields/CheckBoxField";
import FileUploadField from "@/components/inputFields/FileUploadField";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import SimpleInputField from "@/components/inputFields/SimpleInputField";
import { mediaConfig } from "@/data/MediaConfig";

const ProductList2Tab = ({ setFieldValue, values, productData, setSearch }) => {
  const [activeTab, setActiveTab] = useState("1");
  
  const { t } = useTranslation( "common");
  return (
    <div className="inside-horizontal-tabs">
      <CheckBoxField name={`[content][products_list_2][status]`} title="Status" />
      <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={FashionSixProductList2Title} />
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <SimpleInputField
            nameList={[
              { name: `[content][products_list_2][products][tag]`, placeholder: t("EnterTitle"), title: "Title" },
              { name: `[content][products_list_2][products][title]`, placeholder: t("SubTitle"), title: "Sub Title" },
            ]}
          />
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
        <TabPane tabId="2">
          <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="rightPanelImage" title="Image" id="rightPanelImage" showImage={values["rightPanelImage"]} type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("806x670px")} />
        </TabPane>
      </TabContent>
    </div>
  );
};

export default ProductList2Tab;
