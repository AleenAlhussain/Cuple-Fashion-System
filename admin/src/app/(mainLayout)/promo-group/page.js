"use client";

import { useState } from "react";
import { Col } from "reactstrap";
import AllPromoGroupsTable from "@/components/promoGroup/AllPromoGroupsTable";
import { PromoGroupAPI } from "@/utils/axiosUtils/API";

const AllPromoGroups = () => {
  const [isCheck, setIsCheck] = useState([]);

  return (
    <Col sm="12">
      <AllPromoGroupsTable
        url={PromoGroupAPI}
        moduleName="promo-group"
        isCheck={isCheck}
        setIsCheck={setIsCheck}
      />
    </Col>
  );
};

export default AllPromoGroups;
