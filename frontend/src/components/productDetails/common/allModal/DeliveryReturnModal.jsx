import CustomModal from "@/components/widgets/CustomModal";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

const DeliveryReturnModal = ({ modal, setModal }) => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { i18n } = useTranslation("common");
  const isArabic = i18n.language === "ar";
  const shippingAndReturnContent = isArabic
    ? themeOption?.product?.shipping_and_return_ar || themeOption?.product?.shipping_and_return || ""
    : themeOption?.product?.shipping_and_return || themeOption?.product?.shipping_and_return_ar || "";

  return (
    <CustomModal modal={modal ? true : false} setModal={setModal} classes={{ modalClass: "theme-modal-2 modal-lg", title: "Delivery&Return", modalBodyClass: "policy-body" }}>
      <div
        className={`delivery-return-content${isArabic ? " rtl" : ""}`}
        dir={isArabic ? "rtl" : "ltr"}
        dangerouslySetInnerHTML={{ __html: shippingAndReturnContent }}
      />
    </CustomModal>
  );
};

export default DeliveryReturnModal;
