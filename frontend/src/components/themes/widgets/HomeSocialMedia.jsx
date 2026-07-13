import NoDataFound from "@/components/widgets/NoDataFound";
import TitleBox from "@/components/widgets/title";
import { SocialMediaSlider } from "@/data/sliderSetting/SliderSetting";
import { storageURL } from "@/utils/constants";
import React from "react";
import { RiInstagramLine } from "react-icons/ri";
import Slider from "react-slick";

const HomeSocialMedia = ({ media, title, classes, sliderClass, type, sliderOptions }) => {
  const socialSliderSettings = sliderOptions ? sliderOptions : SocialMediaSlider
  return (
    <>
      <div className={classes ? classes : "container-fluid p-0"}>
        {type && <TitleBox title={media} type={type} />}
        <div className="slide-7 instagram-slider no-arrow">
          <Slider {...socialSliderSettings} className={sliderClass ? sliderClass : ""}>
            {media?.banners?.map(
              (banner, index) =>
                banner.status && (
                  <div className="h-100" key={index}>
                    <a href={banner.redirect_link.link} tabIndex="0" target="_blank">
                      <div className="instagram-box bg-size h-100" style={{ backgroundImage: `url(${storageURL + banner.image_url})` }} >
                        <img src={storageURL + banner.image_url} className="bg-img d-none" alt="img" />
                        <div className="overlay">
                          <RiInstagramLine />
                        </div>
                      </div>
                    </a>
                  </div>
                )
            )}
          </Slider>
        </div>

        {!media.banners?.length && <NoDataFound className="no-data-added" text="NoMediaFound" />}
      </div>
    </>
  );
};

export default HomeSocialMedia;
