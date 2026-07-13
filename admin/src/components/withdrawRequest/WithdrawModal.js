import { Form, Formik } from "formik";
import ShowModal from "../../elements/alerts&Modals/Modal";
import Btn from "../../elements/buttons/Btn";
import { WithdrawRequestAPI } from "../../utils/axiosUtils/API";
import useCreate from "../../utils/hooks/useCreate";
import { YupObject, nameSchema } from "../../utils/validation/ValidationSchemas";
import SearchableSelectInput from "../inputFields/SearchableSelectInput";
import SimpleInputField from "../inputFields/SimpleInputField";

const WithdrawModal = ({ setModal, modal }) => {
  const { mutate, isLoading } = useCreate(WithdrawRequestAPI, false, "/withdraw_request");
  return (
    <ShowModal open={modal} close={true} title={"Withdrawal"} setModal={setModal}>
      <Formik
        initialValues={{
          amount: "",
          payment_type: "",
          message: "",
        }}
        validationSchema={YupObject({
          amount: nameSchema,
          message: nameSchema,
          payment_type: nameSchema,
        })}
        onSubmit={(values) => {
          // Put Your Login Here
        }}
      >
        {({ values }) => (
          <Form>
            <SimpleInputField nameList={[{ name: `amount`, title: "Amount", require: "true", type: "number" }]} />
            <SearchableSelectInput
              nameList={[
                {
                  name: "payment_type",
                  title: "PaymentType",
                  require: "true",
                  inputprops: {
                    name: "payment_type",
                    id: "payment_type",
                    options: [
                      { id: "bank", name: "Bank" },
                      { id: "paypal", name: "Paypal" },
                    ],
                  },
                },
              ]}
            />
            <SimpleInputField nameList={[{ name: `message`, title: "Message", require: "true", type: "textarea" }]} />
            <Btn className="btn btn-theme ms-auto mt-4" type="submit" title="Save" loading={Number(isLoading)} />
          </Form>
        )}
      </Formik>
    </ShowModal>
  );
};

export default WithdrawModal;
