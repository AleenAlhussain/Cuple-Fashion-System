import ThemeOptionContext from "@/context/themeOptionsContext";
import { Href } from "@/utils/constants";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import React from "react";
import { RiHeartFill, RiHeartLine } from "react-icons/ri";

const AddToWishlist = ({ productObj, customClass }) => {
  const router = useRouter();
  const { setOpenAuthModal } = useContext(ThemeOptionContext);
  const handelWishlist = (productObj) => {
    if (Cookies.get("uat")) {
      // Put your logic here
      router.push("/wishlist");
    } else {
      setOpenAuthModal(true);
      ToastNotification("error", "Unauthenticated");
    }
  };
  return (
    <>
      {customClass ? (
        <a onClick={() => handelWishlist(productObj)} href={Href} className={customClass ? customClass : ""}>
          {productObj.is_wishlist ? <RiHeartFill className="theme-color" /> : <RiHeartLine />}
        </a>
      ) : (
        <li title="Wishlist" onClick={() => handelWishlist(productObj)}>
          <a className={"heart-icon"}>{productObj.is_wishlist ? <RiHeartFill className="theme-color" /> : <RiHeartLine />}</a>
        </li>
      )}
    </>
  );
};

export default AddToWishlist;
