import RatioImage from "@/utils/RatioImage";
import Image from "next/image";
import Link from "next/link";
import { useContext } from "react";

const ImageLink = ({
  classes = {},
  imgUrl,
  placeholder,
  link,
  height,
  width,
  homeBanner = true,
  bgImg = false,
  priority = false,
  loading = "lazy",
}) => {

  const redirectToProduct = (productId) => {
    const product = filteredProduct.find((elem) => elem?.id == productId);
    return "product/" + product?.slug;
  };
  return (
    <div className={`${classes?.customClass ? classes?.customClass : ""}`}>
      {link?.redirect_link?.link_type === "external_url" ? (
        <Link href={link?.redirect_link?.link || "/"} target="_blank">
          <div className={`${classes?.customHoverClass ? classes?.customHoverClass : "home-contain hover-effect"}`}>{ratioImage ? <RatioImage src={imgUrl} className={`bg-img ${customRatioClass}`} alt="banner" /> : imgUrl && <Image src={imgUrl} className={`img-fluid ${customRatioClass}`} alt="banner" height={height} width={width} />}</div>
        </Link>
      ) : link?.redirect_link?.link_type === "collection" ? (
        <Link href={`/collections?category=${link?.redirect_link?.link}` || "/"}>
          <div className={`${classes?.customHoverClass ? classes?.customHoverClass : "home-contain hover-effect"}`}>{ratioImage ? <RatioImage src={imgUrl} className={`bg-img ${customRatioClass}`} alt="banner" /> : imgUrl && <Image src={imgUrl} className={`img-fluid ${customRatioClass}`} alt="banner" height={height} width={width} />}</div>
        </Link>
      ) : link?.redirect_link?.link_type === "product" ? (
        <Link href={`/${redirectToProduct(link?.redirect_link?.link)}` || "/"}>
          <div className={`${classes?.customHoverClass ? classes?.customHoverClass : "home-contain hover-effect"}`}>{ratioImage ? <RatioImage src={imgUrl} className={`bg-img ${customRatioClass}`} alt="banner" /> : imgUrl && <Image src={imgUrl} className={`img-fluid ${customRatioClass}`} alt="banner" height={height} width={width} />}</div>
        </Link>
      ) : (
        <div className={`${classes?.customHoverClass ? classes?.customHoverClass : "home-contain hover-effect"}`}>{ratioImage ? <RatioImage src={imgUrl} className={`bg-img ${customRatioClass}`} alt="banner" /> : imgUrl && <Image src={imgUrl} className={`img-fluid ${customRatioClass}`} alt="banner" height={height} width={width} />}</div>
      )}
    </div>
  );
};

export default ImageLink;
