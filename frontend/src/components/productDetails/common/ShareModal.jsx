import Btn from "@/elements/buttons/Btn";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiCloseLine } from "react-icons/ri";
import { Input, Modal, ModalBody, ModalHeader } from "reactstrap";

const ShareModal = ({ productState, modal, setModal }) => {
  const { slug } = productState?.product;
  const { t } = useTranslation("common");
  const productUrl = useMemo(() => {
    if (typeof window !== "undefined" && window.location?.href) {
      return window.location.href;
    }

    if (typeof window !== "undefined" && slug) {
      return `${window.location.origin}/product/${slug}`;
    }

    return "";
  }, [slug]);
  const [shareLink, setShareLink] = useState(productUrl);

  useEffect(() => {
    setShareLink(productUrl);
  }, [productUrl]);

  const copyLink = () => {
    if (!shareLink) return;

    navigator.clipboard.writeText(shareLink);
    ToastNotification("success", "Link copied To Clipboard");
  };

  const handleWhatsAppShare = () => {
    if (!productUrl) return;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(productUrl)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal
      centered
      isOpen={modal}
      toggle={() => setModal(false)}
      className="theme-modal-2"
    >
      <div className="">
        <ModalHeader>
          {t("Share")}
          <Btn className="btn-close" onClick={() => setModal(false)}>
            <RiCloseLine />
          </Btn>
        </ModalHeader>
        <ModalBody>
          <div className="bordered-box">
            <div className="product-social">
              <li onClick={handleWhatsAppShare}>
                <div style={{ cursor: "pointer" }}>
                  <i className="ri-whatsapp-line" />
                </div>
              </li>
            </div>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="gap-3 input-group form-box">
                <Input
                  type="text"
                  value={shareLink}
                  readOnly
                />
                <Btn
                  className={`${
                    shareLink.trim() ? "" : "disabled"
                  } btn-solid buy-button`}
                  type="button"
                  onClick={copyLink}
                >
                  {t("CopyLink")}
                </Btn>
              </div>
            </form>
          </div>
        </ModalBody>
      </div>
    </Modal>
  );
};

export default ShareModal;
