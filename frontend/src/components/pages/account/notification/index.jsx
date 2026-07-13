"use client";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Breadcrumb from "@/utils/commonComponents/breadcrumb";
import { Col, TabContent, TabPane } from "reactstrap";
import AccountSidebar from "../common/AccountSidebar";
import ResponsiveMenuOpen from "../common/ResponsiveMenuOpen";
import NotificationData from "./NotificationData";

const AccountNotificationContent = () => {
  return (
    <>
      <Breadcrumb title={"Notification"} subNavigation={[{ name: "Notification" }]} />
      <WrapperComponent classes={{ sectionClass: "dashboard-section section-b-space user-dashboard-section", fluidClass: "container" }} customCol={true}>
        <AccountSidebar tabActive={"notification"} />
        <Col lg={9}>
          <ResponsiveMenuOpen />
          <div className="faq-content">
            <TabContent>
              <TabPane className="show fade active">
                <NotificationData />
              </TabPane>
            </TabContent>
          </div>
        </Col>
      </WrapperComponent>
    </>
  );
};

export default AccountNotificationContent;
