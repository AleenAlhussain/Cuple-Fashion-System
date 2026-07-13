import { useRouter } from "next/navigation";
import request from "../../axiosUtils";
import { forgotPassword } from "../../axiosUtils/API";
import { emailSchema, YupObject } from "../../validation/ValidationSchemas";
import Cookies from "js-cookie";
import useCustomMutation from "../useCustomMutation";

export const ForgotPasswordSchema = YupObject({ email: emailSchema });

const useHandleForgotPassword = (setShowBoxMessage) => {
    const router = useRouter();
    return useCustomMutation(
        (data) => request({ url: forgotPassword, method: "post", data }, router),
        {
            onSuccess: (responseData, requestData) => {
                if (responseData.status === 200 || responseData.status === 201) {
                    Cookies.set("ue", requestData?.email);
                    router.push("/auth/otp-verification");
                }
            },
            onError: (error) => {
                const message = error?.response?.data?.message;
                setShowBoxMessage({ type: "error", message: message || "Something went wrong." });
            },
        }
    );
};

export default useHandleForgotPassword;
