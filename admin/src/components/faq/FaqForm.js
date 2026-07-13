import { Form, Formik } from "formik";
import * as Yup from "yup";
import { useEffect, useState } from "react";
import { Row } from "reactstrap";
import FormBtn from "../../elements/buttons/FormBtn";
import request from "../../utils/axiosUtils";
import { FaqAPI } from "../../utils/axiosUtils/API";
import Loader from "../commonComponent/Loader";
import CheckBoxField from "../inputFields/CheckBoxField";
import SimpleInputField from "../inputFields/SimpleInputField";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const faqValidationSchema = Yup.object()
  .shape({
    title: Yup.string().trim().max(255, "Title must be 255 characters or less"),
    title_ar: Yup.string().trim().max(255, "Arabic title must be 255 characters or less"),
    description: Yup.string().trim(),
    description_ar: Yup.string().trim(),
  })
  .test("faq-title-required", function (values) {
    const title = String(values?.title || "").trim();
    const titleAr = String(values?.title_ar || "").trim();

    if (title || titleAr) {
      return true;
    }

    return this.createError({
      path: "title",
      message: "Enter the FAQ title in English or Arabic",
    });
  })
  .test("faq-description-required", function (values) {
    const description = String(values?.description || "").trim();
    const descriptionAr = String(values?.description_ar || "").trim();

    if (description || descriptionAr) {
      return true;
    }

    return this.createError({
      path: "description",
      message: "Enter the FAQ description in English or Arabic",
    });
  });

const normalizeValue = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

const FaqForm = ({ updateId, buttonName, mutate, loading }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { data: oldData, isLoading, refetch } = useCustomQuery(["faq/id"], () => request({ url: `${FaqAPI}/${updateId}` }, router), { refetchOnMount: false, enabled: false });
  useEffect(() => {
    updateId && refetch();
  }, [updateId]);
  if (updateId && isLoading) return <Loader />;

  const handleSubmit = (values) => {
    if (typeof mutate !== "function") {
      ToastNotification("error", "FAQ submit action is not configured");
      return;
    }

    const payload = {
      title: normalizeValue(values.title),
      title_ar: normalizeValue(values.title_ar),
      description: normalizeValue(values.description),
      description_ar: normalizeValue(values.description_ar),
      status: values.status ? 1 : 0,
    };

    setSubmitting(true);
    mutate(payload, {
      onError: (error) => {
        ToastNotification("error", error?.response?.data?.message || "Failed to save FAQ");
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
        title: updateId ? oldData?.data?.title || "" : "",
        title_ar: updateId ? oldData?.data?.title_ar || "" : "",
        description: updateId ? oldData?.data?.description || "" : "",
        description_ar: updateId ? oldData?.data?.description_ar || "" : "",
        status: updateId ? Boolean(Number(oldData?.data?.status)) : true,
      }}
      validationSchema={faqValidationSchema}
      onSubmit={handleSubmit}
    >
      {() => (
        <Form className="theme-form theme-form-2 mega-form">
          <Row>
            <SimpleInputField
              nameList={[
                { name: "title", placeholder: t("EnterTitle") },
                { name: "title_ar", title: "FaqTitleArabic", placeholder: t("EnterArabicTitle"), dir: "rtl" },
                { name: "description", type: "textarea", title: "Description", placeholder: t("EnterDescription") },
                { name: "description_ar", type: "textarea", title: "FaqDescriptionArabic", placeholder: t("EnterArabicDescription"), dir: "rtl" },
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

export default FaqForm;
