import { useSettings } from "@/utils/hooks/useSettings";
import { localizedValue } from "@/utils/constants";
import Link from "next/link";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import Avatar from "../widgets/Avatar";
import { placeHolderImage } from "../widgets/Placeholder";

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

const CartProductDetail = ({ elem }) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { settingData } = useSettings();
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };

  const imageUrl = getCartImageUrl(elem);

  return (
    <td>
      <Link href={`/product/${elem?.product?.slug}`} className="product-image">
        <Avatar customClass="product-image" customImageClass={"img-fluid"} data={{ original_url: imageUrl }} placeHolder={placeHolderImage} name={localizedValue(elem?.product, 'name', lang)} />
      </Link>
    </td>
  );
};

export default CartProductDetail;
