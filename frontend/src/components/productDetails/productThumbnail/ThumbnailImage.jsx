import { placeHolderImage } from "@/components/widgets/Placeholder";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiHeadphoneLine, RiVideoLine } from "react-icons/ri";
import ImageZoom from "react-image-zooom";
import Slider from "react-slick";
import { Col, Row } from "reactstrap";
import DigitalImageOptions from "../common/DigitalImageOptions";
import SlickArrowLeft from "../common/SlickArrowLeft";
import SlickArrowRight from "../common/SlickArrowRight";

// Helper to get proper image URL
const getProperImageUrl = (url) => {
  if (!url) return placeHolderImage;

  // If it's already a full URL, return as-is
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }

  // If it's a local asset path
  if (typeof url === 'string' && url.startsWith('/assets/')) {
    return url;
  }

  // Check if it looks like a valid file path (has extension or path separator)
  if (typeof url === 'string' && url.length > 0) {
    const hasExtension = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i.test(url);
    const hasPathIndicator = url.includes('/') || url.includes('\\') || url.startsWith('storage');

    // If it doesn't look like a file path, return placeholder
    if (!hasExtension && !hasPathIndicator) {
      return placeHolderImage;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_IMAGE_URL || process.env.BACKEND_IMAGE_URL || '';
    return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  return placeHolderImage;
};

const norm = (s) => (s || "").toString().trim().toLowerCase();
const colorNorm = (s) => norm(s).replace(/[^a-z]/g, "");

function collapseRepeatedColorToken(value) {
  const token = colorNorm(value);
  if (!token || token.length % 2 !== 0) return token;

  const half = token.slice(0, token.length / 2);
  return half === token.slice(token.length / 2) ? half : token;
}

function colorsMatch(left, right) {
  const leftAliases = new Set(
    [colorNorm(left), collapseRepeatedColorToken(left)].filter(Boolean)
  );
  const rightAliases = new Set(
    [colorNorm(right), collapseRepeatedColorToken(right)].filter(Boolean)
  );

  for (const alias of leftAliases) {
    if (rightAliases.has(alias)) return true;
  }

  return false;
}

function parseImageMeta(url) {
  const u = (url || "").toString();
  const clean = u.split("?")[0];
  const filename = decodeURIComponent(clean.split("/").pop() || "");
  const extOk = /\.(webp|jpg|jpeg|png|avif)$/i.test(filename);
  if (!extOk) return { url: u, color: "", pos: 999, key: norm(u) };

  const base = filename.replace(/\.(webp|jpg|jpeg|png|avif)$/i, "");

  // 1) If ends with "(n)"
  let m = base.match(/\((\d+)\)\s*$/);
  if (m) {
    const pos = parseInt(m[1], 10);
    const left = base.replace(/\((\d+)\)\s*$/, "").trim();

    // try color after last hyphen " - COLOR" or "-COLOR"
    const mColor = left.match(/-\s*([A-Za-z ]+)\s*$/);
    return {
      url: u,
      color: mColor ? colorNorm(mColor[1]) : "",
      pos: Number.isFinite(pos) ? pos : 999,
      key: norm(u),
    };
  }

  // 2) If ends with "-n" (take last number)
  m = base.match(/-(\d+)\s*$/);
  if (m) {
    const pos = parseInt(m[1], 10);
    const left = base.replace(/-(\d+)\s*$/, "");

    // color could be last segment after hyphen, but only if it's letters (or letters+space)
    const mColor = left.match(/-([A-Za-z][A-Za-z -]*)\s*$/);
    return {
      url: u,
      color: mColor ? colorNorm(mColor[1]) : "",
      pos: Number.isFinite(pos) ? pos : 999,
      key: norm(u),
    };
  }

  // 3) Supports "...COLORn" and "...COLORn-hash" or "...COLOR-n-hash"
  m = base.match(/-([A-Za-z][A-Za-z -]*?)(?:-)?(\d+)(?:-[A-Za-z0-9]+)*\s*$/);
  if (m) {
    const pos = parseInt(m[2], 10);
    return {
      url: u,
      color: colorNorm(m[1]),
      pos: Number.isFinite(pos) ? pos : 999,
      key: norm(u),
    };
  }

  // fallback
  return { url: u, color: "", pos: 999, key: norm(u) };
}

function dedupeByUrl(urls) {
  const seen = new Set();
  return urls.filter((u) => {
    const k = norm(u);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function normalizeGalleryOrder(rawGalleries) {
  const urls = (rawGalleries || [])
    .map((img) => img?.url || img?.image_url || img?.original_url || img)
    .filter(Boolean);

  const unique = dedupeByUrl(urls);
  const metas = unique.map(parseImageMeta);

  const hasAnyPos = metas.some((m) => m.pos !== 999);

  // ✅ Can't detect ordering => keep Admin order
  if (!hasAnyPos) return unique;

  // ✅ Sort only when pos is available; unknowns go to the end but keep stable-ish
  return metas
    .slice()
    .sort((a, b) => {
      // both unknown
      if (a.pos === 999 && b.pos === 999) return 0;
      // push unknown after known
      if (a.pos === 999) return 1;
      if (b.pos === 999) return -1;

      // if both have no color => pos only
      if (!a.color && !b.color) return a.pos - b.pos;

      // color grouping
      if (a.color && !b.color) return -1;
      if (!a.color && b.color) return 1;

      if (a.color < b.color) return -1;
      if (a.color > b.color) return 1;
      return a.pos - b.pos;
    })
    .map((x) => x.url);
}

function buildColorOnlyGallery(product, selectedColor, variationImageUrl = "") {
  const colorKey = colorNorm(selectedColor);
  const orderedUrls = normalizeGalleryOrder(product?.product_galleries);

  if (!colorKey) return orderedUrls;

  const matched = orderedUrls
    .map(parseImageMeta)
    .filter((x) => x.color && colorsMatch(x.color, colorKey))
    .map((x) => x.url);

  if (matched.length) return matched;

  const variationToken = parseImageMeta(variationImageUrl)?.color || "";
  const matchedByVariation = orderedUrls
    .map(parseImageMeta)
    .filter((x) => x.color && colorsMatch(x.color, variationToken))
    .map((x) => x.url);

  return matchedByVariation.length ? matchedByVariation : orderedUrls;
}

const ThumbnailProductImage = ({ productState, slideToShow }) => {
  const { t, i18n } = useTranslation("common");
  const [state, setState] = useState({ nav1: null, nav2: null });
  const [videoType, setVideoType] = useState([
    "video/mp4",
    "video/webm",
    "video/ogg",
  ]);
  const [audioType, setAudioType] = useState([
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
  ]);
  const slider1 = useRef();
  const slider2 = useRef();
  const initialImageResetKeysRef = useRef(new Set());
  const { nav1, nav2 } = state;
  // Helper to find selected color from variation
  const getSelectedColor = () => {
    if (!productState?.selectedVariation?.attribute_values) return null;
    const colorAttr = productState.selectedVariation.attribute_values.find((av) => {
      const attrName = av.attribute?.name?.toLowerCase() || '';
      const attrSlug = av.attribute?.slug?.toLowerCase() || '';
      return attrName === 'color' || attrSlug === 'color';
    });
    return colorAttr?.value || null;
  };

  // Helper to filter images by color name
  const filterImagesByColor = (images, colorName) => {
    const orderedUrls = normalizeGalleryOrder(images);
    const colorKey = colorNorm(colorName);

    const filteredUrls = orderedUrls
      .map(parseImageMeta)
      .filter((x) => (!colorKey ? true : x.color === colorKey))
      .map((x) => x.url);

    return filteredUrls.map((url, index) => ({
      id: `color-${index}`,
      original_url: url,
      name: `Product Image ${index + 1}`,
      mime_type: "image/jpeg",
    }));
  };

  // Support both variation galleries and main product galleries
  const getImageGalleries = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_IMAGE_URL || process.env.BACKEND_IMAGE_URL || "";
    const selectedColor = getSelectedColor();
    const selectedVariationImageUrl =
      productState?.selectedVariation?.variation_image?.original_url || "";
    const selectedVariationImage = selectedVariationImageUrl
      ? [
          {
            id: `variation-${productState?.selectedVariation?.id || "selected"}`,
            original_url: selectedVariationImageUrl,
            name: `${selectedColor || "Variant"} Image`,
            mime_type: "image/jpeg",
          },
        ]
      : [];

    // Priority 1: Selected variation galleries (already filtered by color in transformation)
    if (productState?.selectedVariation?.variation_galleries?.length > 0) {
      return productState.selectedVariation.variation_galleries;
    }

    if (selectedColor) {
      // Strict color mode: do not fallback to other color images.
      if (productState?.product?.product_galleries?.length > 0) {
        const colorOnlyUrls = buildColorOnlyGallery(
          productState.product,
          selectedColor,
          selectedVariationImageUrl
        );
        const galleryItems = colorOnlyUrls.map((url, index) => ({
          id: `gallery-${index}`,
          original_url: url,
          name: `${selectedColor} Image ${index + 1}`,
          mime_type: "image/jpeg",
        }));
        const combined = [...selectedVariationImage, ...galleryItems];
        const seen = new Set();
        return combined.filter((item) => {
          const key = norm(item?.original_url);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      if (selectedVariationImage.length > 0) {
        return selectedVariationImage;
      }

      if (productState?.product?.images?.length > 0) {
        const mappedImages = productState.product.images.map((img) => ({
          id: img.id,
          original_url: img.image_url || img.image || img.original_url,
          name: img.alt_text || `Product Image ${img.id}`,
          mime_type: "image/jpeg",
        }));
        return filterImagesByColor(mappedImages, selectedColor);
      }

      if (productState?.product?.media?.length > 0) {
        const mappedMedia = productState.product.media.map((media) => ({
          id: media.id,
          original_url: media.url.startsWith('http') ? media.url : `${backendUrl}${media.url}`,
          name: `Product Image ${media.id}`,
          mime_type: "image/jpeg",
        }));
        return filterImagesByColor(mappedMedia, selectedColor);
      }

      return [];
    }

    // Non-color products fallback behavior
    if (productState?.product?.product_galleries?.length > 0) {
      return filterImagesByColor(productState.product.product_galleries, selectedColor);
    }

    if (productState?.product?.images?.length > 0) {
      const mappedImages = productState.product.images.map((img) => ({
        id: img.id,
        original_url: img.image_url || img.image || img.original_url,
        name: img.alt_text || `Product Image ${img.id}`,
        mime_type: "image/jpeg",
      }));
      return filterImagesByColor(mappedImages, selectedColor);
    }

    if (productState?.product?.media?.length > 0) {
      const mappedMedia = productState.product.media.map((media) => ({
        id: media.id,
        original_url: media.url.startsWith('http') ? media.url : `${backendUrl}${media.url}`,
        name: `Product Image ${media.id}`,
        mime_type: "image/jpeg",
      }));
      return filterImagesByColor(mappedMedia, selectedColor);
    }

    // Priority 5: Product thumbnail as array
    if (productState?.product?.product_thumbnail?.original_url) {
      return [productState.product.product_thumbnail];
    }

    // Priority 6: Main image from product
    if (productState?.product?.main_image) {
      return [{
        id: 'main',
        original_url: productState.product.main_image.startsWith('http')
          ? productState.product.main_image
          : `${backendUrl}${productState.product.main_image}`,
        name: 'Main Product Image',
        mime_type: "image/jpeg",
      }];
    }

    // Priority 7: Selected variation image as array
    if (productState?.selectedVariation?.variation_image?.original_url) {
      return [productState.selectedVariation.variation_image];
    }

    return [];
  };

  const selectedColor = getSelectedColor();
  const currentVariation = getImageGalleries();
  const isRTL =
    i18n?.language === "ar" ||
    (typeof document !== "undefined" && document.dir === "rtl");

  // Create a unique key for slider based on color and variation
  const sliderKey = `${selectedColor || 'default'}-${productState?.selectedVariation?.id || 'none'}`;

  const goToSlide = (idx) => {
    if (!currentVariation.length) return;
    slider1.current?.slickGoTo?.(idx, true);
    slider2.current?.slickGoTo?.(idx, true);
  };

  const resetToFirstSlide = () => {
    slider1.current?.slickGoTo?.(0, true);
    slider2.current?.slickGoTo?.(0, true);
  };

  const handleInitialImageLoad = (loadedSrc) => {
    const src = loadedSrc || getProperImageUrl(currentVariation?.[0]?.original_url);
    if (!src) return;

    const resetKey = `${sliderKey}::${src}`;
    if (initialImageResetKeysRef.current.has(resetKey)) return;

    initialImageResetKeysRef.current.add(resetKey);
    resetToFirstSlide();
  };

  // Initialize and update slider references
  useEffect(() => {
    if (slider1.current && slider2.current) {
      setState({
        nav1: slider1.current,
        nav2: slider2.current,
      });
    }
  }, [currentVariation.length, sliderKey]);

  // Keep main and thumbnail sliders synchronized on first image.

  useEffect(() => {
    const timer = setTimeout(() => {
      if (productState?.selectedVariation && currentVariation.length > 0) {
        try {
          resetToFirstSlide();
        } catch (error) {
          console.warn("Slider navigation error:", error);
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [
    productState?.selectedVariation?.id,
    selectedColor,
    currentVariation.length,
  ]);

  // Fallback in case zoom library doesn't expose image onLoad events reliably.
  useEffect(() => {
    const firstImage = currentVariation?.[0];
    if (!firstImage) return;
    if (
      videoType.includes(firstImage?.mime_type) ||
      audioType.includes(firstImage?.mime_type)
    ) {
      return;
    }
    if (typeof window === "undefined") return;

    const firstSrc = getProperImageUrl(firstImage?.original_url);
    if (!firstSrc) return;

    const resetKey = `${sliderKey}::${firstSrc}`;
    if (initialImageResetKeysRef.current.has(resetKey)) return;

    let cancelled = false;
    const preloadImage = new window.Image();
    preloadImage.onload = () => {
      if (!cancelled) {
        handleInitialImageLoad(firstSrc);
      }
    };
    preloadImage.src = firstSrc;

    return () => {
      cancelled = true;
    };
  }, [
    sliderKey,
    currentVariation?.[0]?.original_url,
    currentVariation?.[0]?.mime_type,
  ]);


  let mainSliderSettings = {
    adaptiveHeight: true,
    arrows: currentVariation.length > 1,
    infinite: false,
    initialSlide: 0,
    rtl: isRTL,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  let thumbnailSlider = {
    loop: false,
    focusOnSelect: false,
    arrows: false,
    initialSlide: 0,
    rtl: isRTL,
    swipeToSlide: true,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 4,
        },
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 450,
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  };

  return (
    <div className="sticky-top-custom">
      <div className="thumbnail-image-slider">
        <Row className="g-sm-4 g-3">
          <Col xs={12}>
            <div
              className={`product-slick position-relative main-product-box ${currentVariation.length <= 1 ? "no-arrow" : ""
                }`}
            >
              {productState?.product?.is_sale_enable ||
                productState?.product?.is_trending ||
                productState?.product?.is_featured ? (
                <ul className="product-detail-label">
                  {productState?.product.is_sale_enable ? (
                    <li className="soldout">{t("Sale")}</li>
                  ) : (
                    ""
                  )}
                  {productState?.product.is_trending ? (
                    <li className="trending">{t("Trending")}</li>
                  ) : (
                    ""
                  )}
                  {productState?.product.is_featured ? (
                    <li className="featured">{t("Featured")}</li>
                  ) : (
                    ""
                  )}
                </ul>
              ) : null}

              {currentVariation.length > 0 ? (
                <Slider
                  key={`main-slider-${sliderKey}`}
                  {...mainSliderSettings}
                  asNavFor={currentVariation.length > 1 && nav2 ? nav2 : undefined}
                  ref={slider1}
                  prevArrow={<SlickArrowLeft />}
                  nextArrow={<SlickArrowRight />}
                >
                  {currentVariation.map((image, i) => (
                    <div key={i}>
                      <div className="slider-image">
                        {videoType.includes(image?.mime_type) ? (
                          <>
                            <video className="w-100 " controls>
                              <source
                                src={image ? image?.original_url : ""}
                                type={image?.mime_type}
                              ></source>
                            </video>
                          </>
                        ) : audioType.includes(image?.mime_type) ? (
                          <div className="slider-main-img">
                            <audio controls>
                              <source
                                src={image ? image.original_url : ""}
                                type={image.mime_type}
                              ></source>
                            </audio>
                          </div>
                        ) : (
                          <ImageZoom
                            src={getProperImageUrl(image?.original_url)}
                            alt={image?.name || "Product image"}
                            zoom="200"
                            className="img-fluid"
                            height={670}
                            width={670}
                            onLoad={
                              i === 0
                                ? () =>
                                  handleInitialImageLoad(
                                    getProperImageUrl(image?.original_url)
                                  )
                                : undefined
                            }
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </Slider>
              ) : (
                <img
                  src={getProperImageUrl(productState?.product?.product_thumbnail?.original_url)}
                  className="img-fluid"
                  alt={productState?.product?.name || "Product"}
                />
              )}

              {productState?.product?.product_type == "digital" && (
                <DigitalImageOptions product={productState?.product} />
              )}
            </div>
          </Col>
          <Col xs={12}>
            {currentVariation.length > 1 && (
              <Slider
                key={`thumb-slider-${sliderKey}`}
                {...thumbnailSlider}
                className="slider-nav thumbnail-slider-box"
                asNavFor={nav1 || undefined}
                ref={slider2}
                slidesToShow={Math.min(
                  currentVariation.length,
                  slideToShow || 4
                )}
                slidesToScroll={1}
                infinite={false}
              >
                {currentVariation?.map((image, i) => (
                  <div
                    key={i}
                    className="slider-image"
                    onClick={() => goToSlide(i)}
                  >
                    {videoType.includes(image.mime_type) ? (
                      <>
                        <div className="video-icon">
                          <RiVideoLine />
                        </div>
                        <video width="130" height="130">
                          <source
                            src={image ? image?.original_url : ""}
                            type={image?.mime_type}
                          />
                        </video>
                      </>
                    ) : audioType.includes(image?.mime_type) ? (
                      <span>
                        <RiHeadphoneLine size={100} />
                      </span>
                    ) : (
                      <Image
                        src={getProperImageUrl(image?.original_url)}
                        alt={image?.name || "Product image"}
                        className="img-fluid"
                        height={130}
                        width={130}
                      />
                    )}
                  </div>
                ))}
              </Slider>
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ThumbnailProductImage;
