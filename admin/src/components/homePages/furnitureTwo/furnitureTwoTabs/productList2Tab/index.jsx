import CheckBoxField from "@/components/inputFields/CheckBoxField";
import TabTitle from "@/components/widgets/TabTitle";
import { FurnitureTwoProductListTitle } from "@/data/TabTitleList";
import { useState } from "react";
import { TabContent, TabPane } from "reactstrap";
import ProductListTab from "./ProductListTab";
import RightPanelTab from "./RightPanelTab";

const ProductList2Tab = ({ values, setFieldValue, productData, categoryData, setSearch }) => {
  const [activeTab, setActiveTab] = useState("1");
  return (
    <div className="inside-horizontal-tabs">
      <CheckBoxField name="[content][product_list_2][status]" title="Status" />
      <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={FurnitureTwoProductListTitle} />
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <ProductListTab productData={productData} values={values} setSearch={setSearch} categoryData={categoryData} setFieldValue={setFieldValue} />
        </TabPane>
        <TabPane tabId="2">
          <RightPanelTab productData={productData} values={values} setSearch={setSearch} />
        </TabPane>
      </TabContent>
    </div>
  );
};

export default ProductList2Tab;
