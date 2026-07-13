"use client";
import AttributeForm from "@/components/attribute/AttributeForm";
import { attribute } from "@/utils/axiosUtils/API";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useUpdate from "@/utils/hooks/useUpdate";
import { useParams } from "next/navigation";

const UpdateAttributes = () => {
  const params = useParams();
  const updateId = params?.updateId;
  const { mutate, isLoading } = useUpdate(attribute, updateId, `/attribute`);

  return (
    updateId && (
      <FormWrapper title="EditAttribute">
        <AttributeForm updateId={updateId} mutate={mutate} loading={isLoading} buttonName="Update" />
      </FormWrapper>
    )
  );
};

export default UpdateAttributes;
