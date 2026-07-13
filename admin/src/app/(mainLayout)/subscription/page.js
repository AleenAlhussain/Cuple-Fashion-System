"use client";

import AllSubscriptionEmailsTable from "@/components/subscription/AllSubscriptionEmailsTable";
import { SubscriptionEmailAPI } from "@/utils/axiosUtils/API";
import { Col } from "reactstrap";

const SubscriptionEmailsPage = () => {
  return (
    <Col sm="12">
      <AllSubscriptionEmailsTable
        url={SubscriptionEmailAPI}
        moduleName="SubscriptionEmail"
        onlyTitle={true}
        filterHeader={{ customTitle: "SubscriptionEmails" }}
      />
    </Col>
  );
};

export default SubscriptionEmailsPage;

