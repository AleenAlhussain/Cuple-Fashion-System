import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

const AboutUsText = () => {
  const { i18n } = useTranslation("common");
  const { themeOption } = useContext(ThemeOptionContext);
  const isArabic = i18n.language === "ar";
  const title = isArabic ? themeOption?.about_us?.about?.title_ar || themeOption?.about_us?.about?.title : themeOption?.about_us?.about?.title;
  const description = isArabic ? themeOption?.about_us?.about?.description_ar || themeOption?.about_us?.about?.description : themeOption?.about_us?.about?.description;

  return (
    <div className="mt-4">
      <h3>{title}</h3>
      {description ? (
        <div
          className={`about-description${isArabic ? " about-description-rtl" : ""}`}
          dir={isArabic ? "rtl" : "ltr"}
          dangerouslySetInnerHTML={{ __html: description }}
        />
      ) : null}
    </div>
  );
};

export default AboutUsText;
