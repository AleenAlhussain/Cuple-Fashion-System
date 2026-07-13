import { useCartState } from "@/states";
import Btn from "@/elements/buttons/Btn";
import React, { useEffect, useState, useCallback } from "react";
import { RiAddLine, RiSubtractLine } from "react-icons/ri";
import { Input, InputGroup } from "reactstrap";

const HandleQuantity = ({ classes = {}, productObj, elem, customIcon }) => {
  const cart = useCartState((state) => state.cart);
  const updateQuantity = useCartState((state) => state.updateQuantity);
  const removeFromCart = useCartState((state) => state.removeFromCart);
  const [productQty, setProductQty] = useState(0);

  useEffect(() => {
    const foundProduct = cart.find((el) =>
      elem?.line_key
        ? elem?.line_key === el?.line_key
        : elem?.variation_id
        ? elem?.variation_id === el?.variation_id
        : el.product_id === elem?.product_id
    );
    if (foundProduct) {
      setProductQty(foundProduct.quantity);
    } else {
      setProductQty(0);
    }
  }, [cart, elem]);

  const handleDecrease = useCallback(() => {
    const newQty = Math.max(0, productQty - 1);
    if (newQty === 0) {
      removeFromCart(elem?.product_id, elem?.variation_id, elem?.line_key);
    } else {
      updateQuantity(elem?.product_id, elem?.variation_id, newQty, elem?.line_key);
    }
    setProductQty(newQty);
  }, [productQty, elem, updateQuantity, removeFromCart]);

  const handleIncrease = useCallback(() => {
    const newQty = productQty + 1;
    updateQuantity(elem?.product_id, elem?.variation_id, newQty, elem?.line_key);
    setProductQty(newQty);
  }, [productQty, elem, updateQuantity]);

  return (
    <div className="qty-box">
      <InputGroup>
        <span className="input-group-prepend" onClick={handleDecrease}>
          <Btn
            className="quantity-left-minus"
            id="quantity-left-minus"
            type="button"
          >
            {customIcon && productQty <= 1 ? customIcon : <RiSubtractLine />}
          </Btn>
        </span>
        <Input
          className="input-number qty-input"
          type="text"
          name="quantity"
          value={productQty}
          readOnly
        />
        <span className="input-group-prepend" onClick={handleIncrease}>
          <Btn
            className="quantity-left-plus"
            id="quantity-left-plus"
            type="button"
          >
            <RiAddLine />
          </Btn>
        </span>
      </InputGroup>
    </div>
  );
};

export default HandleQuantity;
