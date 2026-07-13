import ThemeOptionContext from "@/context/themeOptionsContext";
import { useAuthState, useCartState, useWishlistState } from "@/states";
import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { YupObject, emailSchema, passwordSchema, recaptchaSchema } from "../validation/ValidationSchema";
import useAxios from "@/utils/api/helpers/useAxios";

export const LogInSchema = YupObject({
  email: emailSchema,
  password: passwordSchema,
  recaptcha: recaptchaSchema,
});

const LoginHandle = (responseData, router, login, initCart, initWishlist, CallBackUrl, setShowBoxMessage, setOpenAuthModal) => {
  if (responseData.status === 200 || responseData.status === 201) {
    // API returns { success: true, data: { user, access_token, ... } }
    const apiData = responseData.data;
    const userData = apiData?.data || apiData;

    // Set cookies
    Cookies.set("uat", userData?.access_token, { path: "/", expires: new Date(Date.now() + 24 * 60 * 60 * 1000) }); // 24 hours

    if (typeof window !== "undefined") {
      Cookies.set("account", JSON.stringify(userData));
      localStorage.setItem("account", JSON.stringify(userData));
    }

    // Update auth state
    login({
      token: userData?.access_token,
      user: userData?.user || userData,
      role: userData?.user?.role || userData?.role
    });

    // Initialize stores
    initCart();
    initWishlist();

    Cookies.remove("wishListID");
    // Clear auth toast cookie to prevent showing "Unauthenticated" after login
    Cookies.remove("showAuthToast");

    setOpenAuthModal(false);
    router.push(`${CallBackUrl}`);
  } else {
    setShowBoxMessage(responseData.response?.data?.message || "Login failed");
  }
};

const useHandleLogin = (setShowBoxMessage) => {
  const { setOpenAuthModal } = useContext(ThemeOptionContext);
  const { login } = useAuthState();
  const { initCart } = useCartState();
  const { initWishlist } = useWishlistState();
  const axios = useAxios();
  const CallBackUrl = Cookies.get("CallBackUrl") ? Cookies.get("CallBackUrl") : "/account/dashboard";
  const router = useRouter();
  
  return useMutation({
    mutationFn: (data) => axios.post("/website/login", data),
    onSuccess: (responseData) => LoginHandle(
      responseData,
      router,
      login,
      initCart,
      initWishlist,
      CallBackUrl,
      setShowBoxMessage,
      setOpenAuthModal
    ),
    onError: (error) => {
      // Handle API error responses
      const errorMessage = error?.response?.data?.message
        || error?.response?.data?.errors?.email?.[0]
        || error?.message
        || "Login failed. Please check your credentials.";
      setShowBoxMessage(errorMessage);
    }
  });
};

export default useHandleLogin;
