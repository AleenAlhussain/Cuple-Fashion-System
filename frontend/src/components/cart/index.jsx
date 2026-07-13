"use client";
import { useCartState } from "@/states";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Loader from "@/layout/loader";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import React, { useContext } from "react";
import WrapperComponent from "../widgets/WrapperComponent";
import CartButtons from "./CartButtons";
import ShowCartData from "./ShowCartData";
import UpsellProducts from "./UpsellProducts";

const CartContent = () => {
  const cart = useCartState((state) => state.cart);
  const { isLoading } = useContext(ThemeOptionContext);

  if (isLoading) return <Loader />;
  return (
    <>
      <Breadcrumbs title={"Cart"} subNavigation={[{ name: "Cart" }]} />
      <WrapperComponent classes={{ sectionClass: "cart-section section-b-space", fluidClass: "container" }} noRowCol={true}>
        <ShowCartData />
        {cart.length > 0 && <CartButtons />}
      </WrapperComponent>
      {cart.length > 0 && <UpsellProducts />}
    </>
  );
};

export default CartContent;
