import { useCartState } from "@/states";
import ThemeOptionContext from "@/context/themeOptionsContext";
import React, { useContext, useState, useEffect } from "react";
import { RiShoppingCartLine } from "react-icons/ri";
import HeaderCartData from "./HeaderCartData";

const HeaderCart = () => {
  const { setCartCanvas } = useContext(ThemeOptionContext);
  const { cart } = useCartState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <span className="header-cart-trigger" onClick={() => setCartCanvas(true)}>
        <RiShoppingCartLine />
        {mounted && cart?.length > 0 && <span className="cart_qty_cls ">{cart?.length}</span>}
      </span>
      <HeaderCartData />
    </>
  );
};

export default HeaderCart;
