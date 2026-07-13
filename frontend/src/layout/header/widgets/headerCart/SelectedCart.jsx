import HandleQuantity from "@/components/cart/HandleQuantity";
import Avatar from "@/components/widgets/Avatar";
import { placeHolderImage } from "@/components/widgets/Placeholder";
import { useCartState } from "@/states";
import { useSettings } from "@/utils/hooks/useSettings";
import useCartDiscount from "@/utils/hooks/useCartDiscount";
import { cleanText, localizedValue } from "@/utils/constants";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Btn from "@/elements/buttons/Btn";
import Cookies from "js-cookie";
import Link from "next/link";
import React, { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RiDeleteBinLine, RiPencilLine } from "react-icons/ri";

// Helper to get proper image URL (handles external URLs from cuple.ae)
const getCartImageUrl = (elem) => {
  // Try variation image first, then product image
  const imageUrl =
    elem?.variation?.main_image ||
    elem?.variation?.variation_image?.original_url ||
    elem?.product?.main_image ||
    elem?.product?.primary_image ||
    elem?.product?.product_thumbnail?.original_url;

  if (!imageUrl) return null;

  // If already a full URL, return as-is
  if (typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
    return imageUrl;
  }

  // Otherwise prepend storage URL
  const storageUrl = process.env.NEXT_PUBLIC_BACKEND_IMAGE_URL || process.env.IMAGE_URL || '';
  return `${storageUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};

const SelectedCart = ({ modal, setSelectedVariation, setModal }) => {
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const { setCartCanvas } = useContext(ThemeOptionContext);
  const cart = useCartState((state) => state.cart);
  const removeFromCart = useCartState((state) => state.removeFromCart);
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // Rule-based discounts from Offer Engine
  const { totalDiscount: ruleDiscount, appliedDiscounts, isCalculating } = useCartDiscount({
    enabled: cart?.length > 0
  });

  const subTotal = cart?.reduce((sum, item) => sum + (item?.sub_total || 0), 0) || 0;
  const giftDiscount = cart?.reduce((sum, item) => sum + (item?.gift_box_discount || 0), 0) || 0;
  const allDiscounts = giftDiscount + (ruleDiscount || 0);
  const total = Math.max(0, subTotal - allDiscounts);
  const onEdit = (data) => {
    setSelectedVariation(() => data);
    setTimeout(() => {
      setModal(true);
    }, 0);
  };

  const handelCheckout = () => {
    Cookies.set("CallBackUrl", "/checkout");
  };

  useEffect(() => {
    cart?.filter((elem) => {
      if (elem?.variation) {
        elem.variation.selected_variation = elem?.variation?.attribute_values
          ?.map((values) => values?.value)
          .join("/");
      } else {
        elem;
      }
    });
  }, [modal]);

  return (
    <>
      <div className="cart_media">
        <ul className="cart_product">
          {cart.map((elem, i) => {
            return (
              <li className="product-box-contain" key={i}>
                <div className="media">
                  <Link href={`/product/${elem?.product?.slug}`}>
                    <Avatar
                      customClass={"cart-product-image"}
                      data={getCartImageUrl(elem)}
                      placeHolder={placeHolderImage}
                      name={localizedValue(elem?.product, 'name', lang)}
                      height={72}
                      width={87}
                    />
                  </Link>
                  <div className="media-body">
                    <Link href={`/product/${elem?.product?.slug}`}>
                      <h4>{cleanText(localizedValue(elem?.variation, 'name', lang) || localizedValue(elem?.product, 'name', lang))}</h4>
                    </Link>
                    <div className="price-size-row">
                      <span className="quantity">
                        {(elem?.price || elem?.variation?.sale_price || elem?.variation?.price || elem?.product?.sale_price || elem?.product?.price || 0).toFixed(2)} AED
                      </span>
                      {(elem?.color || elem?.size || elem?.variation) && (
                        <span className="gram">
                          {elem?.size && <span>{t("Size")}: {elem.size}</span>}
                          {elem?.color && elem?.size && <span> | </span>}
                          {elem?.color && <span>{t("Color")}: {elem.color}</span>}
                          {!elem?.color && !elem?.size && elem?.variation?.attribute_values?.map(av => av.value).join(' / ')}
                        </span>
                      )}
                    </div>
                    <HandleQuantity
                      productObj={elem?.product}
                      elem={elem}
                      customIcon={<RiDeleteBinLine />}
                    />
                    <div className="close-circle">
                      {elem?.variation && (
                        <Btn
                          className="close_button delete-button edit-button"
                          color="transparent"
                          onClick={() => onEdit(elem)}
                        >
                          <RiPencilLine />
                        </Btn>
                      )}
                      <Btn
                        className="delete-button close_button"
                        color="transparent"
                        onClick={() =>
                          removeFromCart(elem?.product_id, elem?.variation_id, elem?.line_key)
                        }
                      >
                        <RiDeleteBinLine />
                      </Btn>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {cart?.length ? (
          <ul className="cart_total ">
            <li>
              <div className="total">
                <h5>
                  {t("SubTotal")} : <span>{subTotal.toFixed(2)} AED</span>
                </h5>
                {giftDiscount > 0 && (
                  <h5>
                    {t("GiftDiscount")} : <span className="text-success">-{giftDiscount.toFixed(2)} AED</span>
                  </h5>
                )}
                {appliedDiscounts?.map((discount, idx) => (
                  <h5 key={idx} className="text-success">
                    {discount.name} : <span className="text-success">-{Number(discount.amount).toFixed(2)} AED</span>
                  </h5>
                ))}
                {isCalculating && (
                  <h5 className="text-muted">
                    {t("Calculating")}...
                  </h5>
                )}
                {allDiscounts > 0 && (
                  <h5 className="text-success">
                    {t("YouSave")} : <span className="text-success">{allDiscounts.toFixed(2)} AED</span>
                  </h5>
                )}
                <h5>
                  {t("Total")} : <span>{total.toFixed(2)} AED</span>
                </h5>
              </div>
            </li>
            <li>
              <div className="buttons">
                <Link
                  href={`/cart`}
                  className="btn view-cart"
                  onClick={() => setCartCanvas(false)}
                >
                  {t("ViewCart")}
                </Link>
                <Link
                  href={"/checkout"}
                  className="btn checkout"
                  onClick={() => {
                    setCartCanvas(false), handelCheckout;
                  }}
                >
                  {t("Checkout")}
                </Link>
              </div>
            </li>
          </ul>
        ) : null}
      </div>
    </>
  );
};

export default SelectedCart;
