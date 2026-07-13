"use client";

import PromoGroupForm from "@/components/promoGroup/PromoGroupForm";
import { PromoGroupAPI } from "@/utils/axiosUtils/API";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useUpdate from "@/utils/hooks/useUpdate";
import { useParams } from "next/navigation";

const PromoGroupUpdate = () => {
  const params = useParams();
  const { mutate, isLoading } = useUpdate(PromoGroupAPI, params?.updateId, `/promo-group`);

  return (
    params?.updateId && (
      <FormWrapper title="Edit Promo Group">
        <PromoGroupForm
          mutate={mutate}
          updateId={params?.updateId}
          loading={isLoading}
          buttonName="Update"
        />
      </FormWrapper>
    )
  );
};

export default PromoGroupUpdate;
