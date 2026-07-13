import ThemeOptionContext from "@/context/themeOptionsContext";
import { useCartState } from "@/states";
import React, { useContext } from "react";
import { RiShoppingCartLine } from "react-icons/ri";

const AddToCartHoverButton = ({ productstate, hideAction }) => {
  const { setCartCanvas } = useContext(ThemeOptionContext);
  const { addToCart } = useCartState();

  const handleAddToCart = () => {
    // Get first variant if available
    const firstVariant = productstate?.variants?.[0] || null;

    // Add to cart
    addToCart(productstate, 1, firstVariant);

    // Open cart sidebar
    setCartCanvas(true);
  };

  if (hideAction?.includes("cart")) {
    return null;
  }

  return (
    <div title="Add to Cart" onClick={handleAddToCart}>
      <a>
        <RiShoppingCartLine />
      </a>
    </div>
  );
};

export default AddToCartHoverButton;
