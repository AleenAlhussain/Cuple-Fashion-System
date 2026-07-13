"use client";
import ImageLink from "@/components/widgets/imageLink";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import { horizontalProductSlider } from "@/data/sliderSetting/SliderSetting";
import Loader from "@/layout/loader";
import { storageURL } from "@/utils/constants";
import useCustomDataQuery from "@/utils/hooks/useCustomDataQuery";
import { useSkeletonLoader2 } from "@/utils/hooks/useSkeleton2";
import Image from "next/image";
import React, {  useEffect } from "react";
import { Col, Container, Row } from "reactstrap";
import HomeBlog from "../../widgets/HomeBlog";
import HomeBrand from "../../widgets/HomeBrand";
import HomeProduct from "../../widgets/HomeProduct";
import HomeSlider from "../../widgets/HomeSlider";
import HomeSocialMedia from "../../widgets/HomeSocialMedia";
import HomeTitle from "../../widgets/HomeTitle";
import NoDataFound from "@/components/widgets/NoDataFound";

const Fashion6 = ({ slug }) => {
  const { data, isLoading, refetch } = useCustomDataQuery({ params: "fashion_six" });
  
  
  

  useEffect(() => {
    if (data?.products_ids?.length > 0) {
      setGetProductIds({ ids: Array.from(new Set(data?.products_ids))?.join(",") });
    }
    if (data?.brands?.brand_ids?.length > 0) {
      setGetBrandIds({ ids: Array.from(new Set(data?.brands?.brand_ids))?.join(",") });
    }
  }, [data]);

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    document.body.classList.add("home");
    return () => {
      document.body.classList.remove("home");
    };
  }, []);

  const sliderSettings = (length) => {
    return {
      ...horizontalProductSlider,
      slidesToShow: length > 3 ? 3 : length,
      responsive: [
        {
          breakpoint: 992,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
          },
        },
        {
          breakpoint: 1429,
          settings: {
            slidesToShow: 2,
            slidesToScroll: 1,
          },
        },
      ],
    };
  };
  if (isLoading && document.body) return <Loader />;

  return (
    <>
      {/* Home Banner */}
      <WrapperComponent classes={{ sectionClass: "p-0 overflow-hidden" }}>
        <div className="center-home-slider sm-size home-slider layout-7">
          <HomeSlider bannerData={data?.home_banner} height={650} width={1920} />
        </div>
      </WrapperComponent>

      {/* Offer Banners */}
      <WrapperComponent classes={{ sectionClass: "banner-padding ratio2_1", fluidClass: "container" }}>
        <Row className="margin-default">
          <Col lg="3" className="d-lg-block d-none">
            <div className="position-relative h-100">
              <ImageLink imgUrl={data?.offer_banner?.banner_1} classes="h-100" bgImg={true} />
              <div className="banner-skeleton">
                <div className="skeleton-content">
                  <p className="card-text placeholder-glow row g-lg-3 g-0">
                    <span className="col-lg-7 col-9">
                      <span className="placeholder"></span>
                    </span>
                    <span className="col-lg-9 col-12">
                      <span className="placeholder"></span>
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </Col>
          <Col lg="9">
            <Row className=" g-md-4 g-3">
              <Col md="4" xs="6">
                <div className="position-relative"
  style={{ minHeight: `${height}px` }}>
                  <ImageLink imgUrl={data?.offer_banner?.banner_2} classes="img-part" bgImg={true} />
                  <div className="banner-skeleton">
                    <div className="skeleton-content">
                      <p className="card-text placeholder-glow row g-lg-3 g-0">
                        <span className="col-lg-7 col-9">
                          <span className="placeholder"></span>
                        </span>
                        <span className="col-lg-9 col-12">
                          <span className="placeholder"></span>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </Col>
              <Col md="4" xs="6">
                <div className="position-relative"
  style={{ minHeight: `${height}px` }}>
                  <ImageLink imgUrl={data?.offer_banner?.banner_3} classes="img-part" bgImg={true} />
                  <div className="banner-skeleton">
                    <div className="skeleton-content">
                      <p className="card-text placeholder-glow row g-lg-3 g-0">
                        <span className="col-lg-7 col-9">
                          <span className="placeholder"></span>
                        </span>
                        <span className="col-lg-9 col-12">
                          <span className="placeholder"></span>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </Col>
              <Col md="4" xs="6">
                <div className="position-relative"
  style={{ minHeight: `${height}px` }}>
                  <ImageLink imgUrl={data?.offer_banner?.banner_4} classes="img-part" bgImg={true} />
                  <div className="banner-skeleton">
                    <div className="skeleton-content">
                      <p className="card-text placeholder-glow row g-lg-3 g-0">
                        <span className="col-lg-7 col-9">
                          <span className="placeholder"></span>
                        </span>
                        <span className="col-lg-9 col-12">
                          <span className="placeholder"></span>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs="6">
                <div className="position-relative"
  style={{ minHeight: `${height}px` }}>
                  <ImageLink imgUrl={data?.offer_banner?.banner_5} classes="img-part" bgImg={true} />
                  <div className="banner-skeleton">
                    <div className="skeleton-content">
                      <p className="card-text placeholder-glow row g-lg-3 g-0">
                        <span className="col-lg-7 col-9">
                          <span className="placeholder"></span>
                        </span>
                        <span className="col-lg-9 col-12">
                          <span className="placeholder"></span>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </Col>
              <Col md="6">
                <div className="position-relative"
  style={{ minHeight: `${height}px` }}>
                  <ImageLink imgUrl={data?.offer_banner?.banner_6} classes="img-part" bgImg={true} />
                  <div className="banner-skeleton">
                    <div className="skeleton-content">
                      <p className="card-text placeholder-glow row g-lg-3 g-0">
                        <span className="col-lg-7 col-9">
                          <span className="placeholder"></span>
                        </span>
                        <span className="col-lg-9 col-12">
                          <span className="placeholder"></span>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </WrapperComponent>

      {/* Products List */}
      {data?.products_list_1?.status && (
        <>
          <HomeTitle title={data?.products_list_1} type="basic" />
          <WrapperComponent classes={{ sectionClass: "section-b-space pt-0 ratio_square", fluidClass: "container" }}>{data?.products_list_1?.product_ids?.length ? <HomeProduct productIds={data?.products_list_1?.product_ids} style="vertical" /> : <NoDataFound customClass={"no-data-added"} title={"NoProductFound"} />}</WrapperComponent>
        </>
      )}

      {/* Product Banners */}
      {data?.product_banner?.status && (
        <section className="section-b-space bg-size section-t-space" style={{ backgroundImage: `url(${storageURL + data?.product_banner?.image_url}` }}>
          <Image src={storageURL + data?.product_banner?.image_url} alt="" className="bg-img" width={1920} height={520} />
          <div className="ratio_square">
            <Container>
              <Row>
                <Col lg="4" md="6">
                  <div className="theme-card card-border bg-white">
                    <h5 className="title-border">{data?.product_banner?.product_slider_1?.title}</h5>
                    <div className="offer-slider">
                      <HomeProduct productIds={data?.product_banner?.product_slider_1?.product_ids} style="horizontal" />
                    </div>
                  </div>
                </Col>
              </Row>
            </Container>
          </div>
        </section>
      )}

      {/* Products List 2 */}
      {data?.products_list_2?.status && (
        <>
          <HomeTitle title={data?.products_list_1 || []} type="basic" />
          <WrapperComponent classes={{ sectionClass: "pt-0 ratio_square", fluidClass: "container" }} customCol={true}>
            <div className={data?.products_list_2?.right_panel?.status ? "col-lg-9 col-md-8 col-sm-7 col-6" : "col-lg-12 col-md-8 col-sm-7 col-6"}>
              <HomeProduct productIds={data?.products_list_2?.products?.product_ids} style="vertical" slider="true" sliderOptions={sliderSettings} />
            </div>
            {data?.products_list_2?.right_panel?.status && (
              <Col lg="3" md="4" sm="5" xs="6" className="images">
                <ImageLink imgUrl={data?.products_list_2?.right_panel} classes="h-100" bgImage={true} width={437} height={359} />
              </Col>
            )}
          </WrapperComponent>
        </>
      )}

      {/* Social Media */}
      {data?.social_media?.banners?.length && data?.social_media?.status && (
        <section className="instagram ratio_square section-t-space">
          <HomeSocialMedia media={data?.social_media || []} type="borderless" />
        </section>
      )}

      {/* Brands */}
      {data?.brand?.status && (
        <section className="section-b-space section-t-space">
          <HomeBrand brandIds={data?.brand?.brand_ids || []} />
        </section>
      )}
    </>
  );
};

export default Fashion6;
