import { placeHolderImage } from "@/components/widgets/Placeholder";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ImageZoom from "react-image-zooom";
import Slider from "react-slick";
import { Col, Row } from "reactstrap";
import SlickArrowLeft from "../common/SlickArrowLeft";
import SlickArrowRight from "../common/SlickArrowRight";

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

const MainImageSlider = ({ productState, nav2, sliderRef1, setNav1 }) => {
  const { t } = useTranslation("common");
  const [videoType, setVideoType] = useState(["video/mp4", "video/webm", "video/ogg"]);
  const [audioType, setAudioType] = useState(["audio/mpeg", "audio/wav", "audio/ogg"]);

  // Get images from variation or product
  const getImages = () => {
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

  const currentVariation = getImages();

  useEffect(() => {
    setNav1(sliderRef1);
  }, []);

  return (
    <div className="sticky-top-custom">
      <div className=" thumbnail-image-slider">
        <Row className="g-sm-4 g-3">
          <Col xs="12">
            <div className="product-slick position-relative">
              {productState?.product?.is_sale_enable || productState?.product?.is_trending || productState?.product?.is_featured ? (
                <ul className="product-detail-label">
                  {productState?.product.is_sale_enable ? <li className="soldout">{t("Sale")}</li> : ""}
                  {productState?.product.is_trending ? <li className="trending">{t("Trending")}</li> : ""}
                  {productState?.product.is_featured ? <li className="featured">{t("Featured")}</li> : ""}
                </ul>
              ) : null}

              <Slider adaptiveHeight={true} asNavFor={nav2} ref={(slider) => (sliderRef1 = slider)} prevArrow={<SlickArrowLeft />} nextArrow={<SlickArrowRight />}>
                {currentVariation?.map((image, i) => (
                  <div key={i}>
                    <div className="slider-image">
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
                        <ImageZoom zoom="200" src={getProperImageUrl(image?.original_url)} alt={image?.name || "Product image"} className="img-fluid" height={670} width={670} />
                      )}
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default MainImageSlider;
