import { Form, Formik } from "formik";
import { useEffect, useMemo } from "react";
import { Row } from "reactstrap";
import FormBtn from "../../elements/buttons/FormBtn";
import request from "../../utils/axiosUtils";
import { nameSchema, YupObject } from "../../utils/validation/ValidationSchemas";
import Loader from "../commonComponent/Loader";
import CheckBoxField from "../inputFields/CheckBoxField";
import FileUploadField from "../inputFields/FileUploadField";
import MultiSelectField from "../inputFields/MultiSelectField";
import SimpleInputField from "../inputFields/SimpleInputField";

import { mediaConfig } from "@/data/MediaConfig";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import { Category } from "@/utils/axiosUtils/API";

const CategoryForm = ({ setResetData, updateId, loading, type, buttonName, mutate }) => {
  const { t } = useTranslation("common");
  const router = useRouter();

  // Fetch all categories for parent selection
  const { data: categoriesData } = useCustomQuery(
    ["categories-for-parent"],
    () => request({ url: Category }, router),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data || []
    }
  );

  const { data: oldData, isLoading, refetch } = useCustomQuery(["category/" + updateId], () => request({ url: `category/${updateId}` }, router), { enabled: false });
  useEffect(() => {
    updateId && refetch();
  }, [updateId]);

  // Format categories for dropdown, excluding current category when editing
  const updatedData = useMemo(() => {
    if (!categoriesData) return [];
    // Filter out current category when editing to prevent self-parent
    const filtered = updateId
      ? categoriesData.filter(cat => cat.id !== parseInt(updateId))
      : categoriesData;
    return filtered.map(cat => ({
      id: cat.id,
      name: cat.name,
    }));
  }, [categoriesData, updateId]);

  if (updateId && isLoading) return <Loader />;

  return (
    <Formik
      enableReinitialize
      initialValues={{
        name: updateId ? oldData?.data?.name || "" : "",
        description: updateId ? oldData?.data?.description || "" : "",
        category_image_id: updateId ? oldData?.data?.category_image?.id : "",
        meta_title: updateId ? oldData?.data?.meta_title || "" : "",
        meta_description: updateId ? oldData?.data?.meta_description || "" : "",
        category_meta_image_id: updateId ? oldData?.data?.category_meta_image?.id : "",
        category_meta_image: updateId ? oldData?.data?.category_meta_image : "",
        category_icon_id: updateId ? oldData?.data?.category_icon?.id : "",
        category_image: updateId ? oldData?.data?.category_image : "",
        category_icon: updateId ? oldData?.data?.category_icon : "",
        commission_rate: updateId ? oldData?.data?.commission_rate : "",
        sort_order: updateId ? Number(oldData?.data?.sort_order ?? 0) : 0,
        type: type,
        status: updateId ? Boolean(Number(oldData?.data?.status)) : true,
        parent_id: updateId ? Number(oldData?.data?.parent_id) || undefined : undefined,
      }}
      validationSchema={YupObject({
        name: nameSchema,
      })}
      onSubmit={(values, helpers) => {
        // Prepare data for API
        const submitData = {
          name: values.name,
          description: values.description || null,
          parent_id: values.parent_id || null,
          sort_order: Number(values.sort_order || 0),
          is_active: values.status ? 1 : 0,
          meta_title: values.meta_title || null,
          meta_description: values.meta_description || null,
          type: values.type,
        };

        // Handle image IDs if provided
        if (values.category_image_id) {
          submitData.category_image_id = values.category_image_id;
        }
        if (values.category_icon_id) {
          submitData.category_icon_id = values.category_icon_id;
        }
        if (values.category_meta_image_id) {
          submitData.category_meta_image_id = values.category_meta_image_id;
        }
        if (values.commission_rate) {
          submitData.commission_rate = values.commission_rate;
        }

        if (updateId) {
          submitData._method = 'PUT';
        }

        if (mutate) {
          mutate(submitData);
        } else {
          // Fallback if mutate not provided
          setResetData && setResetData(true);
          router.push(`/category`);
        }
      }}
    >
      {({ setFieldValue, values, errors }) => (
        <Form className="theme-form theme-form-2 mega-form">
          <Row>
            <SimpleInputField
              nameList={[
                {
                  name: "name",
                  title: "Name",
                  placeholder: t("EnterCategoryName"),
                  require: "true",
                },
                {
                  name: "description",
                  type: "textarea",
                  rows: "3",
                  placeholder: t("EnterCategoryDescription"),
                },
              ]}
            />
            {type == "product" && <SimpleInputField nameList={[{ name: "commission_rate", title: "CommissionRate", postprefix: "%", inputaddon: "true", placeholder: t("EnterCommissionRate"), min: "0", max: "100", type: "number", helpertext: "*Define the percentage of earnings retained as commission." }]} />}
            <SimpleInputField
              nameList={[
                {
                  name: "sort_order",
                  title: "Priority",
                  placeholder: "Enter category priority",
                  min: "0",
                  type: "number",
                },
              ]}
            />
            <MultiSelectField errors={errors} values={values} setFieldValue={setFieldValue} name="parent_id" title={"SelectParent"} data={updatedData} />
            <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="category_image_id" id="category_image_id" title="CategoryImage" updateId={updateId} type="file" values={values} setFieldValue={setFieldValue} loading={loading} />
            <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="category_icon_id" id="category_icon_id" title="CategoryIcon" updateId={updateId} type="file" values={values} setFieldValue={setFieldValue} loading={loading} />
            <SimpleInputField
              nameList={[
                { name: "meta_title", title: "MetaTitle", placeholder: t("enter_meta_title") },
                { name: "meta_description", title: "MetaDescription", type: "textarea", rows: "3", placeholder: t("enter_meta_description") },
              ]}
            />
            <FileUploadField paramsProps={{ mime_type: mediaConfig.image.join(",") }} name="category_meta_image_id" id="category_meta_image_id" title="MetaImage" updateId={updateId} type="file" values={values} setFieldValue={setFieldValue} loading={loading} />
            <CheckBoxField name="status" />
            <FormBtn loading={loading} buttonName={buttonName} />
          </Row>
        </Form>
      )}
    </Formik>
  );
};
export default CategoryForm;
