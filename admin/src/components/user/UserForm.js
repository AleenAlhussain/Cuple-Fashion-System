import React, { useEffect } from "react";
import { Form, Formik } from "formik";
import { Row } from "reactstrap";
import FormBtn from "../../elements/buttons/FormBtn";
import request from "../../utils/axiosUtils";
import { emailSchema, nameSchema, passwordConfirmationSchema, passwordSchema, phoneSchema, optionalEmailSchema, YupObject } from "../../utils/validation/ValidationSchemas";
import Loader from "../commonComponent/Loader";
import UserAddress from "./widgets/UserAddress";
import CreateUser from "./widgets/CreateUser";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

// Static roles data (backend uses simple role field)
const staticRolesData = [
  { id: "customer", name: "Customer" },
  { id: "shop_manager", name: "Shop Manager" },
  { id: "stock_keeper", name: "Stock Keeper" },
  { id: "accounting_team", name: "Accounting Team" },
  { id: "admin", name: "Admin" },
];

const UserForm = ({ mutate, loading, updateId, fixedRole, noRoleField, addAddress, type, buttonName, posMinimal }) => {
  const router = useRouter();

  // Use static roles instead of API call
  const rolesData = staticRolesData;

  const { data: oldData, isLoading: oldDataLoading, refetch } = useCustomQuery(
    [updateId],
    () => request({ url: `/user/${updateId}` }, router),
    {
      enabled: false,
      refetchOnWindowFocus: false,
      select: (data) => data?.data?.data // Fix data path
    }
  );

  useEffect(() => {
    if (updateId) {
      refetch();
    }
  }, [updateId]);

  if (updateId && oldDataLoading) return <Loader />;

  return (
    <Formik
      enableReinitialize
      initialValues={{
        name: updateId ? oldData?.name || "" : "",
        email: updateId ? oldData?.email || "" : "",
        phone: updateId ? oldData?.phone || "" : "",
        password: "",
        password_confirmation: "",
        role_id: updateId ? oldData?.role || "customer" : fixedRole ? "customer" : "",
        status: updateId ? Boolean(oldData?.is_active) : true,
        address: [],
        country_code: updateId ? oldData?.country_code || "" : "971",
      }}
      validationSchema={YupObject({
        name: nameSchema,
        email: posMinimal ? optionalEmailSchema : emailSchema,
        phone: phoneSchema,
        password: (!updateId && !posMinimal) ? passwordSchema : null,
        password_confirmation: (!updateId && !posMinimal) ? passwordConfirmationSchema : null,
        role_id: noRoleField ? null : nameSchema,
      })}
      onSubmit={(values) => {
        // Transform values for API
        const submitData = {
          name: values.name,
          email: values.email || null,
          phone: values.phone ? String(values.phone) : null,
          country_code: values.country_code || null,
          role: values.role_id || "customer", // Backend uses 'role' not 'role_id'
          is_active: values.status ? true : false,
        };

        // Only include password if provided
        if (values.password && !posMinimal) {
          submitData.password = values.password;
        }

        if (mutate) {
          mutate(submitData);
        } else {
          router.push(`/user`);
        }
      }}
    >
      {({ values }) => (
        <Form className="theme-form theme-form-2 mega-form">
          <Row>
            {!addAddress && (
              <>
                <CreateUser updateId={updateId} rolesData={rolesData} fixedRole={fixedRole} posMinimal={posMinimal} />
              </>
            )}
            <UserAddress addAddress={addAddress} type={type} />
            <FormBtn loading={loading} buttonName={buttonName} />
          </Row>
        </Form>
      )}
    </Formik>
  );
};

export default UserForm;
