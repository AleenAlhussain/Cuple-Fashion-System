import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { Href } from "@/utils/constants";
import React, { useContext, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RiCloseFill } from "react-icons/ri";
import HeaderCartBottom from "./HeaderCartBottom";

const FREE_SHIPPING_CONFETTI_SESSION_KEY = "cart_free_shipping_confetti_shown";

const HeaderCartData = () => {
  const { themeOption, setCartCanvas, cartCanvas } = useContext(ThemeOptionContext);
  const { settingData } = useSettings();
  const cart = useCartState((state) => state.cart);
  const getTotal = useCartState((state) => state.getTotal);
  const { t } = useTranslation("common");
  const [mounted, setMounted] = useState(false);
  const [shippingCal, setShippingCal] = useState(0);
  const [shippingFreeAmt, setShippingFreeAmt] = useState(0);
  const [confetti, setConfetti] = useState(0);
  const [hasShownFreeShippingConfetti, setHasShownFreeShippingConfetti] = useState(false);
  const confettiTimeoutRef = useRef(null);
  const confettiItems = Array.from({ length: 150 }, (_, index) => index);
  const [modal, setModal] = useState(false);
  const [cartStyle, setCartStyle] = useState("");

  useEffect(() => {
    setMounted(true);
    if (sessionStorage.getItem(FREE_SHIPPING_CONFETTI_SESSION_KEY) === "1") {
      setHasShownFreeShippingConfetti(true);
    }
  }, []);

  useEffect(() => {
    setCartStyle(themeOption?.general?.cart_style);
    const handleResize = () => {
      if (window.innerWidth < 761) {
        setCartStyle("cart_side");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      setCartStyle(themeOption?.general?.cart_style);
    };
  }, [themeOption]);

  useEffect(() => {
    setShippingFreeAmt(settingData?.general?.min_order_free_shipping);
    cart?.forEach((elem) => {
      if (elem?.variation) {
        elem.variation.selected_variation = elem?.variation?.attribute_values?.map((values) => values.value).join("/");
      }
    });
  }, [cart, settingData]);

  useEffect(() => {
    const total = getTotal(cart);

    const shippingFreeAmount = settingData?.general?.min_order_free_shipping || shippingFreeAmt;
    if (!shippingFreeAmount) return;

    const tempCal = (total * 100) / shippingFreeAmount;
    const hasReachedFreeShipping = tempCal >= 100;

    if (hasReachedFreeShipping) {
      setShippingCal(100);

      if (!hasShownFreeShippingConfetti && cartCanvas) {
        setConfetti(1);
        setHasShownFreeShippingConfetti(true);

        if (typeof window !== "undefined") {
          sessionStorage.setItem(FREE_SHIPPING_CONFETTI_SESSION_KEY, "1");
        }

        if (confettiTimeoutRef.current) {
          clearTimeout(confettiTimeoutRef.current);
        }

        confettiTimeoutRef.current = setTimeout(() => {
          setConfetti(2);
          confettiTimeoutRef.current = null;
        }, 3000);
      }

      return;
    }

    setShippingCal(tempCal);
    setConfetti(0);
  }, [settingData, shippingFreeAmt, cart, getTotal, hasShownFreeShippingConfetti, cartCanvas]);

  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("cart-open", Boolean(cartCanvas));

    return () => {
      document.body.classList.remove("cart-open");
    };
  }, [cartCanvas]);

  return (
    <>
      <div id="cart_side" className={`${cartCanvas ? "open-side" : ""} ${cartStyle === "cart_mini" ? "show-div shopping-cart" : "add_to_cart right right-cart-box"}`}>
        <a href={Href} className="overlay" onClick={() => setCartCanvas(false)} />
        <div className="cart-inner">
          <div className="cart_top">
            <h3>
              {t("MyCart")} <span>{`(${mounted ? cart?.length : 0})`}</span>
            </h3>
            <div className="close-cart" onClick={() => setCartCanvas(false)}>
              <a href={Href}>
                <RiCloseFill />
              </a>
            </div>
          </div>
          <HeaderCartBottom modal={modal} setModal={setModal} shippingCal={shippingCal} shippingFreeAmt={shippingFreeAmt} />
        </div>
        {themeOption?.general?.celebration_effect && confetti === 1 && cartCanvas && (
          <div className="confetti-wrapper show">
            {confettiItems.map((elem, i) => (
              <div className={`confetti-${elem}`} key={i}></div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default HeaderCartData;
