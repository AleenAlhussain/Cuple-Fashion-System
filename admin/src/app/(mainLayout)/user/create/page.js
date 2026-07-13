"use client";
import Loader from "@/components/commonComponent/Loader";
import { checkPermission } from "@/components/common/CheckPermissionList";
import { user } from "@/utils/axiosUtils/API";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useCreate from "@/utils/hooks/useCreate";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const AddNewUser = () => {
  const UserForm = dynamic(() => import("@/components/user/UserForm").then((mod) => mod.default), {
    loading: () => <Loader />,
    ssr: false,
  });
  const { mutate, isLoading } = useCreate(user, false, `/user`);
  const hasUserCreatePermission = useMemo(() => checkPermission("user.create"), []);

  if (!hasUserCreatePermission) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="p-4 text-center">
            <div className="fw-semibold text-danger fs-4 mb-2">
              Permission Required
            </div>
            <div className="text-muted small fs-6">
              This section is available to administrators only.
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <FormWrapper title="AddUser">
      <UserForm mutate={mutate} loading={isLoading} buttonName="Save User" />
    </FormWrapper>
  );
};

export default AddNewUser;
