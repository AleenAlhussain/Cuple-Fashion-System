import ThemeOptionContext from "@/context/themeOptionsContext";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";

const FooterAbout = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { i18n } = useTranslation("common");
  const isArabic = i18n.language === "ar";
  const footerAbout = isArabic
    ? themeOption?.footer?.footer_about_ar || themeOption?.footer?.footer_about
    : themeOption?.footer?.footer_about;

  return <p>{footerAbout}</p>;
};

export default FooterAbout;
