import TabTitle from "@/components/widgets/TabTitle";
import { Form, Formik } from "formik";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Col, Row } from "reactstrap";
import { GymHomePageSettingTitle } from "@/data/TabTitleList";
import FormBtn from "@/elements/buttons/FormBtn";
import request from "@/utils/axiosUtils";
import { HomePageAPI } from "@/utils/axiosUtils/API";
import useCreate from "@/utils/hooks/useCreate";
import Loader from "@/components/commonComponent/Loader";
import AllTabsGymHomePage from "./AllTabGymHomePage";
import GymHomePageInitialValue from "./gymHomePageFormValues/GymHomePageInitialValue";
import GymHomePageSubmit from "./gymHomePageFormValues/GymHomePageSubmit";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const GymHomePageForm = ({ title, apiData }) => {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState("1");
  const refRefetch = useRef();

  const { data, isLoading } = useCustomQuery([HomePageAPI], () => request({ url: `${HomePageAPI}/gym`, params: { slug: "gym" } }), {
    refetchOnWindowFocus: false,
    select: (res) => res.data,
  });

  const { mutate, isLoading: createLoader } = useCreate(`${HomePageAPI}/${data?.id}`, false, false, false, (resDta) => {
    refRefetch?.current?.call();
  });

  let IncludeList = ["status"];
  let NewSettingsData = data || {};
  const RecursiveSet = ({ data }) => {
    if (data && typeof data == "object") {
      Object.keys(data).forEach((key) => {
        if (data[key] == 0 && IncludeList.includes(key)) {
          data[key] = false;
        } else if (data[key] == 1 && IncludeList.includes(key)) {
          data[key] = true;
        } else {
          RecursiveSet({ data: data[key] });
        }
      });
    }
  };
  RecursiveSet({ data: NewSettingsData });
  if (isLoading) return <Loader />;
  return (
    <Formik
      enableReinitialize
      initialValues={{ ...GymHomePageInitialValue(NewSettingsData) }}
      onSubmit={(values) => {
        values["_method"] = "put";
        GymHomePageSubmit(values, mutate);
      }}
    >
      {({ values, errors, touched, setFieldValue }) => (
        <Col>
          <Card>
            <div className="title-header option-title">
              <h5>{t(title)}</h5>
            </div>
            <Form className="theme-form theme-form-2 mega-form vertical-tabs">
              <Row>
                <Col xl="3" lg="4">
                  <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={GymHomePageSettingTitle} errors={errors} touched={touched} />
                </Col>
                <AllTabsGymHomePage apiData={apiData} activeTab={activeTab} values={values} setFieldValue={setFieldValue} ref={refRefetch} />
                <FormBtn loading={createLoader} />
              </Row>
            </Form>
          </Card>
        </Col>
      )}
    </Formik>
  );
};
export default GymHomePageForm;
