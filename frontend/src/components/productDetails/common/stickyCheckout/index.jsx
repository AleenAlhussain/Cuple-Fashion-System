import { useEffect, useState } from "react";
import ShowProduct from "./ShowProduct";

const normalizeProduct = (productData) => productData?.data ?? productData ?? null;

const StickyCheckout = ({ ProductData, isLoading }) => {
  const normalizedProduct = normalizeProduct(ProductData);
  const firstVariation = normalizedProduct?.variations?.[0] || null;

  const [productState, setProductState] = useState({
    product: normalizedProduct,
    attributeValues: firstVariation?.attribute_values || [],
    productQty: 1,
    selectedVariation: firstVariation,
    variantIds: firstVariation?.attribute_values?.map((av) => av.id) || [],
  });

  useEffect(() => {
    const nextProduct = normalizeProduct(ProductData);
    const nextFirstVariation = nextProduct?.variations?.[0] || null;

    if (nextProduct) {
      setProductState((prev) => ({
        ...prev,
        product: nextProduct,
        productQty: 1,
        selectedVariation: nextFirstVariation,
        attributeValues: nextFirstVariation?.attribute_values || [],
        variantIds: nextFirstVariation?.attribute_values?.map((av) => av.id) || [],
      }));
    }
  }, [ProductData]);

  return (
    <ShowProduct
      productState={productState}
      setProductState={setProductState}
      isLoading={isLoading}
    />
  );
};

export default StickyCheckout;
