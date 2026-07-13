"use client";
import { useContext, useEffect, useState, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import NextTopLoader from "nextjs-toploader";
import AuthModal from "@/components/auth/authModal";
import Chatbot from "@/components/layout/Chatbot";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useCartState } from "@/states";
import { useThemeColors } from "@/utils/hooks/useThemeColors";
import { usePageTitle } from "@/utils/hooks/usePageTitle";
import { useAuthProtection } from "@/utils/hooks/useAuthProtection";
import TabFocusChecker from "@/utils/customFunctions/TabFocus";
import ExitModal from "./exitModal";
import Footers from "./footer";
import Headers from "./header";
import MobileMenu from "./header/widgets/MobileMenu";
import NewsLetterModal from "./newsLetterModal";
import RecentPurchase from "./recentPurchase";
import TapTop from "./tapTop";
import CelebrationEffect from "@/components/CelebrationEffect";
import { PopupManager } from "@/components/popup";
import GiftBoxManager from "@/components/giftBox/GiftBoxManager";

const DISABLE_META_TITLE = ["product", "blogs", "brand"];

const SubLayout = ({ children }) => {
  const isTabActive = TabFocusChecker();
  const { themeOption, setOpenAuthModal, cartCanvas } = useContext(ThemeOptionContext);

  // Initialize cart from localStorage on mount
  const initCart = useCartState((state) => state.initCart);
  const [makeExitActive, setMakeExitActive] = useState(false);
  
  const path = useSearchParams();
  const theme = path.get("theme");
  const pathName = usePathname();

  // Initialize cart from localStorage on first load
  useEffect(() => {
    initCart();
  }, [initCart]);

  // Auth Protection
  useAuthProtection(pathName, setOpenAuthModal);

  // Theme Colors
  const { primary: themeColor, secondary: themeColor2 } = useThemeColors(theme, themeOption);

  // Apply theme colors to CSS variables
  useEffect(() => {
    if (themeColor) {
      document.body.style.setProperty("--theme-color", themeColor);
    }
    if (themeColor2) {
      document.body.style.setProperty("--theme-color2", themeColor2);
    } else {
      document.body.style.removeProperty("--theme-color2");
    }
  }, [themeColor, themeColor2]);

  // Page Title
  usePageTitle(isTabActive, themeOption, pathName, DISABLE_META_TITLE);

  // Save current path
  useEffect(() => {
    if (typeof window !== "undefined") {
      Cookies.set("currentPath", window.location.pathname + window.location.search);
    }
  }, [pathName, path]);

  // Memoized values
  const isProductPage = useMemo(
    () => pathName?.split("/")[1]?.toLowerCase() === "product",
    [pathName]
  );

  const showFooter = useMemo(() => theme !== "full_page", [theme]);

  // Disabled old newsletter - using new PopupManager instead
  const showNewsLetter = false;
  // const showNewsLetter = useMemo(
  //   () => themeOption?.popup?.news_letter?.is_enable,
  //   [themeOption?.popup?.news_letter?.is_enable]
  // );

  const showExitModal = useMemo(
    () => themeOption?.popup?.exit?.is_enable && makeExitActive,
    [themeOption?.popup?.exit?.is_enable, makeExitActive]
  );

  const showChatbot = pathName === "/";

  return (
    <>
      <Headers />
      {!isProductPage && <MobileMenu />}
      {children}
      <AuthModal />
      {showFooter && <Footers />}
      <NextTopLoader showSpinner={false} />
      <RecentPurchase />
      {showNewsLetter && <NewsLetterModal setMakeExitActive={setMakeExitActive} />}

      {/* Hide floating buttons when cart sidebar is open to prevent overlap */}
      {!cartCanvas && (
        <div className="compare-tap-top-box">
          {showChatbot && <Chatbot />}
          <TapTop />
        </div>
      )}
      <CelebrationEffect />
      <PopupManager />
      <GiftBoxManager />

      {showExitModal && (
        <ExitModal
          dataApi={themeOption?.popup?.exit}
          headerLogo={themeOption?.logo?.header_logo?.original_url}
        />
      )}
    </>
  );
};

export default SubLayout;
