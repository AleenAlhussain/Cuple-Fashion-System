import WrapperComponent from "@/components/widgets/WrapperComponent";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { resolveImageUrl } from "@/utils/constants";
import RatioImage from "@/utils/RatioImage";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import Slider from "react-slick";

const CreativeTeam = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { i18n } = useTranslation("common");
  const isArabic = i18n.language === "ar";
  const teamTitle = isArabic
    ? themeOption?.about_us?.team?.title_ar || themeOption?.about_us?.team?.title || "فريقنا"
    : themeOption?.about_us?.team?.title || "Our Team";

  const TeamSlider = {
    arrows: true,
    loop: true,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2500,
    responsive: [
      {
        breakpoint: 1399,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  };

  return (
    <WrapperComponent classes={{ sectionClass: "team section-b-space ratio_asos", fluidClass: "container" }} colProps={{ sm: 12 }}>
      <div className="title1">
        <h2 className="title-inner1 border-0">{teamTitle}</h2>
      </div>
      <div className="team-4 no-arrow">
        <Slider {...TeamSlider}>
          {themeOption?.about_us?.team?.members?.map((data, index) => (
            <div className="team-box" key={index}>
              <div className="team-image">
                {data?.profile_image_url && (
                  <RatioImage
                    height={494}
                    width={377}
                    src={resolveImageUrl(data?.profile_image_url)}
                    className="img-fluid"
                    alt={(isArabic ? data?.name_ar : data?.name) || data?.name}
                  />
                )}
              </div>
              <div className="team-name">
                <h4>{isArabic ? data?.name_ar || data?.name : data?.name}</h4>
                <h6>{isArabic ? data?.designation_ar || data?.designation : data?.designation}</h6>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </WrapperComponent>
  );
};

export default CreativeTeam;
