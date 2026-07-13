import { placeHolderImage } from "@/components/widgets/Placeholder";
import Image from "next/image";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

// Helper to get proper image URL
const getProperImageUrl = (url) => {
  if (!url) return placeHolderImage;

  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }

  if (typeof url === 'string' && url.startsWith('/assets/')) {
    return url;
  }

  if (typeof url === 'string' && url.length > 0) {
    const hasExtension = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i.test(url);
    const hasPathIndicator = url.includes('/') || url.includes('\\') || url.startsWith('storage');

    if (!hasExtension && !hasPathIndicator) {
      return placeHolderImage;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_IMAGE_URL || process.env.BACKEND_IMAGE_URL || '';
    return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  return placeHolderImage;
};

const FourImage = ({ productState }) => {
  const [videoType, setVideoType] = useState(["video/mp4", "video/webm", "video/ogg"]);
  const [audioType, setAudioType] = useState(["audio/mpeg", "audio/wav", "audio/ogg"]);
  const { t } = useTranslation("common");

  // Get image galleries - support both variation and product galleries
  const getImageGalleries = () => {
    if (productState?.selectedVariation?.variation_galleries?.length > 0) {
      return productState.selectedVariation.variation_galleries;
    }
    if (productState?.product?.product_galleries?.length > 0) {
      return productState.product.product_galleries;
    }
    if (productState?.product?.images?.length > 0) {
      return productState.product.images.map((img) => ({
        id: img.id,
        original_url: img.image_url || img.image || img.original_url,
        name: img.alt_text || `Product Image ${img.id}`,
        mime_type: "image/jpeg",
      }));
    }
    return [];
  };

  const galleries = getImageGalleries();

  return (
    <div className="custom-2-grid sticky-top-product">
      {galleries.map((image, i) => (
        <div className="four-image-sec" key={i}>
          <div className="slider-image w-100 h-100 d-flex align-items-center justify-content-center">
            {videoType.includes(image?.mime_type) ? (
              <video className="w-100" controls>
                <source src={getProperImageUrl(image?.original_url)} type={image?.mime_type}></source>
              </video>
            ) : audioType.includes(image?.mime_type) ? (
              <div className="slider-main-img">
                <audio controls>
                  <source src={getProperImageUrl(image?.original_url)} type={image?.mime_type}></source>
                </audio>
              </div>
            ) : (
              <Image
                src={getProperImageUrl(image?.original_url)}
                alt={image?.name || "Product image"}
                className="img-fluid w-100"
                height={320}
                width={320}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FourImage;
