import { placeHolderImage } from "@/components/widgets/Placeholder";
import {
  getColorSpecificMedia,
  getFallbackMedia,
  getSelectedAttributeValueFromIds,
  getVariationAttribute,
} from "@/utils/productVariantMedia";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Slider from "react-slick";
import { Col, Row } from "reactstrap";
import { viewModalSliderOption } from "@/data/sliderSetting/SliderSetting";
import { RiVideoLine } from "react-icons/ri";

const LeftSideModal = ({ cloneVariation }) => {
  const [state, setState] = useState({ nav1: null, nav2: null });
  const [videoType, setVideoType] = useState(["video/mp4", "video/webm", "video/ogg"]);
  const [audioType, setAudioType] = useState(["audio/mpeg", "audio/wav", "audio/ogg"]);
  const slider1 = useRef();
  const slider2 = useRef();
  const { nav1, nav2 } = state;
  useEffect(() => {
    setState({
      nav1: slider1.current,
      nav2: slider2.current,
    });
  }, []);

  const variations =
    cloneVariation?.product?.variations || cloneVariation?.product?.variants || [];
  const selectedColor =
    getVariationAttribute(
      cloneVariation?.selectedVariation,
      cloneVariation?.product,
      "color"
    )?.value ||
    cloneVariation?.product?.matchi_locked_color_name ||
    getSelectedAttributeValueFromIds(
      cloneVariation?.product,
      cloneVariation?.variantIds,
      "color"
    ) ||
    "";

  const currentVariation = (() => {
    if (cloneVariation?.selectedVariation?.variation_galleries?.length) {
      return cloneVariation.selectedVariation.variation_galleries;
    }

    if (cloneVariation?.selectedVariation?.variation_image?.original_url) {
      return [cloneVariation.selectedVariation.variation_image];
    }

    if (selectedColor) {
      const colorSpecificMedia = getColorSpecificMedia(
        { ...cloneVariation?.product, variations, variants: variations },
        selectedColor,
        { strictGalleryMatch: false }
      );

      if (colorSpecificMedia.length) {
        return colorSpecificMedia;
      }
    }

    if (cloneVariation?.product?.matchi_locked_media?.length) {
      return cloneVariation.product.matchi_locked_media;
    }

    return getFallbackMedia(cloneVariation?.product);
  })();

  const galleryKey = `${cloneVariation?.product?.id || "product"}-${selectedColor || "default"}-${cloneVariation?.selectedVariation?.id || "none"}`;
  const thumbnailSlidesToShow =
    currentVariation.length <= 1
      ? 1
      : currentVariation.length < 3
      ? currentVariation.length
      : currentVariation.length - 1;

  return (
    <Col lg="6">
      <div className="sticky-top-custom position-relative top-0">
        <div className="thumbnail-image-slider">
          <Row className="g-sm-4 g-3">
            <Col xs="12">
              <div className="view-image-slider">
                <Slider key={`main-${galleryKey}`} asNavFor={nav2} ref={(slider) => (slider1.current = slider)}>
                  {currentVariation?.map((item, i) => (
                    <div className="slider-image" key={i}>
                      {videoType.includes(item.mime_type) ? (
                        <video className="w-100" controls>
                          <source src={item ? item?.original_url : ""} type={item?.mime_type}></source>
                        </video>
                      ) : audioType.includes(item?.mime_type) ? (
                        <div className="slider-main-img">
                          <audio controls>
                            <source src={item ? item.original_url : ""} type={item.mime_type}></source>
                          </audio>
                        </div>
                      ) : (
                        item?.original_url && <Image src={item ? item?.original_url : placeHolderImage} className="img-fluid" alt={cloneVariation?.product?.name} width={500} height={500} />
                      )}
                    </div>
                  ))}
                </Slider>
              </div>
            </Col>

            <Col xs="12">
              <div className="thumbnail-slider slider-nav no-arrow">
                <Slider key={`thumb-${galleryKey}`} {...viewModalSliderOption} adaptiveHeight={true} slidesToShow={thumbnailSlidesToShow} asNavFor={nav1} ref={(slider) => (slider2.current = slider)}>
                  {currentVariation?.map((item, i) => (
                    <div className="slider-image" key={i}>
                      {videoType.includes(item.mime_type) ? (
                        <>
                          <div className="video-icon">
                            <RiVideoLine />
                          </div>
                          <video className="w-100 ">
                            <source src={item ? item?.original_url : ""} type={item?.mime_type}></source>
                          </video>
                        </>
                      ) : audioType.includes(item?.mime_type) ? (
                        <div className="slider-main-img">
                          <audio controls>
                            <source src={item ? item.original_url : ""} type={item.mime_type}></source>
                          </audio>
                        </div>
                      ) : (
                        item?.original_url && <Image src={item ? item?.original_url : placeHolderImage} className="img-fluid" alt={cloneVariation?.product?.name} width={500} height={500} />
                      )}
                    </div>
                  ))}
                </Slider>
              </div>
            </Col>
          </Row>
        </div>
      </div>
    </Col>
  );
};

export default LeftSideModal;
