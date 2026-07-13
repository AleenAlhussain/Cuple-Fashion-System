"use client";
import Loader from "@/components/commonComponent/Loader";
import { user } from "@/utils/axiosUtils/API";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useUpdate from "@/utils/hooks/useUpdate";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const UserUpdate = () => {
  const params = useParams();
  const { mutate, isLoading } = useUpdate(user, params?.updateId, `/user`, "user updated successfully");
  const UserForm = dynamic(() => import("@/components/user/UserForm").then((mod) => mod.default), {
    loading: () => <Loader />,
    ssr: false,
  });
  return (
    params?.updateId && (
      <FormWrapper title="EditUser">
        <UserForm mutate={mutate} updateId={params?.updateId} loading={isLoading} buttonName="Update" />
      </FormWrapper>
    )
  );
};

export default UserUpdate;
