import { useSettings } from "@/utils/hooks/useSettings";
import ThemeOptionContext from "@/context/themeOptionsContext";
import resolveMediaUrl from "@/utils/customFunctions/resolveMediaUrl";
import Image from "next/image";
import Link from "next/link";
import { useContext } from "react";

// Fallback logo if theme option logo is missing.
const FIXED_LOGO_SRC = "/assets/images/icon/logo/logo.png?v=3";

const HeaderLogo = ({ extraClass }) => {
  const { settingData } = useSettings();
  const { themeOption } = useContext(ThemeOptionContext);

  const rawLogoValue =
    themeOption?.logo?.header_logo?.original_url ||
    themeOption?.logo?.header_logo?.url ||
    (typeof themeOption?.logo?.header_logo === "string" ? themeOption?.logo?.header_logo : null);
  const logoSrc = typeof rawLogoValue === "string" && rawLogoValue.startsWith("/assets/")
    ? rawLogoValue
    : resolveMediaUrl(rawLogoValue) || FIXED_LOGO_SRC;

  return (
    <Link href="/" className={extraClass ? extraClass : ""}>
      <Image
        className="img-fluid"
        src={logoSrc}
        width={173}
        height={34}
        alt={settingData?.general?.site_name || "site-logo"}
        priority
      />
    </Link>
  );
};

export default HeaderLogo;
