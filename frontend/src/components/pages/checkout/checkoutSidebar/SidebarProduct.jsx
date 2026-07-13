import { placeHolderImage } from "@/components/widgets/Placeholder";
import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";
import Image from "next/image";
import React from "react";
import { useTranslation } from "react-i18next";

const SidebarProduct = ({ values }) => {
  const { t } = useTranslation("common");
  const cart = useCartState((state) => state.cart);
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };

  // Helper to get image URL - handles both string and object formats
  const getImageUrl = (item) => {
    if (item?.variation?.variation_image) {
      return typeof item.variation.variation_image === 'string'
        ? item.variation.variation_image
        : item.variation.variation_image?.original_url;
    }
    if (item?.product?.product_thumbnail) {
      return typeof item.product.product_thumbnail === 'string'
        ? item.product.product_thumbnail
        : item.product.product_thumbnail?.original_url;
    }
    return placeHolderImage;
  };

  return (
    <div className="checkout-details">
      <div className="order-box">
        <div className="title-box">
          <h4>{t("SummaryOrder")}</h4>
        </div>
        <ul className="qty">
          {cart?.map((item, i) => {
            // Use stored cart item price (set by CartState from selected variant)
            const itemPrice = item?.price ?? 0;
            const itemTotal = item?.sub_total ?? itemPrice * item.quantity;
            return (
            <li key={i} className={item?.gift_box_discount > 0 ? "giftbox-item" : ""}>
              {item && (
                <div className="cart-image">
                  <Image src={getImageUrl(item)} className="img-fluid" alt={item?.product?.name || "product"} width={70} height={70} />
                </div>
              )}
              <div className="cart-content">
                <div className="cart-details">
                  {item?.gift_box_discount > 0 && <span className="giftbox-mini">Gift Box</span>}
                  <h4>{item?.variation ? item?.variation?.name : item?.product?.name}</h4>
                  {(item?.color || item?.size) && (
                    <div className="item-meta">
                      {item?.color ? (
                        <span className="item-meta-group">
                          <span className="meta-label">{t("Color")}:</span>
                          <span className="meta-value">{item.color}</span>
                        </span>
                      ) : null}
                      {item?.size ? (
                        <span className="item-meta-group">
                          <span className="meta-label">{t("Size")}:</span>
                          <span className="meta-value">{item.size}</span>
                        </span>
                      ) : null}
                    </div>
                  )}
                  <h5 className="text-theme item-unit-price">
                    {convertCurrency(itemPrice.toFixed(2))} x {item.quantity}
                  </h5>
                </div>
                <div className="text-theme item-total">{convertCurrency(itemTotal.toFixed(2))}</div>
              </div>
            </li>
          );})}
        </ul>
      </div>
    </div>
  );
};

export default SidebarProduct;
