import ThemeOptionContext from "@/context/themeOptionsContext";
import { useTranslation } from "react-i18next";
import { useContext, useState } from "react";
import { RiTruckLine } from "react-icons/ri";
import { Progress } from "reactstrap";
import DeliveryReturnModal from "./allModal/DeliveryReturnModal";
import SizeModal from "./allModal/SizeModal";

const hasRenderablePolicyContent = (content) =>
  String(content || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim().length > 0;

const AddProductDetail = ({ productState }) => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { t } = useTranslation("common");
  const [modal, setModal] = useState("");
  const hasShippingAndReturn = hasRenderablePolicyContent(themeOption?.product?.shipping_and_return) || hasRenderablePolicyContent(themeOption?.product?.shipping_and_return_ar);
  const getQTY = productState?.selectedVariation?.quantity ? productState?.selectedVariation?.quantity : productState?.product?.quantity;
  const getStockStatus = productState?.selectedVariation?.stock_status ?? productState?.product?.stock_status;
  const activeModal = {
    size: <SizeModal modal={modal} setModal={setModal} productState={productState} />,
    delivery: <DeliveryReturnModal modal={modal} setModal={setModal} productState={productState} />,
  };

  const getProgressValue = (productState) => {
    if (productState?.selectedVariation) {
      return 100 - (productState?.selectedVariation?.quantity * 100) / 10;
    } else {
      return 100 - (productState?.product?.quantity * 100) / 10;
    }
  };
  return (
    <>
      {getStockStatus !== "out_of_stock" ? (
        productState?.selectedVariation?.quantity <= 10 ?? productState?.product?.quantity <= 10 ? (
          <div className="progress-sec">
            <div className="left-progressbar">
              <h6>
                {t("PleasehurryOnly")} {productState?.selectedVariation?.quantity ?? productState?.product?.quantity} {t("leftinstock")}
              </h6>
              <Progress className={getQTY <= 2 ? "danger-progress" : getQTY >= 3 && getQTY <= 7 ? "warning-progress" : ""} striped animated value={getProgressValue(productState)} />
            </div>
          </div>
        ) : null
      ) : null}
      {productState?.product?.size_chart_image || (hasShippingAndReturn && productState?.product?.is_return) ? (
        <div className="size-delivery-info">
          {hasShippingAndReturn && productState?.product?.is_return ? (
            <a onClick={() => setModal("delivery")}>
              <RiTruckLine /> {t("DeliveryReturn")}
            </a>
          ) : null}
        </div>
      ) : null}
      {modal && activeModal[modal]}
    </>
  );
};

export default AddProductDetail;
