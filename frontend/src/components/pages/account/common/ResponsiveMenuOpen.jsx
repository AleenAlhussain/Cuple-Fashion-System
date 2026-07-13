"use client";

import Btn from "@/elements/buttons/Btn";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

const ResponsiveMenuOpen = () => {
  const { setMobileSideBar, setAccountMobileSideBar } = useContext(ThemeOptionContext);

  const { t } = useTranslation("common");
  return (
    <Btn
      className="show-btn"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setMobileSideBar(false);
        setAccountMobileSideBar(true);
      }}
    >
      {t("ShowMenu")}
    </Btn>
  );
};

export default ResponsiveMenuOpen;
