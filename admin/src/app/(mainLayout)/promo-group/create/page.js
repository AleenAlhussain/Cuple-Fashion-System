"use client";

import PromoGroupForm from "@/components/promoGroup/PromoGroupForm";
import { PromoGroupAPI } from "@/utils/axiosUtils/API";
import FormWrapper from "@/utils/hoc/FormWrapper";
import useCreate from "@/utils/hooks/useCreate";

const PromoGroupCreate = () => {
  const { mutate, isLoading } = useCreate(PromoGroupAPI, false, `/promo-group`);

  return (
    <FormWrapper title="Add Promo Group">
      <PromoGroupForm loading={isLoading} mutate={mutate} buttonName="Save" />
    </FormWrapper>
  );
};

export default PromoGroupCreate;
