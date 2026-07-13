"use client";
import ProductForm from "@/components/product/ProductForm";
import { product } from "@/utils/axiosUtils/API";
import useCreate from "@/utils/hooks/useCreate";
import { useState } from "react";

const ProductCreate = () => {
  const [resetKey, setResetKey] = useState(false);
  const { mutate, isLoading } = useCreate(product, false, product, false, (resDta) => {
    if (resDta?.status == 200 || resDta?.status == 201) {
      setResetKey(true);
    }
  });
  return <ProductForm values={resetKey} mutate={mutate} loading={isLoading} title={"AddProduct"} key={resetKey} buttonName="Save" />;
};

export default ProductCreate;
