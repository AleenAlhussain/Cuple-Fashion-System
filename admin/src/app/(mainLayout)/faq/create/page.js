"use client";
import Loader from "@/components/commonComponent/Loader";
import { FaqAPI } from "@/utils/axiosUtils/API";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useCreate from "@/utils/hooks/useCreate";
import dynamic from "next/dynamic";

const CreateFaq = () => {
  const { mutate, isLoading } = useCreate(FaqAPI, false, FaqAPI);
  const FaqForm = dynamic(() => import("@/components/faq/FaqForm").then((mod) => mod.default), {
    loading: () => <Loader />,
    ssr: false,
  });

  return (
    <FormWrapper title="AddFaq">
      <FaqForm mutate={mutate} loading={isLoading} buttonName="Save" />
    </FormWrapper>
  );
};

export default CreateFaq;
