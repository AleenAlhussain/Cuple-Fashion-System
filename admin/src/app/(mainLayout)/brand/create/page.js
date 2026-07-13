'use client'
import BrandForm from "@/components/brand/BrandForm";
import FormWrapper from "@/utils/hoc/FormWrapper";

const CreateBrand = () => {
  return (
    <FormWrapper title="CreateBrand">
      <BrandForm  buttonName="Save"/>
    </FormWrapper>
  );
};

export default CreateBrand;
