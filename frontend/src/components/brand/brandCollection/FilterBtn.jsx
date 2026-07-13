import ThemeOptionContext from "@/context/themeOptionsContext";
import Btn from "@/elements/buttons/Btn";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { RiFilter2Fill } from "react-icons/ri";

const FilterBtn = ({ isOffcanvas }) => {
  const { t } = useTranslation("common");
  const { openOffCanvas, setOpenOffCanvas } = useContext(ThemeOptionContext);
  return (
    <>
      {isOffcanvas && (
        <Btn className="filter-main-btn" onClick={() => setOpenOffCanvas(!openOffCanvas)}>
          <RiFilter2Fill /> {t("FilterMenu")}
        </Btn>
      )}
    </>
  );
};

export default FilterBtn;
