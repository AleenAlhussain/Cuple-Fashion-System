"use client";
import Loader from "@/components/commonComponent/Loader";
import FormWrapper from "@/utils/hoc/FormWrapper";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import useUpdate from "@/utils/hooks/useUpdate";
import { PagesAPI } from "@/utils/axiosUtils/API";

const UpdatePage = () => {
  const params = useParams();
  const updateId = params?.updateId;
  const { mutate, isLoading } = useUpdate(PagesAPI, updateId, "/page");
  const PageForm = dynamic(() => import("@/components/pages/PageForm").then((mod) => mod.default), {
    loading: () => <Loader />,
    ssr: false,
  });
  return (
    updateId && (
      <FormWrapper title="UpdatePage">
        <PageForm updateId={updateId} mutate={mutate} loading={isLoading} buttonName="Update" />
      </FormWrapper>
    )
  );
};

export default UpdatePage;
