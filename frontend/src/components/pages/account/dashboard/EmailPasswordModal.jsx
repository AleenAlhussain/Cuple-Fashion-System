import CustomModal from "@/components/widgets/CustomModal";
import { useAuthState } from "@/states";

import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import useCreate from "@/utils/hooks/useCreate";

const UpdateProfileAPI = "/self";
const UpdateProfilePasswordAPI = "/self/password";
import { YupObject, nameSchema, passwordConfirmationSchema, passwordSchema } from "@/utils/validation/ValidationSchema";
import { Form, Formik } from "formik";
import EmailPasswordForm from "./EmailPasswordForm";
import UpdatePasswordForm from "./UpdatePasswordForm";

const EmailPasswordModal = ({ modal, setModal }) => {
  const { accountData, setAccountData, refetch } = useAuthState();
  const { data, mutate, isLoading, error } = useCreate(modal == "email" ? UpdateProfileAPI : UpdateProfilePasswordAPI, false, false, "Yes", (resDta) => {
    if (resDta.status == 200 || resDta.status == 201) {
      setModal("");
      if (modal == "email") {
        setAccountData((prev) => ({
          ...prev,
          name: resDta?.data?.name,
          country_code: resDta?.data?.country_code,
          phone: resDta?.data?.phone,
        }));
        refetch();
      }
    } else {
      ToastNotification("error", error);
    }
  });

  return (
    <>
      <CustomModal modal={modal == "email" || modal == "password" ? true : false} setModal={setModal} classes={{ modalClass: "theme-modal-2", modalBodyClass: "address-form", title: `${modal == "email" ? "Edit Profile" : "ChangePassword"}` }}>
        <Formik
          initialValues={{
            name: accountData?.name || "",
            email: accountData?.email,
            country_code: accountData?.country_code || "971",
            phone: accountData?.phone || "",
            current_password: "",
            password: "",
            password_confirmation: "",
          }}
          validationSchema={YupObject({
            name: nameSchema,
            country_code: nameSchema,
            phone: nameSchema,
            current_password: modal == "password" && nameSchema,
            password: modal == "password" && passwordSchema,
            password_confirmation: modal == "password" && passwordConfirmationSchema,
          })}
          onSubmit={(values) => {
            if (modal == "password") {
              mutate({
                current_password: values.current_password,
                password: values.password,
                password_confirmation: values.password_confirmation,
              });
            } else {
              const payload = {
                name: values.name,
                country_code: String(values.country_code || ""),
                phone: String(values.phone || ""),
                _method: "PUT",
              };
              if (values.email) {
                payload.email = values.email;
              }
              mutate(payload);
            }
          }}
        >
          <Form>
            {modal == "email" && <EmailPasswordForm  setModal={setModal} />}
            {modal == "password" && <UpdatePasswordForm  setModal={setModal} />}
          </Form>
        </Formik>
      </CustomModal>
    </>
  );
};

export default EmailPasswordModal;
