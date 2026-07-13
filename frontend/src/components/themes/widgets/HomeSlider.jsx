"use client";

import ImageLink from "@/components/widgets/imageLink";
import { homeBannerSettings } from "@/data/sliderSetting/SliderSetting";
import { ImagePath, storageURL } from "@/utils/constants";
import Slider from "react-slick";
import { useEffect, useState } from "react";

const HomeSlider = ({ bannerData, height = 650, width = 1920, sliderClass }) => {
  const videoType = ["mp4", "webm", "ogg"];

  // Prevent crashes when data not ready
  const banners = [...(bannerData?.banners || [])].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(Number(b?.sort_order)) ? Number(b.sort_order) : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
  if (!banners.length) return null;

  const sliderWrapperStyle = height
    ? { "--home-slider-height": `${height}px` }
    : undefined;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const update = (event) => {
      if (event?.matches !== undefined) {
        setIsMobile(event.matches);
      } else {
        setIsMobile(query.matches);
      }
    };

    update(query);
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  const isVideo = (url) => {
    if (!url || typeof url !== "string") return false;
    const ext = url.substring(url.lastIndexOf(".") + 1).toLowerCase();
    return videoType.includes(ext);
  };

  const getMobileBanner = (banner) => {
    if (!banner) return banner;
    const mobileUrl =
      banner?.image_mobile_url ||
      banner?.mobile_image?.original_url ||
      banner?.image_mobile?.original_url ||
      banner?.mobile_image?.url ||
      banner?.image_mobile?.url;
    if (!mobileUrl) return banner;
    return { ...banner, image_url: mobileUrl };
  };

  const resolveBanner = (banner) => (isMobile ? getMobileBanner(banner) : banner);

  // Single banner
  if (banners.length === 1) {
    const single = banners[0];

    if (isVideo(single?.image_url)) {
      return (
        <div className="position-relative home-slider-wrapper" style={sliderWrapperStyle} dir="ltr">
          <div className="slider-contain" style={{ width: "100%", position: "relative" }}>
            <div
              style={{
                position: "absolute",
                zIndex: -1,
                inset: "0px",
                overflow: "hidden",
                backgroundSize: "cover",
                backgroundColor: "transparent",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "0% 50%",
                backgroundImage: "none",
              }}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                style={{
                  margin: "auto",
                  position: "absolute",
                  zIndex: "-1",
                  top: "50%",
                  left: "0%",
                  transform: "translate(0%, -50%)",
                  visibility: "visible",
                  opacity: "1",
                  width: "1907px",
                  height: "auto",
                }}
              >
                <source src={storageURL + single?.image_url} type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="position-relative home-slider-wrapper" style={sliderWrapperStyle} dir="ltr">
        <ImageLink
          imgUrl={resolveBanner(single)}
          placeholder={`${ImagePath}/banner.png`}
          height={height}
          width={width}
          homeBanner={true}
          priority={true}
          loading="eager"
        />
      </div>
    );
  }

  // Multiple banners
  return (
    <div className="position-relative home-slider-wrapper" style={sliderWrapperStyle} dir="ltr">
      <Slider {...homeBannerSettings} className={sliderClass ? sliderClass : ""}>
        {banners.map((banner, index) => {
          if (isVideo(banner?.image_url)) {
            return (
              <div
                key={index}
                className="slider-contain"
                style={{ width: "100%", position: "relative" }}
              >
                <div
                  style={{
                    position: "absolute",
                    zIndex: -1,
                    inset: "0px",
                    overflow: "hidden",
                    backgroundSize: "cover",
                    backgroundColor: "transparent",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "0% 50%",
                    backgroundImage: "none",
                  }}
                >
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      margin: "auto",
                      position: "absolute",
                      zIndex: "-1",
                      top: "50%",
                      left: "0%",
                      transform: "translate(0%, -50%)",
                      visibility: "visible",
                      opacity: "1",
                      width: "1907px",
                      height: "auto",
                    }}
                  >
                    <source src={storageURL + banner?.image_url} type="video/mp4" />
                  </video>
                </div>
              </div>
            );
          }

          return (
            <div key={index}>
              <ImageLink
                imgUrl={resolveBanner(banner)}
                placeholder={`${ImagePath}/banner.png`}
                link={banner}
                height={height}
                width={width}
                homeBanner={true}
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>
          );
        })}
      </Slider>
    </div>
  );
};

export default HomeSlider;
