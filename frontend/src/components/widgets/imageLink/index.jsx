// ProductIdsContext removed - not needed
import { Href, storageURL } from "@/utils/constants";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const PLACEHOLDER_IMAGE = "/assets/images/placeholder.png";

// Helper to get proper image URL - handles full URLs, local assets, and relative paths
const getImageUrl = (imageUrl, placeholder) => {
  if (!imageUrl || (typeof imageUrl === "string" && !imageUrl.trim())) {
    return placeholder || PLACEHOLDER_IMAGE;
  }
  // If already a full URL, return as-is
  if (typeof imageUrl === "string" && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
    return imageUrl;
  }
  // If it's a local asset (starts with /assets/), return as-is (Next.js public folder)
  if (typeof imageUrl === "string" && imageUrl.startsWith("/assets/")) {
    return imageUrl;
  }
  // If it starts with assets/ without slash
  if (typeof imageUrl === "string" && imageUrl.startsWith("assets/")) {
    return `/${imageUrl}`;
  }
  // Otherwise prepend storage URL for backend storage files
  return `${storageURL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

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
  onImageError,
}) => {
  const [bgImage, setBgImage] = useState(bgImg);
  const [hasError, setHasError] = useState(false);

  const redirectToProduct = (productId) => {
    // Product lookup removed - use direct product slug if available
    return productId ? `/product/${productId}` : null;
  };

  const productRoute =
    imgUrl?.redirect_link?.link_type === "product"
      ? redirectToProduct(imgUrl?.redirect_link?.link)
      : null;

  // Get the resolved image URL with error fallback
  const resolvedImageUrl = hasError
    ? (placeholder || PLACEHOLDER_IMAGE)
    : getImageUrl(imgUrl?.image_url, placeholder || PLACEHOLDER_IMAGE);

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      onImageError?.();
    }
  };

  const imageProps = {
    src: resolvedImageUrl,
    className: "bg-img w-100 img-fluid",
    alt: "banner",
    height,
    width,
    priority,
    loading,
    sizes: "100vw",
    unoptimized: true,
    onError: handleImageError,
  };

  const renderImage = () => {
    if (bgImage) {
      return (
        <div
          className={`bg-size ${classes}`}
          style={{ backgroundImage: `url(${resolvedImageUrl})` }}
        />
      );
    }
    return <Image {...imageProps} />;
  };

  return (
    <>
      {imgUrl?.redirect_link?.link_type === "external_url" ? (
        <Link className="h-100" href={imgUrl?.redirect_link?.link || "/"} target="_blank">
          {renderImage()}
        </Link>
      ) : imgUrl?.redirect_link?.link_type === "collection" && !homeBanner ? (
        <Link className="h-100" href={imgUrl?.redirect_link?.link || Href} target="_blank">
          {renderImage()}
        </Link>
      ) : imgUrl?.redirect_link?.link_type === "collection" && homeBanner ? (
        <Link className="h-100" href={imgUrl?.redirect_link?.link ? `/category/${imgUrl?.redirect_link?.link}` : Href}>
          {renderImage()}
        </Link>
      ) : imgUrl?.redirect_link?.link_type === "product" && productRoute ? (
        <Link className="h-100" href={`/${productRoute}`}>
          {renderImage()}
        </Link>
      ) : (
        renderImage()
      )}
    </>
  );
};

export default ImageLink;
