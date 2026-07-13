import NoDataFound from "@/components/widgets/NoDataFound";
import { BrandSlider } from "@/data/sliderSetting/SliderSetting";
import Link from "next/link";
import React, {  useEffect } from "react";
import Slider from "react-slick";
import { Container } from "reactstrap";

const HomeBrand = ({ bgLight, brandIds, sliderOptions }) => {
  
  const brandMainSettings = sliderOptions && sliderOptions(brandIds?.length);
  const brandSliderOption = brandMainSettings ? brandMainSettings : BrandSlider(brandIds?.length);

  useEffect(() => {
    if (brandIds?.length > 0) {
      setGetBrandIds({ ids: Array.from(new Set(brandIds))?.join(",") });
    }
  }, [brandIds]);

  return (
    <>
      <Container>
        {filteredBrand?.length ? (
          <div className={`row ${bgLight ? "bg-light" : ""}`}>
            <div className="brand-slider-box no-arrow">
              <Slider {...brandSliderOption}>
                {filteredBrand?.map((item, index) => (
                  <div key={index}>
                    <Link className="logo-block" key={index} href={`/brand/${item?.slug}`}>
                      {item.brand_image?.original_url ? <img src={item.brand_image?.original_url} alt="" className="img-fluid" /> : <h4>{item?.name}</h4>}
                    </Link>
                  </div>
                ))}
              </Slider>
            </div>
          </div>
        ) : (
          <NoDataFound customClass="no-data-added" title="NoBrandFound" />
        )}
      </Container>
    </>
  );
};

export default HomeBrand;
