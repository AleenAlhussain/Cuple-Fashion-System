"use client";
import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import React, { useEffect, useMemo } from "react";
import { I18nextProvider as Provider, initReactI18next } from "react-i18next";
import { getOptions, isRtlLanguage } from "./settings";

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(resourcesToBackend((language, namespace) => import(`./locales/${language}/${namespace}.json`)))
  .init({
    ...getOptions(),
    detection: {
      caches: ["cookie"],
    },
  });

function syncRtl(lng) {
  const rtl = isRtlLanguage(lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = rtl ? "rtl" : "ltr";
  if (rtl) {
    document.body.classList.add("rtl");
  } else {
    document.body.classList.remove("rtl");
  }
}

export function I18nProvider({ children, language }) {
  useMemo(() => {
    i18next.changeLanguage(language);
  }, []);

  useEffect(() => {
    syncRtl(language);
    i18next.on("languageChanged", syncRtl);
    return () => {
      i18next.off("languageChanged", syncRtl);
    };
  }, []);

  return <Provider i18n={i18next}>{children}</Provider>;
}
