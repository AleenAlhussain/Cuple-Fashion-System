import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import useAxios from "@/utils/api/helpers/useAxios";
import { ForgotPasswordAPI } from "@/utils/constants";
import { YupObject, emailSchema } from "../validation/ValidationSchema";

export const ForgotPasswordSchema = YupObject({ email: emailSchema });

const useHandleForgotPassword = (setShowBoxMessage, setState) => {
  const router = useRouter();
  const axios = useAxios();
  return useMutation({
    mutationFn: (data) => axios({ url: ForgotPasswordAPI, method: "post", data }, router),
    onSuccess: (responseData, requestData) => {
      if (responseData.status === 200 || responseData.status === 201) {
        Cookies.set("ue", requestData.email);
        setState("otp");
      }
    },
    onError: (error) => {
      const message = error?.response?.data?.message;
      setShowBoxMessage(message || "Something went wrong. Please try again.");
    },
  });
};
export default useHandleForgotPassword;
