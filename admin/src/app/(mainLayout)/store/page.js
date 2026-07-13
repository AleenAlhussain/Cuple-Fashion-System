'use client'
import { useMemo, useState } from "react";
import { Col } from "reactstrap";
import AllStoresTable from "@/components/store/AllStoresTable";
import { store } from "@/utils/axiosUtils/API";
import { checkPermission } from "@/components/common/CheckPermissionList";

const AllStores = () => {
  const [isCheck, setIsCheck] = useState([]);
  const hasStorePermission = useMemo(() => checkPermission("store.index"), []);

  if (!hasStorePermission) {
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
      <AllStoresTable url={store} moduleName="Store" isCheck={isCheck} setIsCheck={setIsCheck} />
    </Col>
  );
};

export default AllStores;
