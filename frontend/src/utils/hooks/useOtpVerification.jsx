import { useAuthState } from "@/states";
import CartContext from "@/context/cartContext";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useWishlistState } from "@/states";
import { SyncCart, VerifyTokenAPI } from "@/utils/constants";
import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import request from "../axiosUtils";

import useCreate from "./useCreate";

const transformLocalStorageData = (cartData) => {
  return cartData || [];
};

const LoginWithMobileHandle = (responseData, router, refetch, CallBackUrl, mutate, cartRefetch, setShowBoxMessage, addToWishlist, setOpenAuthModal, setState) => {
  setState("login");
  if (responseData.status === 200 || responseData.status === 201) {
    Cookies.set("uat", responseData.data?.access_token, { path: "/", expires: new Date(Date.now() + 24 * 60 * 6000) });
    if (typeof window !== "undefined") {
      Cookies.set("account", JSON.stringify(responseData.data));
      localStorage.setItem("account", JSON.stringify(responseData.data));
    }

    const oldCartValue = JSON.parse(localStorage.getItem("cart"))?.items;
    oldCartValue?.length > 0 && mutate(transformLocalStorageData(oldCartValue));
    refetch();
    setOpenAuthModal(false);
    cartRefetch();
    router.push("/account/dashboard");
    const wishListID = Cookies.get("wishListID");
    const productObj = { id: wishListID };
    wishListID ? addToWishlist(productObj) : null;
    router.push(`/${CallBackUrl}`);
    Cookies.remove("wishListID");
    localStorage.removeItem("cart");
  } else {
    if (setShowBoxMessage) {
      setShowBoxMessage(responseData.response?.data?.message || responseData.response?.statusText || "Request failed");
    }
  }
};

const useOtpVerification = (setState, setShowBoxMessage) => {
  setTimeout(() => {
    setState("login");
  }, 2000);

  const { setOpenAuthModal } = useContext(ThemeOptionContext);
  const { mutate } = useCreate(SyncCart, false, false, "No");
  const { addToWishlist } = useWishlistState();
  const CallBackUrl = Cookies.get("CallBackUrl") ? Cookies.get("CallBackUrl") : Cookies.set("CallBackUrl", "/");
  const { refetch } = useAuthState();
  const { refetch: cartRefetch } = useContext(CartContext);
  const router = useRouter();
  return useMutation({
    mutationFn: (data) => request({ url: VerifyTokenAPI, method: "post", data }, router),
    onSuccess: (responseData) => LoginWithMobileHandle(responseData, router, refetch, CallBackUrl, mutate, cartRefetch, setShowBoxMessage, addToWishlist, setOpenAuthModal, setState)
  });
};
export default useOtpVerification;
