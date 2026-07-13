import { useSettings } from "@/utils/hooks/useSettings";
import Btn from "@/elements/buttons/Btn";
import { useRouter } from "next/navigation";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import { Input, InputGroup } from "reactstrap";
import ProductWholesale from "./ProductWholesale";
import { useCartState } from "@/states";

const ProductDetailAction = ({
  productState,
  setProductState,
  extraOption,
  isDisplay = true,
}) => {
  const { t } = useTranslation("common");
  const { addToCart: addToCartState, updateQuantity } = useCartState();
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const [totalPrice, settotalPrice] = useState(0);
  const router = useRouter();

  // Helper to get stock quantity - supports both quantity and stock_quantity fields
  const getStockQty = (item) => item?.quantity ?? item?.stock_quantity ?? 0;

  const addToCart = () => {
    addToCartState(productState?.product, productState?.productQty);
  };
  const buyNow = () => {
    addToCartState(productState?.product, productState?.productQty);
    router.push(`/checkout`);
  };
  const updateQty = (qty) => {
    if (1 > productState?.productQty + qty) return;
    setProductState((prev) => {
      return { ...prev, productQty: productState?.productQty + qty };
    });
    checkStockAvailable();
    wholesalePriceCal();
  };
  const checkStockAvailable = () => {
    if (productState?.selectedVariation) {
      setProductState((prevState) => {
        const tempSelectedVariation = { ...prevState.selectedVariation };
        const stockQty = getStockQty(tempSelectedVariation);
        tempSelectedVariation.stock_status =
          stockQty < prevState.productQty
            ? "out_of_stock"
            : "in_stock";
        return {
          ...prevState,
          selectedVariation: tempSelectedVariation,
        };
      });
    } else {
      setProductState((prevState) => {
        const tempProduct = { ...prevState.product };
        const stockQty = getStockQty(tempProduct);
        tempProduct.stock_status =
          stockQty < prevState.productQty
            ? "out_of_stock"
            : "in_stock";
        return {
          ...prevState,
          product: tempProduct,
        };
      });
    }
  };

  const wholesalePriceCal = () => {
    let wholesale =
      productState?.product?.wholesales?.find(
        (value) =>
          value?.min_qty <= productState?.productQty &&
          value?.max_qty >= productState?.productQty
      ) || null;

    if (wholesale && productState?.product.wholesale_price_type == "fixed") {
      setProductState((prev) => {
        return { ...prev, totalPrice: prev?.productQty * wholesale.value };
      });
    } else if (
      wholesale &&
      productState?.product.wholesale_price_type == "percentage"
    ) {
      setProductState((prev) => {
        return {
          ...prev,
          totalPrice:
            prev?.productQty *
            (prev?.selectedVariation
              ? prev?.selectedVariation.sale_price
              : prev?.product.sale_price),
        };
      });
      setProductState((prev) => {
        return {
          ...prev,
          totalPrice:
            prev?.totalPrice - prev?.totalPrice * (wholesale.value / 100),
        };
      });
    } else {
      setProductState((prev) => {
        return {
          ...prev,
          totalPrice:
            prev?.productQty *
            (prev?.selectedVariation
              ? prev?.selectedVariation?.price
              : prev?.product?.price),
        };
      });
    }
  };

  useEffect(() => {
    wholesalePriceCal();
  }, [totalPrice]);
  return (
    <>
      {productState?.product?.wholesales?.length ? (
        <>
          <ProductWholesale productState={productState} />
          <h4>
            {t("TotalPrice")}:{" "}
            <span className="theme-color">
              {convertCurrency(productState?.totalPrice)}
            </span>
          </h4>
        </>
      ) : null}

      {isDisplay && (
        <div>
          <div className="qty-section">
            <div className="cart_qty qty-box product-qty">
              <InputGroup>
                <span className="input-group-prepend">
                  <Btn
                    className=" quantity-left-minus"
                    id="quantity-left-minus18"
                    type="submit"
                    onClick={() => updateQty(-1)}
                  >
                    <RiArrowLeftSLine />
                  </Btn>
                </span>
                <Input
                  className="input-number"
                  type="number"
                  value={productState?.productQty}
                  readOnly
                />
                <span className="input-group-prepend">
                  <Btn
                    type="submit"
                    className=" quantity-left-plus"
                    id="quantity-left-plus18"
                    onClick={() => updateQty(1)}
                  >
                    <RiArrowRightSLine />
                  </Btn>
                </span>
              </InputGroup>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductDetailAction;
