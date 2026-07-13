import { Form, Formik } from 'formik';
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Btn from '../../elements/buttons/Btn';
import { updateProfilePassword } from '../../utils/axiosUtils/API';
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";
import useCreate from '../../utils/hooks/useCreate';
import SimpleInputField from '../inputFields/SimpleInputField';

const ProfilePasswordTab = () => {
    
    const { t } = useTranslation( 'common');
    const [errorMessage, setErrorMessage] = useState("");
    const { mutate, isLoading } = useCreate(
        updateProfilePassword,
        false,
        "/account",
        "No",
        (res) => {
            const message = res?.data?.message || "Password updated successfully.";
            setErrorMessage("");
            ToastNotification("success", message);
        },
        false,
        false,
        (err) => {
            const errors = err?.response?.data?.errors || {};
            const firstError = Object.values(errors)[0]?.[0];
            const message = err?.response?.data?.message || firstError || "Unable to update password.";
            setErrorMessage(message);
            ToastNotification("error", message);
        },
        "put"
    );
    return (
        <Formik
            enableReinitialize
            initialValues={{
                password: "",
                password_confirmation: ""
            }}
            onSubmit={(values) => {
                setErrorMessage("");
                mutate(values);
            }}>
            {() => (
                <Form className="theme-form theme-form-2 mega-form">
                    <SimpleInputField nameList={[{ name: 'password', title: 'Password', placeholder: t("EnterNewPassword"), type:'password' }, { name: 'password_confirmation', title: 'Confirm Password', placeholder: t("EnterConfirmPassword"), type:'password' }]} />
                    {errorMessage && <div className="text-danger mt-2">{errorMessage}</div>}
                    <Btn className="btn btn-theme ms-auto mt-4" type="submit" title="Save" loading={Number(isLoading)} />
                </Form>
            )}
        </Formik>
    )
}

export default ProfilePasswordTab
