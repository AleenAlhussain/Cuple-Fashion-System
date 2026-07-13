import NoDataFound from "@/components/widgets/NoDataFound";
import ProductBox from "@/components/widgets/productBox";
import { useGetProducts } from "@/utils/api";
import React, { useRef } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import Slider from "react-slick";
import { Row } from "reactstrap";

const HomeProduct = ({
  type,
  style,
  slider = false,
  productIds,
  product_box_style,
  classForVertical,
  sliderOptions,
  rowClass,
  data = null,
}) => {
  // Fetch products if data not provided
  const { data: productsData } = useGetProducts(
    { ids: productIds?.join(","), status: 1 },
    { 
      enabled: !!productIds?.length && !data,
      refetchOnWindowFocus: false 
    }
  );

  const products = data || productsData?.data || [];
  const sliderSettingMain = sliderOptions && sliderOptions(productIds?.length || products?.length);
  const sliderRef = useRef(null);
  const showSliderNav = products?.length > (sliderSettingMain?.slidesToShow || 1);

  return (
    <>
      {style === "horizontal" ? (
        slider ? (
          (data || products)?.length ? (
            <Slider {...sliderSettingMain}>
              {(data || products)?.map((product, index) => (
                <div key={index}>
                  <div className="theme-card center-align d-block">
                    <div className="offer-slider">
                      <div className="sec-1">
                        <div className="product-box2">
                          <ProductBox product={product} style={style} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          ) : (
            <NoDataFound title="NoProductFound" customClass={"no-data-added"} />
          )
        ) : product_box_style == "single_product" ? (
          products?.map((product, i) => (
            <ProductBox
              key={i}
              product={product}
              style={style}
              boxStyle={product_box_style}
            />
          ))
        ) : product_box_style === "horizontal" ? (
          <div className="row g-3">
            {products?.map((product, index) => (
              <div key={index} className="col-xl-3 col-md-6 col-sm-12">
                <div className="theme-card center-align">
                  <div className="offer-slider">
                    <div className="sec-1">
                      <div className="product-box2 product-box">
                        <ProductBox product={product} style={style} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {products?.length === 0 && (
              <NoDataFound
                title="NoProductFound"
                customClass={"no-data-added"}
              />
            )}
          </div>
        ) : (
          <div>
            {products?.map((product, index) => (
              <ProductBox
                key={index}
                product={product}
                style={style}
                boxStyle={product_box_style}
              />
            ))}
            {products?.length === 0 && (
              <NoDataFound
                title="NoProductFound"
                customClass={"no-data-added"}
              />
            )}
          </div>
        )
      ) : style === "vertical" ? (
        slider ? (
          <div className={`product-4 ${classForVertical || ""}`}>
            {products?.length ? (
              <>
                {showSliderNav && (
                  <div className="slider-top-nav">
                    <button
                      type="button"
                      aria-label="Previous"
                      onClick={() => sliderRef.current?.slickPrev()}
                    >
                      <RiArrowLeftSLine />
                    </button>
                    <button
                      type="button"
                      aria-label="Next"
                      onClick={() => sliderRef.current?.slickNext()}
                    >
                      <RiArrowRightSLine />
                    </button>
                  </div>
                )}
                <Slider ref={sliderRef} {...sliderSettingMain}>
                  {products?.map((product, index) => (
                    <div key={index}>
                      <div className={classForVertical}>
                        <ProductBox product={product} style={style} />
                      </div>
                    </div>
                  ))}
                </Slider>
              </>
            ) : (
              <NoDataFound title="NoProductFound" customClass="no-data-added" />
            )}
          </div>
        ) : (
          <>
            <Row
              className={
                rowClass
                  ? rowClass
                  : "row-cols-xl-4 row-cols-md-3 row-cols-2 g-sm-4 g-3 m-0"
              }
            >
              {products?.map((product, index) => (
                <div key={index} className={classForVertical}>
                  <ProductBox product={product} style={style} />
                </div>
              ))}
            </Row>
            {products?.length === 0 && (
              <NoDataFound title="NoProductFound" customClass="no-data-added" />
            )}
          </>
        )
      ) : null}
    </>
  );
};
export default HomeProduct;
