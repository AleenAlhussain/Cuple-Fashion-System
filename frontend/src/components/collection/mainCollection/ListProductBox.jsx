import ProductBox11 from "@/components/widgets/productBox/ProductBox11";
import ProductBox2 from "@/components/widgets/productBox/ProductBox2";
import React, { useEffect, useState } from "react";

const ListProductBox = ({ product, productBox, isOpen }) => {
  const [productState, setProductState] = useState({
    product: product,
    attributeValues: [],
    productQty: 1,
    selectedVariation: "",
    variantIds: [],
    statusIds: [],
  });
  useEffect(() => {
    if (product) {
      setProductState({ ...productState, product: product });
    }
  }, [product, isOpen]);

  return (
    <>
      {productBox == 2 ? (
        <ProductBox2
          productState={productState}
          setProductState={setProductState}
        />
      ) : (
        <ProductBox11
          productState={productState}
          setProductState={setProductState}
        />
      )}
    </>
  );
};

export default ListProductBox;
