"use client";
import React, { useMemo, useState } from "react";
import { Col } from "reactstrap";
import { Form, Formik } from "formik";
import SearchableSelectInput from "@/components/inputFields/SearchableSelectInput";
import { user } from "@/utils/axiosUtils/API";
import AllUsersTable from "@/components/user/AllUsersTable";
import { checkPermission } from "@/components/common/CheckPermissionList";

const userStatusOptions = [
  { id: "active", name: "Active", slug: "active" },
  { id: "inactive", name: "Inactive", slug: "inactive" },
];

// Role options - user roles in the system
const systemRoleOptions = [
  { id: "admin", name: "Admin", slug: "admin" },
  { id: "customer", name: "Customer", slug: "customer" },
  { id: "shop_manager", name: "Shop Manager", slug: "shop_manager" },
  { id: "stock_keeper", name: "Stock Keeper", slug: "stock_keeper" },
  { id: "accounting_team", name: "Accounting Team", slug: "accounting_team" },
];

const AllUsers = () => {
  const [isCheck, setIsCheck] = useState([]);
  const hasUserPermission = useMemo(() => checkPermission("user.index"), []);

  if (!hasUserPermission) {
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
      <Formik initialValues={{ role: "", status: "" }}>
        {({ values, setFieldValue }) => (
          <Form>
            <AllUsersTable
              url={user}
              moduleName="User"
              isCheck={isCheck}
              setIsCheck={setIsCheck}
              filterHeader={{ noSearch: true }}
              paramsProps={{
                role: values.role || null,
                status: values.status || null,
              }}
              advanceFilter={{
                role: (
                  <SearchableSelectInput
                    nameList={[
                      {
                        name: "role",
                        notitle: "true",
                        inputprops: {
                          name: "role",
                          id: "role",
                          initialTittle: "SelectRole",
                          options: systemRoleOptions,
                          close: !!values.role,
                        },
                      },
                    ]}
                  />
                ),
                userStatus: (
                  <SearchableSelectInput
                    nameList={[
                      {
                        name: "status",
                        notitle: "true",
                        inputprops: {
                          name: "status",
                          id: "status",
                          initialTittle: "SelectStatus",
                          options: userStatusOptions,
                          close: !!values.status,
                        },
                      },
                    ]}
                  />
                ),
              }}
              roleOptions={systemRoleOptions}
            />
          </Form>
        )}
      </Formik>
    </Col>
  );
};

export default AllUsers;
