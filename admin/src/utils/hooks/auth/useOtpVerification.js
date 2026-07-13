import { useRouter } from "next/navigation";
import request from "../../axiosUtils";
import { verifyToken } from "../../axiosUtils/API";
import { ToastNotification } from "../../customFunctions/ToastNotification";
import Cookies from "js-cookie";
import useCustomMutation from "../useCustomMutation";

const useOtpVerification = (setShowBoxMessage) => {
  const router = useRouter();
  return useCustomMutation((data) => request({ url: verifyToken, method: "post", data },router), {
    onSuccess: (responseData, requestData) => {
      if (responseData.status === 200) {
        Cookies.set('uo', requestData?.token)
        router.push("/auth/update-password");
        ToastNotification("success", responseData.data.message);
      } else {
        setShowBoxMessage(responseData.response.data.message);
      }
    },
  });
};
export default useOtpVerification;
