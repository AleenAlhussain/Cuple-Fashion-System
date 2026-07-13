import { useRouter } from "next/navigation";
import { useCookies } from "react-cookie";
import request from "../../axiosUtils";
import { updatePassword } from "../../axiosUtils/API";
import { ToastNotification } from "../../customFunctions/ToastNotification";
import { passwordConfirmationSchema, passwordSchema, YupObject } from "../../validation/ValidationSchemas";
import useCustomMutation from "../useCustomMutation";

export const UpdatePasswordSchema = YupObject({ password: passwordSchema, password_confirmation: passwordConfirmationSchema });

const useUpdatePassword = () => {
  const [cookies, setCookie, removeCookie] = useCookies(["uo", "ue"]);
  const router = useRouter();
  return useCustomMutation(
    (data) =>
      request({
        url: updatePassword,
        method: "post",
        data: { ...data, token: cookies.uo, email: cookies.ue },
      },router),
    {
      onSuccess: (resData) => {
        router.push("/auth/login");
        removeCookie("uo", { path: "/" });
        removeCookie("ue", { path: "/" });
        ToastNotification("success", "Your password has been changed successfully. Use your new password to log in.");
      },
    },
  );
};
export default useUpdatePassword;
