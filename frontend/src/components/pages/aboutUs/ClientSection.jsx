import WrapperComponent from "@/components/widgets/WrapperComponent";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { resolveImageUrl } from "@/utils/constants";
import Image from "next/image";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import Slider from "react-slick";
import { Media } from "reactstrap";

const ClientSectionSlider = {
  arrows: true,
  loop: true,
  slidesToShow: 2,
  slidesToScroll: 1,
};

const ClientSection = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { i18n } = useTranslation("common");
  const isArabic = i18n.language === "ar";
  const sectionSubTitle = isArabic
    ? themeOption?.about_us?.testimonial?.sub_title_ar || themeOption?.about_us?.testimonial?.sub_title
    : themeOption?.about_us?.testimonial?.sub_title;
  const sectionTitle = isArabic
    ? themeOption?.about_us?.testimonial?.title_ar || themeOption?.about_us?.testimonial?.title
    : themeOption?.about_us?.testimonial?.title;

  return (
    <WrapperComponent classes={{ sectionClass: "testimonial small-section", fluidClass: "container" }} colProps={{ sm: 12 }}>
      <div className="title1">
        <h4>{sectionSubTitle}</h4>
        <h2 className="title-inner1">{sectionTitle}</h2>
      </div>
      <div className="slide-2 testimonial-slider no-arrow">
        <Slider {...ClientSectionSlider}>
          {themeOption?.about_us?.testimonial?.reviews?.map((data, index) => (
          <div key={index}>
            <div className="media">
              <div className="text-center">
                {data?.profile_image_url && (
                  <Image
                    height={79.06}
                    width={58.5}
                    src={resolveImageUrl(data?.profile_image_url)}
                    alt={(isArabic ? data?.title_ar : data?.title) || data?.title}
                  />
                )}
                <h5>{isArabic ? data?.title_ar || data?.title : data?.title}</h5>
                <h6>{isArabic ? data?.designation_ar || data?.designation : data?.designation}</h6>
              </div>
              <Media body>
                <p>{isArabic ? data?.review_ar || data?.review : data?.review}</p>
              </Media>
            </div>
          </div>
          ))}
        </Slider>
      </div>
    </WrapperComponent>
  );
};

export default ClientSection;
