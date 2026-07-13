import { ErrorMessage, FieldArray, Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { Fragment, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Col, Row } from "reactstrap";
import Btn from "../../elements/buttons/Btn";
import FormBtn from "../../elements/buttons/FormBtn";
import request from "../../utils/axiosUtils";
import { attributeValues, nameSchema, YupObject } from "../../utils/validation/ValidationSchemas";
import Loader from "../commonComponent/Loader";
import SimpleInputField from "../inputFields/SimpleInputField";
import CreateAttributes from "./widgets/CreateAttributes";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const AttributeForm = ({ updateId, buttonName, mutate, loading }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const {
    data: oldData,
    isLoading,
    refetch,
  } = useCustomQuery(["attribute/" + updateId], () => request({ url: `attribute/${updateId}` }, router), {
    refetchOnMount: false,
    enabled: false,
    select: (data) => data.data.data, // Extract from axios response -> API response -> actual data
  });
  useEffect(() => {
    if (updateId) {
      refetch();
    }
  }, [updateId]);
  if (updateId && isLoading) return <Loader />;
  return (
    <Formik
      enableReinitialize
      initialValues={{
        name: updateId ? oldData?.name || "" : "",
        slug: updateId ? oldData?.slug || "" : "",
        style: updateId ? oldData?.style || "" : "rectangle",
        value: updateId ? oldData?.attribute_values || [] : [{ value: "", hex_color: "" }],
      }}
      validationSchema={YupObject({
        name: nameSchema,
        value: attributeValues,
      })}
      onSubmit={(values) => {
        // Prepare the data for API
        const submitData = {
          name: values.name,
          slug: values.slug || null,
          style: values.style,
          status: 1,
          attribute_values: values.value.map(v => ({
            value: v.value,
            hex_color: v.hex_color || null,
          })),
        };

        if (mutate) {
          mutate(submitData);
        } else {
          // Fallback if mutate not provided
          router.push(`/attribute`);
        }
      }}
    >
      {({ values }) => (
        <Form className="theme-form theme-form-2 mega-form">
          <CreateAttributes />
          <Row className="mb-0 align-items-center">
            <Col sm="12">
              <FieldArray
                name="value"
                render={(arrayHelpers) => {
                  return (
                    <>
                      {values["value"].map((item, i) => (
                        <Fragment key={i}>
                          <Row className="g-sm-4 g-3 align-items-center attribute-row">
                            <Col className="custom-row">
                              <SimpleInputField nameList={[{ noshowerror: true, name: `value[${i}][value]`, title: "Value", require: "true", placeholder: t("EnterValue"), isremovefield: arrayHelpers, values: values, keys: i }]} />
                              <div className="invalid-feedback feedback-right ">
                                <ErrorMessage
                                  name={`value[${i}][value]`}
                                  render={(msg) => (
                                    <div className="invalid-feedback d-block">
                                      {t("Value")} {t("IsRequired")}
                                    </div>
                                  )}
                                />
                              </div>
                            </Col>
                            {values.style == "color" && <SimpleInputField nameList={[{ name: `value[${i}][hex_color]`, type: "color", title: "Value", placeholder: t("EnterValue"), isremovefield: arrayHelpers, values: values, key: i }]} />}
                          </Row>
                        </Fragment>
                      ))}
                      <Col xs="4" className="offset-2">
                        <Btn className="btn-theme" onClick={() => arrayHelpers.push({ value: "" })} title="AddValue" />
                      </Col>
                    </>
                  );
                }}
              />
            </Col>
          </Row>
          <div className="align-items-start value-form">
            <div className="d-flex">
              <FormBtn buttonName={buttonName} loading={loading} />
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default AttributeForm;
