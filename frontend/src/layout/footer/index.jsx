"use client";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useSearchParams } from "next/navigation";
import React, { useContext, useMemo } from "react";
import FooterFour from "./footerFour";
import FooterThree from "./footerThree";
import FooterTwo from "./footerTwo";
import FooterOne from "./footerOne";

const FOOTER_ONE_THEMES = new Set([
  "fashion_three",
  "furniture_one",
  "surfboard",
  "yoga",
  "furniture_two",
  "fashion_four",
  "fashion_five",
  "fashion_seven",
  "furniture_dark",
  "electronics_one",
  "electronics_two",
  "marketplace_one",
  "marketplace_four",
  "vegetables_one",
  "vegetables_two",
  "jewellery_two",
  "vegetables_three",
  "vegetables_four",
  "jewellery_three",
  "watch",
  "medical",
  "kids",
  "books",
  "beauty",
  "left_sidebar",
  "goggles",
  "video_slider",
  "flower",
  "perfume",
  "gradient",
]);

const FOOTER_TWO_THEMES = new Set([
  "fashion_two",
  "single_product",
  "fashion_six",
  "bag",
  "marijuana",
  "game",
  "shoes",
  "jewellery_one",
]);

const FOOTER_THREE_THEMES = new Set([
  "fashion_one",
  "video",
  "full_page",
  "electronics_three",
  "marketplace_three",
  "bicycle",
  "marketplace_two",
  "pets",
  "nursery",
]);

const FOOTER_FOUR_THEMES = new Set(["christmas", "tools", "gym", "digital_download"]);

const resolveFooterStyle = (theme, defaultStyle) => {
  if (theme) {
    if (FOOTER_ONE_THEMES.has(theme)) return "footer_one";
    if (FOOTER_TWO_THEMES.has(theme)) return "footer_two";
    if (FOOTER_THREE_THEMES.has(theme)) return "footer_three";
    if (FOOTER_FOUR_THEMES.has(theme)) return "footer_four";
  }
  return defaultStyle || "footer_one";
};

const Footers = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const path = useSearchParams();
  const theme = path.get("theme");

  const style = useMemo(
    () => resolveFooterStyle(theme, themeOption?.footer?.footer_style),
    [theme, themeOption?.footer?.footer_style]
  );

  const renderFooter = () => {
    switch (style) {
      case "footer_two":
        return <FooterTwo />;
      case "footer_three":
        return <FooterThree />;
      case "footer_four":
        return <FooterFour />;
      case "footer_one":
      default:
        return <FooterOne />;
    }
  };

  return (
    <>
      {renderFooter()}
    </>
  );
};

export default Footers;
