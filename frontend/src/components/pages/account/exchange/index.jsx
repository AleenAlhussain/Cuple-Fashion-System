"use client";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Breadcrumb from "@/utils/commonComponents/breadcrumb";
import { Col, TabPane } from "reactstrap";
import AccountSidebar from "@/components/pages/account/common/AccountSidebar";
import ResponsiveMenuOpen from "@/components/pages/account/common/ResponsiveMenuOpen";
import ExchangeTable from "./ExchangeTable";

export default function AccountExchange(){
  return (
    <>
      <Breadcrumb title={"Exchange"} subNavigation={[{ name: "Exchange" }]} />
      <WrapperComponent classes={{ sectionClass:"dashboard-section section-b-space user-dashboard-section", fluidClass:"container" }} customCol>
        <AccountSidebar tabActive={"exchange"} />
        <Col lg={9}>
          <div className="faq-content">
            <div className="tab-content">
              <ResponsiveMenuOpen />
              <TabPane className="show fade active">
                <ExchangeTable />
              </TabPane>
            </div>
          </div>
        </Col>
      </WrapperComponent>
    </>
  );
}
