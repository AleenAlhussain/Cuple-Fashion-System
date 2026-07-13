"use client"
import React, { useState } from "react";
import { Col } from "reactstrap";
import { LicenseAPI } from "@/utils/axiosUtils/API";
import AllLicenseKeyTable from "@/components/licenseKey/AllLicenseKeyTable";

const LicenseKey= () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <AllLicenseKeyTable
        url={LicenseAPI}
        moduleName="License Key"
        isCheck={isCheck}
        setIsCheck={setIsCheck}
        onlyTitle={true}
        keyInPermission={"license_key"}
      />
    </Col>
  );  
};

export default LicenseKey;