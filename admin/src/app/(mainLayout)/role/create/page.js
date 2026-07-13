"use client";
import Loader from "@/components/commonComponent/Loader";
import FormWrapper from "@/utils/hoc/FormWrapper";
import dynamic from "next/dynamic";

const Role = () => {
  const PermissionForm = dynamic(() => import("@/components/role/PermissionForm").then((mod) => mod.default), {
    loading: () => <Loader />,
    ssr: false,
  });
  return (
    <FormWrapper title="AddRole">
      <PermissionForm buttonName="Save" />
    </FormWrapper>
  );
};

export default Role;
