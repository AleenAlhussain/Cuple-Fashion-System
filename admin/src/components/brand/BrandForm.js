import { mediaConfig } from "@/data/MediaConfig";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import FormBtn from "../../elements/buttons/FormBtn";
import request from "../../utils/axiosUtils";
import { BrandAPI } from "../../utils/axiosUtils/API";
import { YupObject, nameSchema } from "../../utils/validation/ValidationSchemas";
import Loader from "../commonComponent/Loader";
import CheckBoxField from "../inputFields/CheckBoxField";
import FileUploadField from "../inputFields/FileUploadField";
import SimpleInputField from "../inputFields/SimpleInputField";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const BrandForm = ({ updateId, buttonName }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { data: oldData, isLoading, refetch } = useCustomQuery([updateId], () => request({ url: BrandAPI + "/" + updateId }, router), { refetchOnMount: false, enabled: false });

  useEffect(() => {
    updateId && refetch();
  }, [updateId]);

  if (updateId && isLoading) return <Loader />;

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        name_ar: values.name_ar || "",
        description: values.description || "",
        description_ar: values.description_ar || "",
        is_active: values.status ? 1 : 0,
        sort_order: values.sort_order || 0,
      };

      // Handle logo from media library (FileUploadField returns an object with original_url)
      if (values.brand_image?.original_url) {
        payload.logo_url = values.brand_image.original_url;
      }

      if (updateId) {
        await request({
          url: `${BrandAPI}/${updateId}`,
          method: "PUT",
          data: payload,
        }, router);
        ToastNotification("success", "Brand updated successfully");
      } else {
        await request({
          url: BrandAPI,
          method: "POST",
          data: payload,
        }, router);
        ToastNotification("success", "Brand created successfully");
      }
      router.push("/brand");
    } catch (error) {
      console.error("Brand save error:", error);
      ToastNotification("error", error?.response?.data?.message || "Failed to save brand");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Formik
        enableReinitialize
        initialValues={{
          name: updateId ? oldData?.data?.name || "" : "",
          name_ar: updateId ? oldData?.data?.name_ar || "" : "",
          description: updateId ? oldData?.data?.description || "" : "",
          description_ar: updateId ? oldData?.data?.description_ar || "" : "",
          brand_image_id: updateId ? "" : "",
          brand_image: updateId && oldData?.data?.logo_url ? { original_url: oldData?.data?.logo_url } : "",
          sort_order: updateId ? oldData?.data?.sort_order || 0 : 0,
          status: updateId ? Boolean(oldData?.data?.is_active) : true,
        }}
        validationSchema={YupObject({
          name: nameSchema,
        })}
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue, errors, touched }) => (
          <>
            <Form id="brand-form" className="theme-form theme-form-2 mega-form">
              <SimpleInputField
                nameList={[
                  { name: "name", placeholder: t("EnterName"), title: "Name", require: "true" },
                  { name: "name_ar", placeholder: t("EnterNameArabic"), title: "Name (Arabic)" },
                ]}
              />
              <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="brand_image_id" title="Logo" id="brand_image_id" updateId={updateId} type="file" values={values} setFieldValue={setFieldValue} errors={errors} touched={touched} />
              <SimpleInputField
                nameList={[
                  { name: "description", title: "Description", type: "textarea", rows: "3", placeholder: t("EnterDescription") },
                  { name: "description_ar", title: "Description (Arabic)", type: "textarea", rows: "3", placeholder: t("EnterDescriptionArabic") },
                  { name: "sort_order", title: "Sort Order", type: "number", placeholder: "0" },
                ]}
              />
              <CheckBoxField name="status" title="Active" />
              <FormBtn buttonName={buttonName} loading={submitting} />
            </Form>
          </>
        )}
      </Formik>
    </>
  );
};

export default BrandForm;
