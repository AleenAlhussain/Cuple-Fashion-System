import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";

import { Href, localizedValue } from "@/utils/constants";
import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import { RiCloseLine } from "react-icons/ri";
import { Col, Row } from "reactstrap";
import CartProductDetail from "./CartProductDetail";
import HandleQuantity from "./HandleQuantity";

const CartData = ({ elem }) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const removeFromCart = useCartState((state) => state.removeFromCart);
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };

  const removeItem = () => {
    removeFromCart(elem?.product_id, elem?.variation_id, elem?.line_key);
  };

  // Get the correct price - use stored variant price from cart item
  // elem.price is set by CartState from the selected variant
  const itemPrice = elem?.price ?? 0;

  // Get original price for discount display (variant's original price or product price)
  const originalPrice =
    parseFloat(elem?.base_price) ||
    parseFloat(elem?.variation?.price) ||
    parseFloat(elem?.product?.price) ||
    0;
  const hasDiscount = originalPrice > itemPrice;
  const savings = hasDiscount ? (originalPrice - itemPrice) : 0;

  return (
    <tr className={elem?.gift_box_discount > 0 ? "giftbox-row" : ""}>
      <CartProductDetail elem={elem} />
      <td>
        <Link href={`/product/${elem?.product?.slug}`}>{localizedValue(elem?.variation, 'name', lang) || localizedValue(elem?.product, 'name', lang)}</Link>
        {(elem?.color || elem?.size) && (
          <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
            {elem?.color && <span>{t("Color")}: {elem.color}</span>}
            {elem?.color && elem?.size && <span> | </span>}
            {elem?.size && <span>{t("Size")}: {elem.size}</span>}
          </p>
        )}
        <Row className="mobile-cart-content">
          <Col>
            <div className="qty-box">
              <HandleQuantity productObj={elem?.product} classes={{ customClass: "quantity-price" }} elem={elem} />
            </div>
          </Col>
          <Col className="table-price">
            <h2 className="td-color">
              {convertCurrency(itemPrice.toFixed(2))}
              {hasDiscount ? <del className="text-content">{convertCurrency(originalPrice.toFixed(2))}</del> : null}
            </h2>
          </Col>
          <Col>
            <a href={Href} className="icon remove-btn" onClick={removeItem}>
              <RiCloseLine />
            </a>
          </Col>
        </Row>
      </td>
      <td className="table-price">
        <h2>
          {convertCurrency(itemPrice.toFixed(2))}
          {hasDiscount ? <del className="text-content">{convertCurrency(originalPrice.toFixed(2))}</del> : null}
        </h2>
        {savings > 0 ? (
          <h6 className="theme-color">
            {t("YouSave")}: {convertCurrency(savings.toFixed(2))}
          </h6>
        ) : null}
      </td>

      <td>
        <div className="qty-box">
          <HandleQuantity productObj={elem?.product} classes={{ customClass: "quantity-price" }} elem={elem} />
        </div>
      </td>

      <td className="subtotal">
        <h2 className="td-color">{convertCurrency(elem?.sub_total)}</h2>
      </td>

      <td>
        <a href={Href} className="icon remove-btn" onClick={removeItem}>
          <RiCloseLine />
        </a>
      </td>
    </tr>
  );
};

export default CartData;
