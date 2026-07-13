import ThemeOptionContext from "@/context/themeOptionsContext";
import Btn from "@/elements/buttons/Btn";
import { useCartState } from "@/states";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";

const CompareAction = ({ product, selectedVariant, readyToAdd }) => {
  const { t } = useTranslation("common");
  const { setCartCanvas } = useContext(ThemeOptionContext);
  const { addToCart: addToCartState } = useCartState();

  const addToCart = () => {
    setCartCanvas(true);
    addToCartState(product, 1, selectedVariant);
  };
  return (
    <div className="btn-part">
      <Btn className=" btn-solid" onClick={addToCart} disabled={!readyToAdd}>
        {t("AddToCart")}
      </Btn>
    </div>
  );
};

export default CompareAction;
