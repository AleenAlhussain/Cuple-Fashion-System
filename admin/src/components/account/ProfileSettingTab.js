import { Form, Formik } from "formik";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "reactstrap";
import { AllCountryCode } from "../../data/AllCountryCode";
import Btn from "../../elements/buttons/Btn";
import AccountContext from "../../helper/accountContext";
import { updateProfile, verifyEmailChange } from "../../utils/axiosUtils/API";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";
import { getHelperText } from "../../utils/customFunctions/getHelperText";
import useCreate from "../../utils/hooks/useCreate";
import FileUploadField from "../inputFields/FileUploadField";
import SearchableSelectInput from "../inputFields/SearchableSelectInput";
import SimpleInputField from "../inputFields/SimpleInputField";

const ProfileSettingTab = () => {
  const { t } = useTranslation("common");
  const { accountData, setAccountContextData, setAccountData } = useContext(AccountContext);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");

  const { mutate, isLoading } = useCreate(
    
    updateProfile,
    false,
    "/account",
    "No",
    (res) => {
      if (res?.data?.data) {
        setAccountData(res.data.data);
        setAccountContextData({ name: res.data.data?.name || "", image: res.data.data?.profile_image || {} });
        if (res.data.data?.pending_email) {
          setVerificationMessage(res.data?.message || "Verification code sent.");
        }
      }
      if (res?.data?.message) {
        ToastNotification("success", res.data.message);
      }
    },
    false,
    false,
    (err) => {
      setVerificationMessage(err?.response?.data?.message || "Unable to update profile.");
    },
    "put"
  );

  const { mutate: verifyEmailCode, isLoading: isVerifying } = useCreate(
    verifyEmailChange,
    false,
    false,
    "Email verified",
    (res) => {
      if (res?.data?.data) {
        setAccountData(res.data.data);
        setAccountContextData({ name: res.data.data?.name || "", image: res.data.data?.profile_image || {} });
      }
      setVerificationCode("");
      setVerificationMessage("Email verified");
    },
    false,
    false,
    (err) => {
      setVerificationMessage(err?.response?.data?.message || "Verification failed");
    },
    "post"
  );

  const pendingEmail = accountData?.pending_email;
  const pendingExpiresAt = accountData?.pending_email_expires_at;
  const isPending = Boolean(pendingEmail);
  const isExpired = pendingExpiresAt ? new Date(pendingExpiresAt).getTime() < Date.now() : false;

  return (
    <Formik
      enableReinitialize
      initialValues={{
        profile_image_id: accountData ? accountData?.profile_image_id : "",
        profile_image: accountData ? accountData.profile_image : "",
        name: accountData ? accountData.name : "",
        email: accountData ? accountData.email : "",
        phone: accountData ? accountData.phone : "",
        country_code: accountData ? `${accountData?.country_code}` : "91",
      }}
      onSubmit={(values) => {
        const resolvedProfileImageId = values?.profile_image?.id || values?.profile_image_id;
        const payload = {
          name: values.name,
          email: values.email,
          phone: values.phone,
          country_code: values.country_code,
          country_id: values.country_id,
          profile_image_id: resolvedProfileImageId,
        };

        Object.keys(payload).forEach((key) => {
          if (payload[key] === undefined) {
            delete payload[key];
            return;
          }
          if (payload[key] === "undefined") {
            payload[key] = null;
            return;
          }
          if (payload[key] === "") {
            payload[key] = null;
            return;
          }
          if (typeof payload[key] === "number") {
            payload[key] = String(payload[key]);
          }
        });

        if (payload.name === null) {
          delete payload.name;
        } else if (payload.name !== undefined && payload.name !== null) {
          payload.name = String(payload.name);
        }

        if (payload.email === null) {
          delete payload.email;
        }

          // ✅ اكتب الـ console هنا بالضبط
        setVerificationMessage("");
        mutate(payload);
      }}
    >
      {({ values, setFieldValue, errors }) => (
        <Form className="theme-form theme-form-2 mega-form row">
          <FileUploadField name="profile_image_id" uniquename={values?.profile_image} errors={errors} id="profile_image_id" title="Avatar" type="file" values={values} setFieldValue={setFieldValue} helpertext={getHelperText("500x100px")} />
          <SimpleInputField nameList={[{ name: "name", title: "Name", placeholder: t("EnterName") }]} />
          <SimpleInputField nameList={[{ name: "email", title: "Email", placeholder: t("EnterEmail") }]} />
          <div className="country-input mb-4">
            <SimpleInputField nameList={[{ name: "phone", title: "Phone", type: "number" }]} />
            <SearchableSelectInput
              nameList={[
                {
                  name: "country_code",
                  notitle: "true",
                  inputprops: {
                    name: "country_code",
                    id: "country_code",
                    options: AllCountryCode,
                  },
                },
              ]}
            />
          </div>
          <Btn className="btn btn-theme ms-auto d-inline-block w-auto" type="submit" title="Save" loading={Number(isLoading)} />

          {(isPending || verificationMessage) && (
            <div className="mt-4">
              {isPending ? (
                <div className="p-3 border rounded">
                  <div className="fw-semibold">Email not verified</div>
                  <div className="text-muted mb-2">
                    New email pending: {pendingEmail}
                  </div>
                  {isExpired && <div className="text-danger mb-2">Verification code expired. Click Save to resend.</div>}
                  <div className="d-flex gap-2 align-items-end">
                    <div className="flex-grow-1">
                      <label className="form-label">Verification Code</label>
                      <Input
                        type="text"
                        value={verificationCode}
                        maxLength={6}
                        onChange={(event) => {
                          setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                          setVerificationMessage("");
                        }}
                      />
                    </div>
                    <Btn
                      className="btn btn-theme"
                      type="button"
                      title="Verify"
                      loading={Number(isVerifying)}
                      disabled={verificationCode.length !== 6}
                      onClick={() => verifyEmailCode({ code: verificationCode })}
                    />
                  </div>
                  {verificationMessage && <div className="mt-2">{verificationMessage}</div>}
                </div>
              ) : (
                <div className="text-success">{verificationMessage}</div>
              )}
            </div>
          )}
        </Form>
      )}
    </Formik>
  );
};

export default ProfileSettingTab;
