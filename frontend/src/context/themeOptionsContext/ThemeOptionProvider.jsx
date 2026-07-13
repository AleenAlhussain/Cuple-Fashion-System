"use client";
import React, { useState, useMemo, useEffect } from "react";
import ThemeOptionContext from ".";
import { themeOptionsMockData } from "@/utils/api/themeOptions/themeOptions";
import { normalizeMediaUrlsDeep } from "@/utils/mediaUrl";

const ThemeOptionProvider = (props) => {
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [openOffCanvas, setOpenOffCanvas] = useState(false);
  const [paginationDetails, setPaginationDetails] = useState({});
  const [cartCanvas, setCartCanvas] = useState(false);
  const [mobileSideBar, setMobileSideBar] = useState(false);
  const [accountMobileSideBar, setAccountMobileSideBar] = useState(false);
  const [collectionMobile, setCollectionMobile] = useState(false);
  const [variant, setVariant] = useState("");
  const [themeOption, setThemeOption] = useState(themeOptionsMockData?.options || {});
  const [isLoading, setIsLoading] = useState(true);

  const mergeThemeOptions = (base, incoming) => {
    if (!incoming) return base;
    const merged = { ...base };
    Object.entries(incoming).forEach(([key, value]) => {
      const prevValue = base?.[key];
      const canMergeObjects =
        value && typeof value === "object" && !Array.isArray(value) && prevValue && typeof prevValue === "object" && !Array.isArray(prevValue);

      if (canMergeObjects) {
        merged[key] = mergeThemeOptions(prevValue, value);
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        merged[key] = mergeThemeOptions({}, value);
      } else {
        merged[key] = value;
      }
    });
    return merged;
  };

  // Fetch theme options from backend API
  useEffect(() => {
    const fetchThemeOptions = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_WEBSITE_API_URL || "https://api.cuple.shop/api/website";
        const response = await fetch(`${apiUrl}/theme-options`);
        const data = normalizeMediaUrlsDeep(await response.json());

        const safeJsonParse = (value) => {
          if (typeof value !== "string") return value;
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        };

        if (data?.success && data?.data) {
          // ✅ خذ options من الشكلين المحتملين
          const incomingOptions = data.data?.options ? data.data.options : data.data;

          // ✅ Parse home_highlight_sections لو جاي String
          const highlightObj = safeJsonParse(incomingOptions?.home_highlight_sections);
          const highlightSections = safeJsonParse(highlightObj?.sections);

          const cleanedOptions = {
            ...incomingOptions,
            home_highlight_sections: {
              ...(highlightObj || {}),
              sections: Array.isArray(highlightSections) ? highlightSections : [],
            },
          };

          setThemeOption((prev) => mergeThemeOptions(prev, cleanedOptions));
        }
      } catch (error) {
        console.error("Failed to fetch theme options:", error);
      } finally {
        setIsLoading(false);
      }

    };

    fetchThemeOptions();
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    setVariant,
    variant,
    isLoading,
    openAuthModal,
    setOpenAuthModal,
    themeOption,
    openOffCanvas,
    paginationDetails,
    setPaginationDetails,
    setOpenOffCanvas,
    cartCanvas,
    setCartCanvas,
    mobileSideBar,
    setMobileSideBar,
    accountMobileSideBar,
    setAccountMobileSideBar,
    collectionMobile,
    setCollectionMobile
  }), [
    variant,
    isLoading,
    openAuthModal,
    openOffCanvas,
    paginationDetails,
    cartCanvas,
    mobileSideBar,
    accountMobileSideBar,
    collectionMobile,
    themeOption
  ]);

  return (
    <ThemeOptionContext.Provider value={contextValue}>
      {props.children}
    </ThemeOptionContext.Provider>
  );
};

export default ThemeOptionProvider;
