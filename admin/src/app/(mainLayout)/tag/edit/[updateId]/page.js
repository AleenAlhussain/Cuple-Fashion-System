"use client";

import TagForm from "@/components/tag/TagForm";
import { tag } from "@/utils/axiosUtils/API";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useUpdate from "@/utils/hooks/useUpdate";
import { useParams } from "next/navigation";

const RoleUpdate = () => {
  const params = useParams()
  const { mutate, isLoading } = useUpdate(tag, params?.updateId, `/tag`);
  return (
    params?.updateId && (
      <FormWrapper title="EditTag">
        <TagForm
          mutate={mutate}
          updateId={params?.updateId}
          loading={isLoading}
          type={"product"}
          buttonName="Update"
        />
      </FormWrapper>
    )
  );
};

export default RoleUpdate;
