"use client";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import { horizontalProductSlider } from "@/data/sliderSetting/SliderSetting";
import Loader from "@/layout/loader";
import { Href, storageURL } from "@/utils/constants";
import useCustomDataQuery from "@/utils/hooks/useCustomDataQuery";
import { useSkeletonLoader2 } from "@/utils/hooks/useSkeleton2";
import Link from "next/link";
import React, {  useEffect } from "react";
import { Col, Row } from "reactstrap";
import HomeBrand from "../../widgets/HomeBrand";
import HomeProduct from "../../widgets/HomeProduct";
import HomeProductTab from "../../widgets/HomeProductTab";
import HomeSlider from "../../widgets/HomeSlider";
import HomeTitle from "../../widgets/HomeTitle";

const Fashion3 = () => {
  const { data, isLoading, refetch } = useCustomDataQuery({ params: "fashion_three" });
  useEffect(() => {
    if (data?.products_ids?.length > 0) {
      setGetProductIds({ ids: Array.from(new Set(data?.products_ids))?.join(",") });
    }
    if (data?.brands?.brand_ids?.length > 0) {
      setGetBrandIds({ ids: Array.from(new Set(data?.brands?.brand_ids))?.join(",") });
    }
  }, [isLoading]);

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    document.body.classList.add("home", "box-layout-body");
    return () => {
      document.body.classList.remove("home", "box-layout-body");
    };
  }, []);

  const redirectBannerLink = (link) => {
    if (link?.link_type == "product") {
      const product = filteredProduct.find((elem) => elem?.id == link?.link);
      const productRoute = product?.slug ? "/product/" + product?.slug : Href;
      return productRoute;
    } else if (link?.link_type == "collection") {
      const collectionRoute = collection?.slug ? "/category/" + link?.link : Href;
      return collectionRoute;
    } else {
      return "/" + link?.link;
    }
  };
  // useSkeletonLoader(isLoading);
  if (isLoading && document.body) return <Loader />;

  return (
    <>
      {/* Home Banner */}
      <WrapperComponent classes={{ sectionClass: "p-0 overflow-hidden", fluidClass: "slide-1 home-slider" }}>
        <HomeSlider bannerData={data?.home_banner} height={621} width={1920} />
      </WrapperComponent>

      <div className="container box-layout bg-image">
        {/* Product List  */}
        {data?.products_list?.status && (
          <WrapperComponent classes={{ sectionClass: "section-b-space pt-0", fluidClass: "container" }}>
            <HomeTitle title={data?.products_list} type="basic" />
            <Row>
              <Col>
                <HomeProduct productIds={data?.products_list?.product_ids || []} slider={true} style="vertical" sliderOptions={horizontalProductSlider} />
              </Col>
            </Row>
          </WrapperComponent>
        )}

        {/* Full Or Parallax Banner */}
        {data?.full_banner?.status && (
          <div className="p-0 banner-sale">
            <Link href={redirectBannerLink(data?.full_banner?.redirect_link)}>
              <img src={storageURL + data?.full_banner?.image_url} className="bg-img w-100 " alt="banner" />
            </Link>
          </div>
        )}

        {/* Category Products */}
        {data?.category_product?.status && (
          <>
            <HomeTitle title={data?.category_product} type="basic" />
            <WrapperComponent classes={{ sectionClass: "category-tab-section pt-0", fluidClass: "container" }}>
              <HomeProductTab categoryIds={data?.category_product?.category_ids} style="vertical" />
            </WrapperComponent>
          </>
        )}

        {/* Brand */}
        {data?.brand?.status && (
          <WrapperComponent classes={{ sectionClass: "section-b-space brand-section" }}>
            <HomeBrand brandIds={data?.brand?.brand_ids || []} />
          </WrapperComponent>
        )}
      </div>
    </>
  );
};

export default Fashion3;
