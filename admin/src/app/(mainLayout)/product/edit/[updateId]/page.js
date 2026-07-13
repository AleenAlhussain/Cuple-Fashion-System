'use client'
import ProductForm from "@/components/product/ProductForm";
import { product } from "@/utils/axiosUtils/API";
import useCreate from "@/utils/hooks/useCreate";
import { useParams } from "next/navigation";
import { useState } from "react";

const UpdateProduct = () => {
  const params  = useParams()
  const [resetKey, setResetKey] = useState(false)
  const [saveButton, setSaveButton] = useState(false)
  const { mutate, isLoading } = useCreate(product, params?.updateId, !saveButton ? product : false, false, (resDta) => {
    if (resDta?.status == 200 || resDta?.status == 201) {
      setResetKey(true)
    }
  });

  return (
    params?.updateId && (
      <ProductForm saveButton={saveButton} setSaveButton={setSaveButton} values={mutate} mutate={mutate} updateId={params?.updateId} loading={isLoading} title={"EditProduct"} key={resetKey}  buttonName="Update"/>
    )
  );
};

export default UpdateProduct;
