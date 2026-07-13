import { useQueryClient } from "@tanstack/react-query";
import request from "../axiosUtils";
import SuccessHandle from "../customFunctions/SuccessHandle";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import useCustomMutation from "./useCustomMutation";

const useDelete = (url, refetch, extraFunction) => {
  
  const { t } = useTranslation("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  return useCustomMutation(
    (deleteId) => request({ url: `${url}/${deleteId}`, method: "delete" },router),
    {
      onSuccess: (resData) => {
        SuccessHandle(resData, false, false, t("DeletedSuccessfully"));
        refetch && queryClient.invalidateQueries({ queryKey: [refetch] });
        extraFunction && extraFunction(resData);
      },
    }
  );
};

export default useDelete;
