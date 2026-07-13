"use client";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Breadcrumb from "@/utils/commonComponents/breadcrumb";
import { Col, TabPane } from "reactstrap";
import AccountSidebar from "../common/AccountSidebar";
import ResponsiveMenuOpen from "../common/ResponsiveMenuOpen";
import MyOrders from "./MyOrders";

const AccountOrders = () => {
  return (
    <>
      <Breadcrumb title={"Order"} subNavigation={[{ name: "Order" }]} />
      <WrapperComponent classes={{ sectionClass: "dashboard-section section-b-space user-dashboard-section", fluidClass: "container" }} customCol={true}>
        <AccountSidebar tabActive={"order"} />
        <Col lg={9}>
          <div className="faq-content">
            <div className="tab-content">
            <ResponsiveMenuOpen />
            <TabPane className="show fade active">
              <MyOrders />
              </TabPane>
              </div>
          </div>
        </Col>
      </WrapperComponent>
    </>
  );
};

export default AccountOrders;
