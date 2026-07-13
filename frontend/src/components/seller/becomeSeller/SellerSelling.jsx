import WrapperComponent from "@/components/widgets/WrapperComponent";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

const SellerSelling = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { t } = useTranslation("common");
  return (
    <WrapperComponent classes={{ sectionClass: "start-selling section-b-space", fluidClass: "container" }} noRowCol={true}>
      <h4>{themeOption?.seller?.start_selling?.title}</h4>
      <p>{themeOption?.seller?.start_selling?.description}</p>
      {themeOption?.general?.seller_register_url ? (
        <a href={themeOption?.general?.seller_register_url} className='btn btn-solid btn-sm'>
          {t("StartSelling")}{" "}
        </a>
      ) : null}
    </WrapperComponent>
  );
};

export default SellerSelling;
