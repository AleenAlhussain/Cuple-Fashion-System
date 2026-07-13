import ThemeOptionContext from "@/context/themeOptionsContext";
import Btn from "@/elements/buttons/Btn";
import { audioFile, Href } from "@/utils/constants";
import { useWishlistState } from "@/states";
import React, { useState, useContext, useEffect, useRef } from "react";
import { RiHeartFill, RiHeartLine } from "react-icons/ri";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const WishlistButton = ({ productstate, customClass, hideAction, customAnchor }) => {
  const { addToWishlist, removeFromWishlist, isInWishlist, initWishlist } = useWishlistState();
  const [productWishlist, setProductWishlist] = useState(false);
  const audioRef = useRef(null);
  const { setOpenAuthModal } = useContext(ThemeOptionContext);

  // Initialize wishlist and check if product is in wishlist
  useEffect(() => {
    initWishlist();
  }, []);

  useEffect(() => {
    if (productstate?.id) {
      setProductWishlist(isInWishlist(productstate.id));
    }
  }, [productstate?.id, isInWishlist]);

  const handelWishlist = (product) => {
    // Play audio
    if (!audioRef.current) {
      audioRef.current = new Audio(audioFile);
    }
    audioRef.current.play().catch(() => {});

    if (productWishlist) {
      // Remove from wishlist
      removeFromWishlist(product.id);
      setProductWishlist(false);
      ToastNotification("success", "Removed from wishlist");
    } else {
      // Add to wishlist
      addToWishlist(product);
      setProductWishlist(true);
      ToastNotification("success", "Added to wishlist");
    }
  };
  return (
    <>
      {customClass ? (
        <Btn className={customClass ? customClass : ""} onClick={() => handelWishlist(productstate)}>
          {productWishlist ? <RiHeartFill className="theme-color" /> : <RiHeartLine />}
        </Btn>
      ) : customAnchor ? (
        <a href={Href} title="Add to Wishlist" className={`wishlist-icon ${productWishlist ? "theme-color" : ""}`} onClick={() => handelWishlist(productstate)}>
          <i className={`ri-heart-${productWishlist ? "fill" : "line"}`}></i>
        </a>
      ) : (
        !hideAction?.includes("wishlist") && (
          <div title="Wishlist" onClick={() => handelWishlist(productstate)} className="wishlist-icon">
            <a className={"heart-icon"}>{productWishlist ? <RiHeartFill className="theme-color" /> : <RiHeartLine />}</a>
          </div>
        )
      )}
    </>
  );
};

export default WishlistButton;
