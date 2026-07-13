import Btn from "@/elements/buttons/Btn";
import { useTranslation } from "react-i18next";

const VariationAddToCart = ({ cloneVariation, setFieldValue, setModal, mutate, isLoading }) => {
  const { t } = useTranslation("common");
  const addToCart = (allProduct) => {
    const payload = {
      product_id: allProduct?.id,
      variant_id: cloneVariation?.selectedVariation?.id || null,
      quantity: cloneVariation?.productQty,
    };

    if (!payload.product_id) {
      return;
    }

    if (cloneVariation?.selectedVariation) {
      setFieldValue("variation_id", cloneVariation?.selectedVariation?.id);
    }

    mutate && mutate(payload);
    setModal && setModal(false);
  };
  const variantInStock =
    cloneVariation?.selectedVariation &&
    (cloneVariation?.selectedVariation?.stock_status === "in_stock" ||
      (cloneVariation?.selectedVariation?.stock_quantity ?? 0) > 0);

  const productInStockSimple =
    cloneVariation?.product?.stock_status === "in_stock" &&
    cloneVariation?.product?.type === "simple";

  const canAdd = variantInStock || productInStockSimple;

  return (
    <div className="addtocart_btn">
      {canAdd ? (
        <Btn onClick={() => addToCart(cloneVariation.product)} className="add-button addcart-button btn buy-button" loading={Number(isLoading)}>
          {" "}
          {t("AddToCart")}{" "}
        </Btn>
      ) : (
        <Btn disabled={true} className="btn btn-animation disabled">
          {cloneVariation?.selectedVariation?.stock_status == "out_of_stock" || cloneVariation?.product?.stock_status == "out_of_stock" ? t("OutOfStock") : t("AddToCart")}
        </Btn>
      )}
    </div>
  );
};
export default VariationAddToCart;
