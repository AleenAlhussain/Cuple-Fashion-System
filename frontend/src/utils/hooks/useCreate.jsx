import { useMutation } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import useAxios from "@/utils/api/helpers/useAxios";
import SuccessHandle from "../customFunctions/SuccessHandle";

const useCreate = (url, updateId, path = false, message, extraFunction, notHandler, setCouponError, refetch, setShowBoxMessage, responseType, errFunction) => {
  const router = useRouter();
  const pathName = usePathname();
  const axios = useAxios();
  
  return useMutation({
    mutationFn: (data) => {
      const finalUrl = updateId ? `${url}/${Array.isArray(updateId) ? updateId.join("/") : updateId}` : url;
      const config = {
        responseType: responseType || "json",
      };
      if (data instanceof FormData) {
        config.headers = {
          "Content-Type": "multipart/form-data",
        };
      }
      return axios.post(finalUrl, data, config);
    },
    onSuccess: (resDta) => {
      !notHandler && SuccessHandle(resDta, router, path, message, setCouponError, pathName, setShowBoxMessage);
      extraFunction && extraFunction(resDta);
      refetch && refetch();
    },
    onError: (err) => {
      errFunction && errFunction(err);
      setShowBoxMessage && setShowBoxMessage(err);
      return err;
    },
  });
};

export default useCreate;
