"use client";
import ImageLink from "@/components/widgets/imageLink";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Loader from "@/layout/loader";
import { ImagePath, resolveImageUrl } from "@/utils/constants";
import { getSectionLinkProps } from "@/utils/sectionLink";
import Link from "next/link";
import React, { useEffect, useContext } from "react";
import { Container } from "reactstrap";
import HomeServices from "../../widgets/HomeService";
import HomeSlider from "../../widgets/HomeSlider";
import HomeTitle from "../../widgets/HomeTitle";
import HomeProduct from "../../widgets/HomeProduct";
import { useTranslation } from "react-i18next";
import HomePageCategories from "@/components/home/HomePageCategories";
import { useGetHomepage } from "@/utils/api/home/home";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { ShopLayoutProvider } from "@/context/shopLayoutContext";
import StoryThumbnails from "@/components/stories/StoryThumbnails";

const resolveSectionImage = (section = {}) => {
  const candidates = [
    section?.image_url,
    section?.image?.original_url,
    section?.image?.asset_url,
    section?.image?.url,
    section?.image?.path,
  ];
  for (const value of candidates) {
    if (value) {
      const resolved = resolveImageUrl(value);
      if (resolved) return resolved;
    }
  }
  return `${ImagePath}/placeholder/two_column_banner.png`;
};

const homepageProductSlider = (length = 0) => {
  const desktopSlides = length > 4 ? 4 : length;
  const mobileSlides = length > 2 ? 2 : length;

  return {
    infinite: length > 4,
    swipeToSlide: true,
    slidesToShow: desktopSlides,
    slidesToScroll: 1,
    arrows: false,
    dots: false,
    autoplay: length > 4,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 992,
        settings: {
          slidesToShow: mobileSlides,
          slidesToScroll: 1,
        },
      },
    ],
  };
};

