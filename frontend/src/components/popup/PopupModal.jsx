"use client";
import { useEffect, useState, useCallback } from "react";
import { Modal, ModalBody } from "reactstrap";
import Image from "next/image";
import Link from "next/link";
import { RiCloseLine, RiFileCopyLine, RiCheckLine } from "react-icons/ri";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { usePopupState } from "@/states";
import Btn from "@/elements/buttons/Btn";
import styles from "./PopupModal.module.scss";

const PopupModal = () => {
  const { t, i18n } = useTranslation("common");
  const { currentPopup, closePopup } = usePopupState();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const isRtl = i18n.language === "ar";

  // Get localized content
  const getLocalizedContent = useCallback(
    (field, fieldAr) => {
      if (isRtl && fieldAr) return fieldAr;
      return field || fieldAr || "";
    },
    [isRtl]
  );

  const handleClose = () => {
    closePopup();
    setCopied(false);
    setEmail("");
  };

  const handleCopyCoupon = async () => {
    if (currentPopup?.coupon_code) {
      try {
        await navigator.clipboard.writeText(currentPopup.coupon_code);
        setCopied(true);
        toast.success(t("CouponCopied") || "Coupon code copied!");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error(t("CopyFailed") || "Failed to copy");
      }
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error(t("EnterEmail") || "Please enter your email");
      return;
    }

    setSubscribing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_WEBSITE_API_URL}/popups/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast.success(t("SubscribedSuccessfully") || "Subscribed successfully!");
        handleClose();
      } else {
        const data = await response.json();
        toast.error(data.message || t("SubscribeFailed") || "Failed to subscribe");
      }
    } catch {
      toast.error(t("SubscribeFailed") || "Failed to subscribe");
    } finally {
      setSubscribing(false);
    }
  };

  if (!currentPopup) return null;

  const title = getLocalizedContent(currentPopup.title, currentPopup.title_ar);
  const description = getLocalizedContent(currentPopup.description, currentPopup.description_ar);
  const buttonText = getLocalizedContent(currentPopup.button_text, currentPopup.button_text_ar);
  const imageUrl = currentPopup.image_url;
  const popupType = currentPopup.type;

  // Render different popup types
  const renderPopupContent = () => {
    switch (popupType) {
      case "collection":
      case "offer":
        return (
          <div className={`${styles.heroPopup} ${isRtl ? styles.rtl : ""}`}>
            {imageUrl && (
              <div className={styles.imageSection}>
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  style={{ objectFit: "cover" }}
                  priority
                />
              </div>
            )}
            <div className={styles.contentSection}>
              <h2 className={styles.title}>{title}</h2>
              {description && <p className={styles.description}>{description}</p>}
              {popupType === "offer" && currentPopup.discount_value && (
                <div className={styles.discountBadge}>
                  {currentPopup.discount_type === "percentage"
                    ? `${currentPopup.discount_value}% OFF`
                    : `${currentPopup.discount_value} AED OFF`}
                </div>
              )}
              {buttonText && currentPopup.button_link && (
                <Link href={currentPopup.button_link} onClick={handleClose}>
                  <Btn className={styles.ctaButton}>{buttonText}</Btn>
                </Link>
              )}
            </div>
          </div>
        );

      case "coupon":
        return (
          <div className={`${styles.couponPopup} ${isRtl ? styles.rtl : ""}`}>
            {imageUrl && (
              <div className={styles.couponImage}>
                <Image
                  src={imageUrl}
                  alt={title}
                  width={120}
                  height={120}
                  style={{ objectFit: "contain" }}
                />
              </div>
            )}
            <h2 className={styles.couponTitle}>{title}</h2>
            {description && <p className={styles.couponDescription}>{description}</p>}
            {currentPopup.discount_value && (
              <div className={styles.discountDisplay}>
                <span className={styles.discountValue}>
                  {currentPopup.discount_type === "percentage"
                    ? `${currentPopup.discount_value}%`
                    : `${currentPopup.discount_value} AED`}
                </span>
                <span className={styles.discountLabel}>{t("Discount") || "DISCOUNT"}</span>
              </div>
            )}
            {currentPopup.coupon_code && (
              <div className={styles.couponCodeBox}>
                <span className={styles.couponCode}>{currentPopup.coupon_code}</span>
                <button
                  className={styles.copyButton}
                  onClick={handleCopyCoupon}
                  title={t("CopyCoupon") || "Copy coupon code"}
                >
                  {copied ? <RiCheckLine /> : <RiFileCopyLine />}
                </button>
              </div>
            )}
            {buttonText && currentPopup.button_link && (
              <Link href={currentPopup.button_link} onClick={handleClose}>
                <Btn className={styles.shopButton}>{buttonText}</Btn>
              </Link>
            )}
          </div>
        );

      case "newsletter":
        return (
          <div className={`${styles.newsletterPopup} ${isRtl ? styles.rtl : ""}`}>
            {imageUrl && (
              <div className={styles.newsletterImage}>
                <Image
                  src={imageUrl}
                  alt={title}
                  width={200}
                  height={200}
                  style={{ objectFit: "contain" }}
                />
              </div>
            )}
            <h2 className={styles.newsletterTitle}>{title}</h2>
            {description && <p className={styles.newsletterDescription}>{description}</p>}
            <form onSubmit={handleSubscribe} className={styles.subscribeForm}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("EnterYourEmail") || "Enter your email"}
                className={styles.emailInput}
                required
              />
              <Btn
                type="submit"
                className={styles.subscribeButton}
                disabled={subscribing}
              >
                {subscribing
                  ? t("Subscribing") || "Subscribing..."
                  : buttonText || t("Subscribe") || "Subscribe"}
              </Btn>
            </form>
            {currentPopup.coupon_code && (
              <p className={styles.couponHint}>
                {t("GetCouponOnSubscribe") || `Get code ${currentPopup.coupon_code} on subscription!`}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className={styles.defaultPopup}>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={!!currentPopup}
      toggle={handleClose}
      centered
      className={`${styles.popupModal} popup-modal-${popupType}`}
      size={popupType === "collection" || popupType === "offer" ? "lg" : "md"}
    >
      <button className={styles.closeButton} onClick={handleClose}>
        <RiCloseLine />
      </button>
      <ModalBody className={styles.modalBody}>
        {renderPopupContent()}
      </ModalBody>
    </Modal>
  );
};

export default PopupModal;
