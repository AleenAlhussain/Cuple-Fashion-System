"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Modal, ModalBody, ModalHeader } from "reactstrap";
import Image from "next/image";
import { placeHolderImage } from "@/components/widgets/Placeholder";
import styles from "./GiftBoxModal.module.scss";

const GiftBoxModal = ({ isOpen, offer, onClose, onConfirm }) => {
  const { t } = useTranslation("common");
  const [step, setStep] = useState("category");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("category");
      setSelectedCategory(null);
      setSelectedProduct(null);
      setError("");
    }
  }, [isOpen, offer?.offer_id]);

  const categories = useMemo(() => offer?.categories || [], [offer]);
  const productsForCategory = useMemo(() => {
    if (!selectedCategory) return [];
    const category = categories.find((cat) => cat.category_id === selectedCategory);
    return category?.items || [];
  }, [categories, selectedCategory]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedProduct(null);
    setError("");
    setStep("product");
  };

  const handleConfirm = () => {
    if (!selectedCategory || !selectedProduct) {
      setError(t("PleaseSelectProduct"));
      return;
    }
    onConfirm?.({ categoryId: selectedCategory, productId: selectedProduct });
  };

  const renderCategoryStep = () => (
    <div className={styles.section}>
      <h6 className={styles.sectionTitle}>{t("SelectCategory")}</h6>
      <p className={styles.helper}>{t("UnlockYourGiftOptions")}</p>
      <div className={styles.categoryTabs}>
        {categories.map((category) => {
          const isActive = selectedCategory === category.category_id;
          return (
            <button
              key={category.category_id}
              type="button"
              className={`${styles.categoryTab} ${isActive ? styles.activeTab : ""}`}
              onClick={() => handleCategorySelect(category.category_id)}
            >
              {category.category_name}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderProductStep = () => (
    <div className={styles.section}>
      {categories.length > 1 && (
        <>
          <h6 className={styles.sectionTitle}>{t("SelectCategory")}</h6>
          <div className={styles.categoryTabs}>
            {categories.map((category) => {
              const isActive = selectedCategory === category.category_id;
              return (
                <button
                  key={category.category_id}
                  type="button"
                  className={`${styles.categoryTab} ${isActive ? styles.activeTab : ""}`}
                  onClick={() => handleCategorySelect(category.category_id)}
                >
                  {category.category_name}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className={styles.grid}>
        {productsForCategory.map((item) => {
          const product = item.product || {};
          const imageUrl =
            product?.product_thumbnail?.original_url ||
            product?.primary_image ||
            placeHolderImage;
          const isSelected = selectedProduct === item.product_id;
          const isDimmed = selectedProduct && !isSelected;
          const discountLabel =
            offer?.discount_type === "percentage"
              ? `${offer?.discount_value}% OFF`
              : offer?.discount_type === "fixed"
              ? `${offer?.discount_value} AED OFF`
              : `Gift Price ${offer?.discount_value} AED`;

          return (
            <button
              key={item.product_id}
              type="button"
              className={`${styles.productCard} ${isSelected ? styles.selected : ""} ${isDimmed ? styles.dimmed : ""}`}
              onClick={() => {
                setSelectedProduct(item.product_id);
                setError("");
              }}
              aria-pressed={isSelected}
            >
              <div className={styles.productBody}>
                <div className={styles.productImage}>
                  {offer?.discount_value > 0 && (
                    <span className={styles.discountBadge}>{discountLabel}</span>
                  )}
                  {isSelected && <span className={styles.selectedBadge}>{t("Selected")}</span>}
                  <Image src={imageUrl} alt={product?.name || "Product"} width={140} height={140} />
                </div>
                <div className={styles.productInfo}>
                  <h6>{product?.name}</h6>
                  <p className={styles.price}>
                    {product?.final_price ?? product?.sale_price ?? product?.price ?? 0} AED
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      size="lg"
      centered
      scrollable
      className={styles.modalDialog}
      backdropClassName={styles.backdrop}
      contentClassName={styles.modalContent}
    >
      <ModalHeader toggle={onClose} className={styles.modalHeader}>
        <div className={styles.headerContent}>
          <span className={styles.giftIcon}>🎁</span>
          <h4>{t("AGiftJustForYou")}</h4>
          <p>{t("ChooseOneExclusiveItem")}</p>
          <small>{t("OneGiftPerCustomer")}</small>
        </div>
      </ModalHeader>
      <ModalBody className={styles.modalBody}>
        <div className={styles.banner}>
          <div>
            <h5>{t("PickYourGift")}</h5>
            <p className={styles.bannerText}>{t("Select1ItemToAdd")}</p>
          </div>
          <span className={styles.rulePill}>{t("Choose1Item")}</span>
        </div>
        <div className={styles.contentArea}>
          {step === "category" ? renderCategoryStep() : renderProductStep()}
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
        <div className={styles.actions}>
          <Button color="primary" onClick={handleConfirm} disabled={!selectedProduct}>
            {t("AddMyGift")}
          </Button>
          <Button color="link" className={styles.skipButton} onClick={onClose}>
            {t("MaybeLater")}
          </Button>
        </div>
        <p className={styles.footerNote}>{t("OneGiftPerCustomerOfferOnce")}</p>
      </ModalBody>
    </Modal>
  );
};

export default GiftBoxModal;

