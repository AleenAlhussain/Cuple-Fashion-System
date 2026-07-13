'use client'

import StoreForm from "@/components/store/StoreForm";
import { store } from "@/utils/axiosUtils/API";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useCreate from "@/utils/hooks/useCreate";
import { useParams } from "next/navigation";

const StoreUpdate = () => {
  const params = useParams()
  const { mutate, isLoading } = useCreate(store, params?.updateId, "/store");
  return (
    params?.updateId && (
      <FormWrapper title="EditStore">
        <StoreForm mutate={mutate} updateId={params?.updateId} loading={isLoading} buttonName="Update" />
      </FormWrapper>
    )
  );
};

export default StoreUpdate;
