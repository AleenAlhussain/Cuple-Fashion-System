"use client";
import i18next from "i18next";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const HeaderLanguage = () => {
  const { i18n } = useTranslation("common");
  const router = useRouter();
  const currentLanguage = String(i18n.resolvedLanguage || i18n.language || "en").toLowerCase();
  const isArabic = currentLanguage.startsWith("ar");
  const nextLanguage = useMemo(
    () => ({
      code: isArabic ? "en" : "ar",
      label: isArabic ? "English" : "العربية",
    }),
    [isArabic]
  );

  const handleChangeLang = async () => {
    await i18next.changeLanguage(nextLanguage.code);
    router.refresh();
  };

  return (
    <div className="theme-form-select">
      <button
        className="dropdown-toggle select-dropdown language-toggle-button"
        type="button"
        id="select-language"
        onClick={handleChangeLang}
      >
        <span>{nextLanguage.label}</span>
      </button>
    </div>
  );
};

export default HeaderLanguage;
