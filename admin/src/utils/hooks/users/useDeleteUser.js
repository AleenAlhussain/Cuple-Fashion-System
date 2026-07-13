import request from "../../axiosUtils";
import { user } from "../../axiosUtils/API";
import { useRouter } from "next/navigation";
import useCustomMutation from "../useCustomMutation";

const useDeleteRole = () => {
  const router = useRouter();
  return useCustomMutation((deleteId) => request({ url: `${user}/${deleteId}`, method: "delete" },router));
};

export default useDeleteRole;
