'use client'
import AllPopupTable from "@/components/popup/AllPopupTable";
import { PopupAPI } from "@/utils/axiosUtils/API";
import { useState } from "react";
import { Col } from "reactstrap";

const AllPopups = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <AllPopupTable url={PopupAPI} moduleName="Popup" isCheck={isCheck} setIsCheck={setIsCheck} />
    </Col>
  );
};

export default AllPopups;
