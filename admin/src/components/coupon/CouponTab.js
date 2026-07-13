import { TabContent, TabPane } from "reactstrap";
import FormBtn from "../../elements/buttons/FormBtn";
import GeneralTabContent from "./widgets/GeneralTabContent";
import RestrictionTabContent from "./widgets/RestrictionTabContent";
import UsageTabContent from "./widgets/UsageTabContent";
import { CouponTabTitleListData } from "@/data/TabTitleList";
import { useEffect } from "react";

const CouponTab = ({ buttonName, setActiveTab, values, touched, activeTab, isSubmitting, setFieldValue, errors }) => {
  useEffect(() => {
    let couponErrorTab = CouponTabTitleListData.map((main) => main.inputs.filter((item) => errors[item] && touched[item])).findIndex((innerArray) => Array.isArray(innerArray) && innerArray.some((item) => typeof item == "string"));

    if (couponErrorTab !== -1 && activeTab !== couponErrorTab + 1) {
      setActiveTab(String(couponErrorTab + 1));
    }
  }, [isSubmitting]);
  return (
    <TabContent activeTab={activeTab}>
      <TabPane tabId="1">
        <GeneralTabContent setFieldValue={setFieldValue} values={values} />
      </TabPane>
      <TabPane tabId="2">
        <RestrictionTabContent values={values} setFieldValue={setFieldValue} errors={errors} />
      </TabPane>
      <TabPane tabId="3">
        <UsageTabContent values={values} />
      </TabPane>
      <FormBtn buttonName={buttonName} />
    </TabContent>
  );
};

export default CouponTab;
