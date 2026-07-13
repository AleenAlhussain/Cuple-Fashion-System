import TabTitle from "@/components/widgets/TabTitle";
import { useState } from "react";
import { TabContent, TabPane } from "reactstrap";
import { popUpTabTitle } from "../../../data/TabTitleList";
import NewsLetter from "./NewsLetter";
import ExitModal from "./ExitModal";
import AuthModal from "./AuthModal";
import SmartPopups from "./SmartPopups";

const PopupTab = ({ values, setFieldValue }) => {
  const [activeTab, setActiveTab] = useState("4"); // Default to SmartPopups tab
  return (
    <div className="inside-horizontal-tabs">
      <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={popUpTabTitle}/>
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <NewsLetter values={values} setFieldValue={setFieldValue} />
        </TabPane>
        <TabPane tabId="2">
          <ExitModal values={values} setFieldValue={setFieldValue} />
        </TabPane>
        <TabPane tabId="3">
          <AuthModal values={values} setFieldValue={setFieldValue} />
        </TabPane>
        <TabPane tabId="4">
          <SmartPopups />
        </TabPane>
      </TabContent>
    </div>
  );
};

export default PopupTab;
