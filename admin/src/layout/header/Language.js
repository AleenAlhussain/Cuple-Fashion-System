import i18next from "i18next";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const Language = () => {
  const { i18n } = useTranslation("common");
  const currentLanguage = String(i18n.resolvedLanguage || i18n.language || "en").toLowerCase();
  const isArabic = currentLanguage.startsWith("ar");
  const router = useRouter();
  const nextLanguage = useMemo(
    () => ({
      code: isArabic ? "en" : "ar",
      label: isArabic ? "English" : "العربية",
    }),
    [isArabic]
  );

  const handleChangeLang = () => {
    i18next.changeLanguage(nextLanguage.code);
    router.refresh();
  };

  return (
    <li className="profile-nav">
      <button type="button" className="language-toggle-button" onClick={handleChangeLang}>
        {nextLanguage.label}
      </button>
    </li>
  );
};

export default Language;
