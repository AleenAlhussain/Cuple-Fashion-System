import Loader from "@/components/commonComponent/Loader";
import FormBtn from "@/elements/buttons/FormBtn";
import request from "@/utils/axiosUtils";
import { YupObject, nameSchema, permissionsSchema } from "@/utils/validation/ValidationSchemas";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import SimpleInputField from "../inputFields/SimpleInputField";
import PermissionsCheckBoxForm from "./widgets/PermissionsCheckBoxForm";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const PermissionForm = ({ updateId, buttonName }) => {
  const router = useRouter();
  const { t } = useTranslation("common");
  const getPermissionsIdsArray = (data) => {
    const { permissions, name, errors } = data;
    return permissions ? { name, permissions: permissions?.map((permissionsData) => permissionsData.id) } : undefined;
  };
  const { data: oldData, isLoading, refetch } = useCustomQuery(["role/id"], () => request({ url: `role/${updateId}` }, router), { refetchOnMount: false, enabled: false, select: (data) => getPermissionsIdsArray(data?.data) });
  useEffect(() => {
    updateId && refetch();
  }, [updateId]);

  if (updateId && isLoading) return <Loader />;

  return (
    <>
      <Formik
        enableReinitialize
        initialValues={{
          name: updateId ? oldData?.name || "" : "",
          permissions: updateId ? oldData?.permissions || [] : [],
        }}
        validationSchema={YupObject({
          name: nameSchema,
          permissions: permissionsSchema,
        })}
        onSubmit={(
          values // Put Add Or Update Logic Here
        ) => router.push(`/role`)}
      >
        {({ values, setFieldValue, errors, touched }) => (
          <Form>
            <div className="theme-form theme-form-2 mega-form">
              <SimpleInputField nameList={[{ name: "name", placeholder: t("RoleName"), require: "true" }]} />
            </div>
            <PermissionsCheckBoxForm values={values} errors={errors} touched={touched} setFieldValue={setFieldValue} />
            <FormBtn buttonName={buttonName} />
          </Form>
        )}
      </Formik>
    </>
  );
};

export default PermissionForm;
