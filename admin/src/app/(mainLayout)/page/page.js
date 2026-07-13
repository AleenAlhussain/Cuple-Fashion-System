'use client'
import React, { useMemo, useState } from "react";
import { Col } from "reactstrap";
import { PagesAPI } from "@/utils/axiosUtils/API";
import AllPagesTable from "@/components/pages";
import { checkPermission } from "@/components/common/CheckPermissionList";

const Pages = () => {
  const [isCheck, setIsCheck] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const hasPagePermission = useMemo(() => checkPermission("page.index"), []);

  const apiStatusParam = useMemo(() => {
    if (statusFilter === "published") return 2;
    if (statusFilter === "active") return 1;
    if (statusFilter === "draft") return 0;
    return null;
  }, [statusFilter]);

  if (!hasPagePermission) {
    return (
      <Col sm="12">
        <div className="card">
          <div className="card-body">
            <div className="p-4 text-center">
              <div className="fw-semibold text-danger fs-4 mb-2">
                Permission Required
              </div>
              <div className="text-muted small fs-6">
                This section is available to administrators only.
              </div>
            </div>
          </div>
        </div>
      </Col>
    );
  }

  return (
    <Col sm="12">
      <AllPagesTable
        url={PagesAPI}
        moduleName="Page"
        isCheck={isCheck}
        setIsCheck={setIsCheck}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paramsProps={{ status: apiStatusParam }}
      />
    </Col>
  );
};

export default Pages;
