import { useTranslation } from "react-i18next";
import { Progress } from "reactstrap";

const ProductStatus = ({ productState }) => {
  const { t } = useTranslation("common");
  const getQTY = 10;
  const getStockStatus = productState?.selectedVariation?.stock_status ?? productState?.product?.stock_status;

  const getProgressValue = (productState) => {
    if (productState?.selectedVariation) {
      return (productState?.selectedVariation?.quantity * 100) / 5;
    } else {
      return (productState?.product?.quantity * 100) / 5;
    }
  };
  return (
    <>
      {productState.product?.quantity && (productState.product?.quantity <= 5 || productState.selectedVariation?.quantity <= 5) ? (
        <>
          {getStockStatus !== "out_of_stock" ? (
            <div className="progress-sec">
              <div className="left-progressbar">
                <h6>
                  {t("PleasehurryOnly")} {productState?.selectedVariation?.quantity ?? productState?.product?.quantity} {t("leftinstock")}
                </h6>
                <Progress color={`${getQTY <= 2 ? "danger" : getQTY >= 3 && getQTY <= 7 ? "warning" : ""}`} style={{ height: "8px" }} value={getProgressValue(productState)} />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
};

export default ProductStatus;
