"use client"
import React, { useState } from "react";
import { Col } from "reactstrap";
import { BrandAPI } from "@/utils/axiosUtils/API";
import AllBrandTable from "@/components/brand/AllBrandTable";

const Brand = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <AllBrandTable
        url={BrandAPI}
        moduleName="Brand"
        isCheck={isCheck}
        setIsCheck={setIsCheck}
        keyInPermission={"brand"}
      />
    </Col>
  );
};

export default Brand;