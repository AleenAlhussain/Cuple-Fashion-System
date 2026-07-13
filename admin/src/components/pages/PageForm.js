import { Form, Formik } from "formik";
import { useEffect } from "react";
import FormBtn from "../../elements/buttons/FormBtn";
import request from "../../utils/axiosUtils";
import { PagesAPI } from "../../utils/axiosUtils/API";
import { YupObject, nameSchema } from "../../utils/validation/ValidationSchemas";
import Loader from "../commonComponent/Loader";
import CheckBoxField from "../inputFields/CheckBoxField";
import FileUploadField from "../inputFields/FileUploadField";
import SimpleInputField from "../inputFields/SimpleInputField";
import DescriptionInput from "../widgets/DescriptionInput";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const PageForm = ({ updateId, buttonName, mutate, loading }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { data: oldData, isLoading, refetch } = useCustomQuery([`page/id`], () => request({ url: `${PagesAPI}/${updateId}` }, router), { enabled: false, select: (data) => data?.data });
  useEffect(() => {
    updateId && refetch();
  }, [updateId]);
  if (updateId && isLoading) return <Loader />;
  return (
    <Formik
      enableReinitialize
      initialValues={{
        title: updateId ? oldData?.title || "" : "",
        content: updateId ? oldData?.content || "" : "",
        meta_title: updateId ? oldData?.meta_title || "" : "",
        meta_description: updateId ? oldData?.meta_description || "" : "",
        page_meta_image_id: updateId ? oldData?.page_meta_image_id?.id || "" : "",
        page_meta_image: updateId ? oldData?.page_meta_image || "" : "",
        status: updateId ? Boolean(Number(oldData?.status)) : true,
      }}
      validationSchema={YupObject({
        title: nameSchema,
      })}
      onSubmit={(values) => {
        const payload = {
          ...values,
          status: Number(values.status),
        };
        if (mutate) {
          mutate(payload);
        }
      }}
    >
      {({ values, setFieldValue, errors, touched }) => (
        <>
          <Form id="blog" className="theme-form theme-form-2 mega-form">
            <SimpleInputField nameList={[{ name: "title", placeholder: t("EnterTitle"), require: "true" }]} />
            <DescriptionInput values={values} setFieldValue={setFieldValue} title={"Content"} nameKey="content" />
            <SimpleInputField
              nameList={[
                { name: "meta_title", title: "MetaTitle", placeholder: t("EnterTitle") },
                { name: "meta_description", title: "MetaDescription", placeholder: t("EnterDescription") },
              ]}
            />
            <FileUploadField name="page_meta_image_id" title="PageMetaImage" id="page_meta_image_id" updateId={updateId} type="file" values={values} setFieldValue={setFieldValue} errors={errors} touched={touched} />
            <CheckBoxField name="status" />
            <FormBtn loading={loading} buttonName={buttonName} />
          </Form>
        </>
      )}
    </Formik>
  );
};

export default PageForm;
