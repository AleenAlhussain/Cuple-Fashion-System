import { usePathname, useRouter } from "next/navigation";
import request from "../axiosUtils";
import SuccessHandle from "../customFunctions/SuccessHandle";
import useCustomMutation from "./useCustomMutation";

const useUpdate = (url, updateId, path, message, extraFunction) => {
  const router = useRouter();
  const pathname = usePathname();
  return useCustomMutation((data) => request({ url: `${url}/${Array.isArray(updateId) ? updateId.join("/") : updateId}`, method: "put", data },router), {
    onSuccess: (resData) => {
      SuccessHandle(resData, router, path, message, pathname);
      extraFunction && extraFunction(resData);
    },
  });
};
export default useUpdate;
