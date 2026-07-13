import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Row } from "reactstrap";
import FormBtn from "../../elements/buttons/FormBtn";
import request from "../../utils/axiosUtils";
import { YupObject, nameSchema } from "../../utils/validation/ValidationSchemas";
import Loader from "../commonComponent/Loader";
import CheckBoxField from "../inputFields/CheckBoxField";
import SimpleInputField from "../inputFields/SimpleInputField";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const TagForm = ({ updateId, type, buttonName, mutate, loading }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { data: oldData, isLoading, refetch } = useCustomQuery(["tag", updateId], () => request({ url: `tag/${updateId}` }, router), { refetchOnMount: false, enabled: false });
  useEffect(() => {
    updateId && refetch();
  }, [updateId]);
  if (updateId && isLoading) return <Loader />;

  const handleSubmit = (values) => {
    if (typeof mutate !== "function") {
      ToastNotification("error", "Tag submit action is not configured");
      return;
    }

    const payload = {
      name: values.name,
      description: values.description || "",
      status: values.status ? 1 : 0,
    };

    setSubmitting(true);
    mutate(payload, {
      onError: (error) => {
        ToastNotification("error", error?.response?.data?.message || "Failed to save tag");
      },
      onSettled: () => {
        setSubmitting(false);
      },
    });
  };

  return (
    <Formik 
      enableReinitialize
      initialValues={{
        name: updateId ? oldData?.data?.name || "" : "",
        type: type,
        description: updateId ? oldData?.data?.description : "",
        status: updateId ? Boolean(Number(oldData?.data?.status)) : true,
      }}
      validationSchema={YupObject({ name: nameSchema })}
      onSubmit={handleSubmit}
    >
      {() => (
        <Form className="theme-form theme-form-2 mega-form">
          <Row>
            <SimpleInputField
              nameList={[
                { name: "name", placeholder: t("EnterTagName"), require: "true" },
                { name: "description", type: "textarea", title: "Description", placeholder: t("EnterDescription") },
              ]}
            />
            <CheckBoxField name="status" />
            <FormBtn buttonName={buttonName} loading={submitting || Boolean(loading)} />
          </Row>
        </Form>
      )}
    </Formik>
  );
};

export default TagForm;
