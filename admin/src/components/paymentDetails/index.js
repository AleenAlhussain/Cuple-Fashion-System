import TabTitle from "@/components/widgets/TabTitle";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TabContent, TabPane } from "reactstrap";
import { PaymentDetailTab } from "../../data/TabTitleList";
import Btn from "../../elements/buttons/Btn";
import request from "../../utils/axiosUtils";
import { PaymentAccount } from "../../utils/axiosUtils/API";
import useCreate from "../../utils/hooks/useCreate";
import BankDetailTab from "./BankDetailTab";
import PaypalTab from "./PaypalTab";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const PaymentDetailsForm = () => {
  const [activeTab, setActiveTab] = useState("1");
  const router = useRouter();
  const {
    data,
    isLoading: getPaymentLoader,
    refetch,
  } = useCustomQuery([PaymentAccount], () => request({ url: PaymentAccount }, router), {
    enabled: false,
    refetchOnWindowFocus: false,
    select: (res) => {
      return res?.data;
    },
  });
  useEffect(() => {
    refetch();
  }, []);
  const { mutate, isLoading } = useCreate(PaymentAccount, false, "/payment_account");
  return (
    <Formik
      enableReinitialize
      initialValues={{
        bank_account_no: data ? data?.bank_account_no : "",
        bank_holder_name: data ? data?.bank_holder_name : "",
        bank_name: data ? data?.bank_name : "",
        paypal_email: data ? data?.paypal_email : "",
        swift: data ? data?.swift : "",
        ifsc: data ? data?.ifsc : "",
        paypal_email: data ? data?.paypal_email : "",
      }}
      onSubmit={(values) => {
        // Put Add Or Update Logic Here
      }}
    >
      {({}) => (
        <Form className="theme-form theme-form-2 mega-form">
          <div className="inside-horizontal-tabs">
            <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={PaymentDetailTab} />
            <TabContent activeTab={activeTab}>
              <TabPane tabId="1">
                <BankDetailTab />
              </TabPane>
              <TabPane tabId="2">
                <PaypalTab />
              </TabPane>
            </TabContent>
          </div>
          <Btn className="btn btn-theme ms-auto mt-4" type="submit" title="Save" loading={Number(isLoading)} />
        </Form>
      )}
    </Formik>
  );
};

export default PaymentDetailsForm;
