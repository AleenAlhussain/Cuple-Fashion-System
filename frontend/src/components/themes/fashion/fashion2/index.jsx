"use client";
import ImageLink from "@/components/widgets/imageLink";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Loader from "@/layout/loader";
import useCustomDataQuery from "@/utils/hooks/useCustomDataQuery";
import { useSkeletonLoader2 } from "@/utils/hooks/useSkeleton2";
import React, { useEffect, useState } from "react";
import { Row } from "reactstrap";
import HomeBrand from "../../widgets/HomeBrand";
import HomeFourColumnProduct from "../../widgets/HomeFourColumnProduct";
import HomeProductTab from "../../widgets/HomeProductTab";
import HomeSlider from "../../widgets/HomeSlider";
import HomeSocialMedia from "../../widgets/HomeSocialMedia";
import HomeTitle from "../../widgets/HomeTitle";

const Fashion2 = ({ slug }) => {
  const { data, isLoading, refetch } = useCustomDataQuery({ params: "fashion_two" });
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    if (data?.offer_banner) {
      let banners = [];
      if (data?.offer_banner?.banner_1?.status) {
        banners = [...banners, data?.offer_banner?.banner_1];
      }
      if (data?.offer_banner?.banner_2?.status) {
        banners = [...banners, data?.offer_banner?.banner_2];
      }
      if (data?.offer_banner?.banner_3?.status) {
        banners = [...banners, data?.offer_banner?.banner_3];
      }
      if (data?.offer_banner?.banner_4?.status) {
        banners = [...banners, data?.offer_banner?.banner_4];
      }
      setBanners(banners);
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

  if (isLoading) return <Loader />;

  return (
    <>
      {/* Home Banner */}
      <WrapperComponent classes={{ sectionClass: "p-0 overflow-hidden", fluidClass: "slide-1 home-slider" }}>
        <HomeSlider bannerData={data?.home_banner} height={650} width={1920} />
      </WrapperComponent>

      {/* Offer Banner */}
      <WrapperComponent classes={{ sectionClass: "banner-padding banner-section ratio2_1", fluidClass: "container-fluid" }} noRowCol={true}>
        <Row className=" g-sm-4 g-3">
          {banners.map(
            (banner, i) =>
              banner.status && (
                <div key={i} className={`col-${i % 2 === 0 && banners.length === i + 1 ? "12" : "6"}`}>
                  <div className="position-relative"
  style={{ minHeight: `${height}px` }}>
                    <ImageLink imgUrl={banner} classes={"bg-size "} height={446} width={893} bgImg={true} />
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
                </div>
              )
          )}
        </Row>
      </WrapperComponent>

      {/* Category Products */}
      {data?.category_product?.status && (
        <>
          <HomeTitle title={data?.category_product} type="basic" />
          <WrapperComponent classes={{ sectionClass: "section-b-space category-tab-section pt-0", fluidClass: "container" }}>
            <HomeProductTab categoryIds={data?.category_product?.category_ids} style="vertical" />
          </WrapperComponent>
        </>
      )}

      {/* Full Or Parallax Banner */}
      {data?.full_banner?.status && (
        <WrapperComponent classes={{ sectionClass: "p-0 overflow-hidden banner-sale" }}>
          <ImageLink imgUrl={data?.full_banner} height={565} width={1835} />
        </WrapperComponent>
      )}

      {/* Four Column Product */}
      {data?.slider_products?.status && (
        <WrapperComponent classes={{ fluidClass: "container" }} noRowCol={true}>
          <HomeFourColumnProduct data={data?.slider_products} style="horizontal" />
        </WrapperComponent>
      )}

      {/* Social Media */}
      {data?.social_media?.banners?.length && data?.social_media?.status && (
        <WrapperComponent classes={{ sectionClass: "instagram ratio_square overflow-hidden" }}>
          <HomeSocialMedia media={data?.social_media || []} type="borderless" />
        </WrapperComponent>
      )}

      {/* Brand */}
      {data?.brand?.status && (
        <WrapperComponent classes={{ sectionClass: "section-b-space" }}>
          <HomeBrand brandIds={data?.brand?.brand_ids || []} />
        </WrapperComponent>
      )}
    </>
  );
};

export default Fashion2;
