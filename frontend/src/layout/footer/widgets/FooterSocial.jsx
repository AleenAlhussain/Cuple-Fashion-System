import ThemeOptionContext from "@/context/themeOptionsContext";
import Link from "next/link";
import React, { useContext } from "react";
import {
  RiFacebookFill,
  RiInstagramFill,
  RiPinterestFill,
  RiSnapchatFill,
  RiTiktokFill,
  RiTwitterXFill,
} from "react-icons/ri";

const SOCIAL_LINK_CONFIG = [
  { key: "facebook", icon: <RiFacebookFill /> },
  { key: "instagram", icon: <RiInstagramFill /> },
  { key: "tiktok", icon: <RiTiktokFill /> },
  { key: "snapchat", icon: <RiSnapchatFill /> },
  { key: "twitter", icon: <RiTwitterXFill /> },
  { key: "pinterest", icon: <RiPinterestFill /> },
];

const hasConfiguredSocialSource = (source) => {
  if (!source || typeof source !== "object") return false;
  if (source.social_media_enable === false) return true;

  return (
    source.social_media_enable === true ||
    SOCIAL_LINK_CONFIG.some(
      ({ key }) => typeof source?.[key] === "string" && source[key].trim().length > 0
    )
  );
};

const buildSocialLinks = (source) => {
  if (!source?.social_media_enable) return [];

  return SOCIAL_LINK_CONFIG.map(({ key, icon }) => ({
    key,
    icon,
    href: source?.[key],
  })).filter((item) => typeof item.href === "string" && item.href.trim().length > 0);
};

const FooterSocial = ({ source, fallbackSource }) => {
  const { themeOption } = useContext(ThemeOptionContext);
  const primarySource = source || themeOption?.footer || {};
  const secondarySource =
    fallbackSource || (source ? themeOption?.footer || {} : null);
  const primaryIsConfigured = hasConfiguredSocialSource(primarySource);
  const socialLinks = buildSocialLinks(primarySource);
  const resolvedLinks =
    socialLinks.length || primaryIsConfigured
      ? socialLinks
      : buildSocialLinks(secondarySource);

  if (!resolvedLinks.length) return null;

  return (
    <div className="footer-social">
      <ul>
        {resolvedLinks.map((item) => (
          <li key={item.key}>
            <Link href={item.href} target="_blank">
              {item.icon}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FooterSocial;
