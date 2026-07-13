import { ImagePath, storageURL } from "@/utils/constants";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

const PLACEHOLDER_IMAGE = "/assets/images/placeholder.png";

const ImageVariant = ({
  item,
  variant = "image_zoom",
  thumbnail,
  gallery_images,
  product,
  width,
  height,
}) => {
  const [hasError, setHasError] = useState(false);

  // Support both old format (object with original_url) and new format (string URL directly)
  const getImageUrl = (img) => {
    if (!img) return PLACEHOLDER_IMAGE;

    let url = img;
    if (typeof img === "object" && img.original_url) {
      url = img.original_url;
    }

    if (typeof url === "string" && url.trim()) {
      // If URL already starts with http, use it directly
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }
      // If it's a local asset path
      if (url.startsWith("/assets/") || url.startsWith("assets/")) {
        return url.startsWith("/") ? url : `/${url}`;
      }
      // Otherwise, prepend the storage URL
      return `${storageURL}${url.startsWith("/") ? "" : "/"}${url}`;
    }

    return PLACEHOLDER_IMAGE;
  };

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
    }
  };

  // Support both slug and article for product URL
  const productSlug = product?.slug || product?.article;
  // Support both name and title for alt text
  const productName = product?.name || product?.title || "Product";

  const imageUrl = hasError ? PLACEHOLDER_IMAGE : getImageUrl(thumbnail);

  const imageProps = {
    src: imageUrl,
    className: "img-fluid bg-img",
    alt: productName,
    width: width || 750,
    height: height || 750,
    onError: handleImageError,
    unoptimized: true,
  };

  return (
    <>
      {variant === "image_slider" ? (
        <Slider
          {...customOptions}
          onMouseLeave={stopAutoplay}
          onMouseEnter={startAutoplay}
        >
          {(product?.product_galleries || gallery_images)?.map(
            (image, index) => (
              <Image key={index} {...imageProps} />
            )
          )}
        </Slider>
      ) : variant === "image_flip" ? (
        <div className="flip">
          {flipImage?.slice(0, 2)?.map((image, index) => (
            <div key={index} className={index == 0 ? "front" : "back"}>
              <Link href={`/product/${productSlug}`}>
                <Image {...imageProps} />
              </Link>
            </div>
          ))}
        </div>
      ) : variant === "image_zoom" ? (
        <div className="zoom">
          <Link href={`/product/${productSlug}`}>
            <Image {...imageProps} />
          </Link>
        </div>
      ) : (
        <Link href={`/product/${productSlug}`}>
          <Image {...imageProps} />
        </Link>
      )}
    </>
  );
};

export default ImageVariant;
