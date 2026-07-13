"use client";
import TagForm from "@/components/tag/TagForm";
import { tag } from "@/utils/axiosUtils/API";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useCreate from "@/utils/hooks/useCreate";

const TagsCreate = () => {
  
  const { mutate, isLoading } = useCreate(tag, false, `/tag`);
  return (
    <FormWrapper title="AddTag">
      <TagForm loading={isLoading} mutate={mutate} type={"product"} buttonName="Save"/>
    </FormWrapper>
  );
};

export default TagsCreate;
