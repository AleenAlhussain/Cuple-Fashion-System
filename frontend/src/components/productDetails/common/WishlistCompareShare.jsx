import ThemeOptionContext from "@/context/themeOptionsContext";
import { audioFile } from "@/utils/constants";
import { useWishlistState } from "@/states";
import React, { useContext, useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RiHeartFill, RiHeartLine, RiShareLine } from "react-icons/ri";
import ShareModal from "./ShareModal";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const WishlistCompareShare = ({ productState }) => {
  const { addToWishlist, removeFromWishlist, isInWishlist, initWishlist } = useWishlistState();
  const [productWishlist, setProductWishlist] = useState(false);
  const audioRef = useRef(null);
  const { t } = useTranslation("common");
  const { setOpenAuthModal } = useContext(ThemeOptionContext);
  const [modal, setModal] = useState(false);

  // Initialize stores
  useEffect(() => {
    initWishlist();
    if (typeof window !== "undefined") {
      audioRef.current = new Audio(audioFile);
    }
  }, []);

  // Check if product is in wishlist
  useEffect(() => {
    if (productState?.product?.id) {
      setProductWishlist(isInWishlist(productState.product.id));
    }
  }, [productState?.product?.id, isInWishlist]);

  const handelWishlist = () => {
    const product = productState?.product;
    if (!product) return;

    // Play audio
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    if (productWishlist) {
      removeFromWishlist(product.id);
      setProductWishlist(false);
      ToastNotification("success", "Removed from wishlist");
    } else {
      addToWishlist(product);
      setProductWishlist(true);
      ToastNotification("success", "Added to wishlist");
    }
  };

  return (
    <>
      <div className="buy-box">
        <a onClick={handelWishlist}>
          {productWishlist ? <RiHeartFill /> : <RiHeartLine />}
          <span>{t("AddToWishlist")}</span>
        </a>
        {productState?.product?.social_share ? (
          <a onClick={() => setModal(true)}>
            <RiShareLine />
            <span>{t("Share")}</span>
          </a>
        ) : null}
      </div>
      <ShareModal productState={productState} modal={modal} setModal={setModal} />
    </>
  );
};

export default WishlistCompareShare;
