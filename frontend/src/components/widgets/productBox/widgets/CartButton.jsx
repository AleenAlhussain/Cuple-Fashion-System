import { useCartState } from "@/states";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Btn from "@/elements/buttons/Btn";
import React from "react";
import { useTranslation } from "react-i18next";
import { RiAddLine, RiDeleteBinLine, RiSubtractLine } from "react-icons/ri";
import { Input } from "reactstrap";
import { useContext, useState, useMemo, useEffect } from "react";

const CartButton = ({
  productState,
  text,
  classes,
  iconClass = true,
  quantity = false,
  selectedVariation,
}) => {
  const cart = useCartState((state) => state.cart);
  const addToCart = useCartState((state) => state.addToCart);
  const { cartCanvas, setCartCanvas } = useContext(ThemeOptionContext);
  const [variationModal, setVariationModal] = useState("");
  const { t } = useTranslation("common");
  const [productQty, setProductQty] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Check if product is in stock - handle both variation and non-variation products
  const isInStock = useMemo(() => {
    if (selectedVariation) {
      return selectedVariation.quantity > 0 || selectedVariation.stock_status === 'in_stock';
    }
    const product = productState?.product;
    if (!product) return false;
    // Check stock_status field or quantity
    if (product.stock_status === 'in_stock') return true;
    if (product.stock_status === 'out_of_stock') return false;
    // Fallback to quantity check
    return product.quantity > 0 || product.quantity === undefined;
  }, [selectedVariation, productState]);

  const getSelectedVariant = useMemo(() => {
    return cart.find((elem) =>
      elem?.variation_id
        ? elem?.variation_id == selectedVariation?.id
        : elem.product_id === productState?.product?.id
    );
  }, [cart, productState]);

  useEffect(() => {
    setProductQty(0);
    const foundProduct = cart.find((elem) =>
      elem?.variation_id
        ? elem?.variation_id == getSelectedVariant?.variation_id
        : elem?.product_id === productState?.product?.id
    );
    if (foundProduct) {
      if (foundProduct?.quantity || !isOpen) {
        setProductQty(foundProduct?.quantity);
        setIsOpen(true);
      }
    } else {
      if (productQty !== 0 || isOpen) {
        setProductQty(0);
        setIsOpen(false);
      }
    }
  }, [getSelectedVariant]);

  const externalProductLink = (link) => {
    if (link) {
      window.open(link, "_blank");
    }
  };

  return (
    <>
      {!productState?.product?.is_external ? (
        <>
          {quantity ? (
            <>
              {isInStock ? (
                <button
                  id={`add-to-cart${selectedVariation?.id || productState?.product?.id}`}
                  className="add-button add_cart"
                  onClick={() => {
                    setCartCanvas(true);
                    addToCart(productState?.product, 1, selectedVariation);
                  }}
                >
                  {text}
                </button>
              ) : null}

              {productQty > 0 && (
                <div
                  className={`qty-box ${
                    isOpen && productQty >= 1 ? "open" : ""
                  }`}
                >
                  <div className="input-group">
                    <Btn
                      type="button"
                      className="btn quantity-left-minus"
                      onClick={() => {
                        setCartCanvas(true);
                        addToCart(productState?.product, -1, selectedVariation);
                      }}
                    >
                      {productQty > 1 ? (
                        <RiSubtractLine />
                      ) : (
                        <RiDeleteBinLine />
                      )}
                    </Btn>
                    <Input
                      className="form-control input-number qty-input"
                      type="text"
                      name="quantity"
                      value={productQty}
                      readOnly
                    />
                    <Btn
                      type="button"
                      className="btn quantity-right-plus"
                      onClick={() => {
                        setCartCanvas(true);
                        addToCart(productState?.product, 1, selectedVariation);
                      }}
                    >
                      <RiAddLine />
                    </Btn>
                  </div>
                </div>
              )}
            </>
          ) : isInStock ? (
            <Btn
              color="transparent"
              id={`add-to-cart-${selectedVariation?.id || productState?.product?.id}`}
              className={`${classes ? classes : ""}  ${
                productQty > 0 ? "active" : ""
              }`}
              iconClass={iconClass ? iconClass : <RiAddLine />}
              onClick={() => {
                selectedVariation?.external_url
                  ? window.open(selectedVariation?.external_url, "_blank")
                  : setCartCanvas(true);
                addToCart(productState?.product, 1, selectedVariation);
                selectedVariation?.type === "classified"
                  ? setVariationModal(selectedVariation?.id)
                  : setCartCanvas(!cartCanvas);
              }}
            >
              <i className="ri-shopping-cart-line"></i>
              <span> {!(productQty > 0) ? text : "Added"}</span>
            </Btn>
          ) : null}
        </>
      ) : (
        <Btn
          id={`add-to-cart${selectedVariation?.id}`}
          className={`btn btn-add-cart addcart-button ${
            classes ? classes : ""
          }`}
          onClick={() => externalProductLink(selectedVariation?.external_url)}
        >
          {selectedVariation?.external_button_text
            ? selectedVariation?.external_button_text
            : "BuyNow"}
        </Btn>
      )}
    </>
  );
};

export default CartButton;
