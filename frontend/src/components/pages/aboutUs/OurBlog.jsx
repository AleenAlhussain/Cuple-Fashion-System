import NoDataFound from "@/components/widgets/NoDataFound";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { LatestBlogSlider } from "@/data/sliderSetting/SliderSetting";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Row } from "reactstrap";

const OurBlog = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  const { t } = useTranslation("common");
  return (
    <WrapperComponent classes={{ sectionClass: "section-lg-space" }} noRowCol>
      <div className="about-us-title text-center">
        <h4 className="text-content">{t("OurBlog")}</h4>
        <h2 className="center">{t("OurLatestBlog")}</h2>
      </div>

      {themeOption?.about_us?.blog?.blog_ids?.length > 0 ? (
        <Row>
          <BlogData
            dataAPI={themeOption?.about_us?.blog}
            classes={{
              sliderClass: "col-12",
              sliderOption: LatestBlogSlider,
              height: 150,
              width: 317,
            }}
          />
        </Row>
      ) : (
        <NoDataFound customClass="bg-light no-data-added" title="No Blog Found" />
      )}
    </WrapperComponent>
  );
};

export default OurBlog;
