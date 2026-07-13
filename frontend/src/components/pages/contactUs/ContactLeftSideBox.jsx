import ThemeOptionContext from "@/context/themeOptionsContext";
import { localizedValue, resolveImageUrl } from "@/utils/constants";
import { useContext } from "react";
import { RiMailFill, RiMapPinFill, RiPhoneFill } from "react-icons/ri";
import { useTranslation } from "react-i18next";
import { Col, Media } from "reactstrap";

const LEGACY_ICON_MAP = {
  "ri-phone-fill": RiPhoneFill,
  "ri-mail-fill": RiMailFill,
  "ri-map-pin-fill": RiMapPinFill,
};

const CONTACT_DETAIL_SLOTS = [
  {
    key: "detail_1",
    defaultLabel: "Phone",
    defaultLabelAr: "الهاتف",
    fallbackIcon: RiPhoneFill,
    getFallbackText: (footer) => footer?.support_number || "",
  },
  {
    key: "detail_2",
    defaultLabel: "Email",
    defaultLabelAr: "البريد الإلكتروني",
    fallbackIcon: RiMailFill,
    getFallbackText: (footer) => footer?.about_email || footer?.support_email || "",
  },
  {
    key: "detail_3",
    defaultLabel: "Address",
    defaultLabelAr: "العنوان",
    fallbackIcon: RiMapPinFill,
    getFallbackText: (footer) => footer?.about_address || "",
  },
];

const renderContactIcon = (detail, FallbackIcon, altText) => {
  const iconUrl = detail?.icon_image_url || detail?.iconImageUrl || "";

  if (typeof iconUrl === "string" && iconUrl.trim().length > 0) {
    return <img src={resolveImageUrl(iconUrl)} alt={altText} loading="lazy" />;
  }

  const LegacyIcon = LEGACY_ICON_MAP[detail?.icon] || FallbackIcon;
  return <LegacyIcon />;
};

const ContactLeftSideBox = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { i18n } = useTranslation("common");
  const lang = i18n.language;
  const footer = themeOption?.footer || {};
  const contactConfig = themeOption?.contact_us || {};
  const contactDetails = CONTACT_DETAIL_SLOTS.map((slot) => {
    const detail = contactConfig?.[slot.key] || {};
    const label =
      localizedValue(detail, "label", lang) ||
      (lang === "ar" ? slot.defaultLabelAr : slot.defaultLabel);
    const text = localizedValue(detail, "text", lang) || slot.getFallbackText(footer);

    return {
      key: slot.key,
      label,
      text,
      icon: renderContactIcon(detail, slot.fallbackIcon, label),
    };
  }).filter(({ text }) => typeof text === "string" && text.trim().length > 0);

  return (
    <Col xs="12">
      <div className="contact-right">
        <ul>
          {contactDetails.map(({ icon, key, label, text }) => (
            <li key={key}>
              <div className="contact-icon">{icon}</div>
              <Media body>
                <h6>{label}</h6>
                <p>{text}</p>
              </Media>
            </li>
          ))}
        </ul>
      </div>
    </Col>
  );
};

export default ContactLeftSideBox;
