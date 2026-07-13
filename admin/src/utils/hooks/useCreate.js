import { usePathname, useRouter } from "next/navigation";
import request from "../axiosUtils";
import SuccessHandle from "../customFunctions/SuccessHandle";
import { ToastNotification } from "../customFunctions/ToastNotification";
import useCustomMutation from "./useCustomMutation";

const useCreate = (url, updateId, path = false, message, extraFunction, notHandler, responseType, errFunction, method = "post") => {
  const router = useRouter();
  const pathname = usePathname();
  return useCustomMutation((data) => request({ url: updateId ? `${url}/${Array.isArray(updateId) ? updateId.join("/") : updateId}` : url, data, method, responseType: responseType ? responseType : "" }, router), {
    onSuccess: (resDta) => {
      if (resDta?.response?.data?.success === !true) {
        ToastNotification("error", resDta?.response?.data?.message);
      } else {
        !notHandler && SuccessHandle(resDta, router, path, message, pathname);
        extraFunction && extraFunction(resDta);
      }
    },
    onError: (err) => {
      errFunction && errFunction(err);
      return err;
    },
  });
};

export default useCreate;