const Fashion1 = () => {
  const { t, i18n } = useTranslation("common");
  const isArabic = i18n.language === "ar";
  const lf = (obj, field) => (isArabic && obj?.[`${field}_ar`]) ? obj[`${field}_ar`] : (obj?.[field] || "");
  const { themeOption } = useContext(ThemeOptionContext);
  const homeBanners = (themeOption?.home_banner?.banners || []).filter((banner) => banner?.status);
  const homeBannerData = { banners: homeBanners };
  const rawHighlightSections = themeOption?.home_highlight_sections?.sections;
  const highlightSections = (Array.isArray(rawHighlightSections) ? rawHighlightSections : [])
    .filter((section) => section?.status !== false);


  // Single combined API call instead of multiple separate calls
  const { data: homepageData, isLoading } = useGetHomepage();

  // Extract data from combined response
  const productsData = homepageData?.data?.latest_products;
  const bestSellerData = homepageData?.data?.best_seller_products;

  useEffect(() => {
    document.body.classList.add("home");
    return () => {
      document.body.classList.remove("home");
    };
  }, []);

  if (isLoading) return <Loader />;

  return (
    <>
      {/* Home Banner */}
      <WrapperComponent
        classes={{
          sectionClass: "p-0 overflow-hidden position-relative",
          fluidClass: "slide-1 home-slider cuple-home-banner",
        }}
      >
        <HomeSlider bannerData={homeBannerData} height={650} width={1920} />
      </WrapperComponent>

      {/* Highlight sections under hero slider */}
      {highlightSections.length > 0 && (
        <WrapperComponent
          classes={{
            sectionClass: "pt-3 pb-0",
            fluidClass: "container",
          }}
        >
          <div className="row g-3 g-lg-4">
            {highlightSections.map((section, index) => {
              const sectionImage = resolveSectionImage(section);
              const linkProps = getSectionLinkProps(section?.redirect_link);
              const cardKey = section?.id || section?.title || index;

              return (
                <div className="col-lg-6" key={cardKey}>
                  <Link
                    {...linkProps}
                    className="home-highlight-card-link h-100 d-block"
                  >
                    <div className="home-highlight-card">
                      <div
                        className="home-highlight-card__media"
                        style={{ backgroundImage: `url(${sectionImage})` }}
                      />
                      <div className="home-highlight-card__content">
                        {(lf(section, "subtitle")) && (
                          <p className="home-highlight-card__subtitle">
                            {lf(section, "subtitle")}
                          </p>
                        )}
                        <h3 className="home-highlight-card__title">{lf(section, "title")}</h3>
                        <p className="home-highlight-card__description">
                          {lf(section, "description")}
                        </p>
                        {(lf(section, "button_text")) && (
                          <span className="home-highlight-card__button">
                            {lf(section, "button_text")}
                            <i className={`ri-arrow-${isArabic ? "left" : "right"}-s-line`}></i>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </WrapperComponent>
      )}

      <ShopLayoutProvider scope="shop">
        {/* Products Slider */}
        {productsData && productsData.length > 0 && (
          <>
            <HomeTitle
              title={{
                title: t("LatestProducts"),
                description: t("LatestProductsDesc"),
                status: true,
                tag: t("SpecialOffer"),
                product_ids: productsData?.map((product) => product.id) || [],
              }}
              type="basic"
            />
            <WrapperComponent
              classes={{
                sectionClass: "section-b-space pt-0 best-seller-section",
                fluidClass: "container",
              }}
            >
              <HomeProduct
                data={productsData}
                style="vertical"
                slider={true}
                sliderOptions={homepageProductSlider}
              />
            </WrapperComponent>
          </>
        )}

      {/* Full Banner */}
      <WrapperComponent
        classes={{ sectionClass: "banner-sale cuple-store-banner overflow-hidden section-b-space" }}
        noRowCol={true}
      >
        <ImageLink
          imgUrl={"/assets/images/theme/fashion_one/cuple store banner.webp"}
          placeholder={`${ImagePath}/cuple store banner.webp`}
          height={587}
          width={1905}
        />
      </WrapperComponent>

        {/* Best Seller Products */}
        {bestSellerData && bestSellerData.length > 0 && (
          <>
            <HomeTitle
              title={{
                title: t("Best Seller"),
                description: t("Our most popular products based on customer orders"),
                status: true,
                tag: t("Top Selling"),
                product_ids: bestSellerData?.map((product) => product.id) || [],
              }}
              type="basic"
            />
            <WrapperComponent
              classes={{
                sectionClass: "section-b-space pt-10",
                fluidClass: "container",
              }}
            >
              <HomeProduct
                data={bestSellerData}
                style="vertical"
                slider={true}
                sliderOptions={homepageProductSlider}
              />
            </WrapperComponent>
          </>
        )}
      </ShopLayoutProvider>

      {/* Stories - Instagram/Facebook style, lazy loaded */}
      <WrapperComponent
        classes={{
          sectionClass: "stories-section py-2",
          fluidClass: "container",
        }}
      >
        <StoryThumbnails />
      </WrapperComponent>

      {/* categories Banners */}
      <WrapperComponent
        classes={{
          sectionClass: "pb-0 ratio2_1 banner-section category-grid",
          fluidClass: "container",
        }}
      >
        {!themeOption?.home_categories?.headline?.trim() && (
          <div className="text-center homepage-categories-headline">
            <h3 className="fw-bold mb-1">{t("explore_categories")}</h3>
            <p className="text-muted m-0">{t("discover_styles")}</p>
          </div>
        )}


        <HomePageCategories />
      </WrapperComponent>

      {/* Services */}
      {themeOption?.product?.services?.banners?.length > 0 && (
        <Container>
          <WrapperComponent
            classes={{ sectionClass: "service border-section small-section" }}
            noRowCol={true}
          >
            <HomeServices services={themeOption?.product?.services?.banners || []} />
          </WrapperComponent>
        </Container>
      )}
    </>
  );
};

export default Fashion1;
