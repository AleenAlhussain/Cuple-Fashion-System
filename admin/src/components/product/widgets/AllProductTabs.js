import { useEffect } from "react";
import { Col, TabContent, TabPane } from "reactstrap";
import GeneralTab from "../GeneralTab";
import InventoryTab from "../InventoryTab";
import OptionsTab from "../OptionsTab";
import ProductImageTab from "../ProductImageTab";
import SeoTab from "../SeoTab";
import SetupTab from "../SetupTab";
import ShippingTaxTab from "../ShippingTaxTab";
import VariationsTab from "./variations/VariationsTab";
import { generateTitleList } from "./TitleList";

const AllProductTabs = ({ setErrors, setTouched, values, setFieldValue, errors, updateId, activeTab, isSubmitting, setActiveTab, touched }) => {
  useEffect(() => {
    const productTabs = generateTitleList(values)
      .map((main) => main.inputs.filter((item) => errors[item] && touched[item]))
      .findIndex((innerArray) => Array.isArray(innerArray) && innerArray.some((item) => typeof item === "string"));

    if (productTabs !== -1 && activeTab !== productTabs + 1) {
      setActiveTab(String(productTabs + 1));
    }
  }, [isSubmitting]);

  return (
    <Col xl="7" lg="8">
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1" className="some">
          <GeneralTab values={values} setFieldValue={setFieldValue} updateId={updateId} />
        </TabPane>
        <TabPane tabId="2">
          <ProductImageTab values={values} setFieldValue={setFieldValue} errors={errors} updateId={updateId} />
        </TabPane>
        <TabPane tabId="3">
          <InventoryTab setErrors={setErrors} setTouched={setTouched} values={values} setFieldValue={setFieldValue} errors={errors} updateId={updateId} touched={touched} />
        </TabPane>

        {values.type === "classified" && (
          <TabPane tabId="4">
            <VariationsTab values={values} setFieldValue={setFieldValue} errors={errors} updateId={updateId} />
          </TabPane>
        )}

        <TabPane tabId={values.type === "classified" ? "5" : "4"}>
          <SetupTab values={values} setFieldValue={setFieldValue} errors={errors} updateId={updateId} />
        </TabPane>

        <TabPane tabId={values.type === "classified" ? "6" : "5"}>
          <SeoTab values={values} setFieldValue={setFieldValue} updateId={updateId} />
        </TabPane>

        <TabPane tabId={values.type === "classified" ? "7" : "6"}>
          <ShippingTaxTab values={values} setFieldValue={setFieldValue} updateId={updateId} />
        </TabPane>

        <TabPane tabId={values.type === "classified" ? "8" : "7"}>
          <OptionsTab values={values} setFieldValue={setFieldValue} updateId={updateId} />
        </TabPane>
      </TabContent>
    </Col>
  );
};

export default AllProductTabs;
