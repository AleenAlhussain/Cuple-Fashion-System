import ThemeOptionContext from "@/context/themeOptionsContext";
import FooterSocial from "@/layout/footer/widgets/FooterSocial";
import { localizedValue } from "@/utils/constants";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";

const ContactDetails = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { t, i18n } = useTranslation("common");
  const contactConfig = themeOption?.contact_us || {};
  const lang = i18n.language;
  const title = localizedValue(contactConfig, "title", lang) || t("GetInTouch");
  const description = localizedValue(contactConfig, "description", lang);

  return (
    <div className="contact-title">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      <FooterSocial source={contactConfig} fallbackSource={themeOption?.footer} />
    </div>
  );
};

export default ContactDetails;
