"use client";
import Loader from "@/components/commonComponent/Loader";
import { FaqAPI } from "@/utils/axiosUtils/API";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useUpdate from "@/utils/hooks/useUpdate";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const UpdateFaq = () => {
  const FaqForm = dynamic(() => import("@/components/faq/FaqForm").then((mod) => mod.default), {
    loading: () => <Loader />,
    ssr: false,
  });

  const params = useParams();
  const { mutate, isLoading } = useUpdate(FaqAPI, params?.updateId, FaqAPI);
  return (
    params?.updateId && (
      <FormWrapper title="EditFaq">
        <FaqForm mutate={mutate} loading={isLoading} updateId={params?.updateId} buttonName="Update" />
      </FormWrapper>
    )
  );
};

export default UpdateFaq;
