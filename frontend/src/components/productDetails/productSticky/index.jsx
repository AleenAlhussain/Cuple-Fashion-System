import WrapperComponent from "@/components/widgets/WrapperComponent";
import Image from "next/image";
import { useState } from "react";
import { Col, Container, Row } from "reactstrap";
import CrossSellProducts from "../common/CrossSellProducts";
import CustomerOrderCount from "../common/CustomerOrderCount";
import DiscountBar from "../common/DiscountBar";
import ProductContent from "../common/ProductContent";
import ProductDeliveryInformation from "../common/ProductDeliveryInformation";
import ProductDetailsTab from "../common/ProductDetailsTab";
import ProductInformation from "../common/ProductInformation";
import ProductStatus from "../common/ProductStatus";
import WishlistCompareShare from "../common/WishlistCompareShare";

const ProductSticky = ({ productState, setProductState }) => {
  const [videoType, setVideoType] = useState(["video/mp4", "video/webm", "video/ogg"]);
  const [audioType, setAudioType] = useState(["audio/mpeg", "audio/wav", "audio/ogg"]);

  return (
    <>
      <WrapperComponent classes={{ sectionClass: "section-b-space collection-wrapper", fluidClass: "container", row: "data-sticky_parent" }} customCol={true}>
        <Col lg="12" sm="12" xs="12">
          <Container fluid className="p-0">
            <Row className="g-4">
              <Col lg={6}>
                <Row>
                  <Col xs={12} className=" product_img_scroll image-scroll">
                    {productState?.selectedVariation?.variation_galleries?.map((image, i) => (
                      <div className="sticky-product-height" key={i}>
                        {videoType.includes(image.mime_type) ? (
                          <>
                            <video className="w-100 " controls>
                              <source src={image ? image?.original_url : ""} type={image?.mime_type}></source>
                            </video>
                          </>
                        ) : audioType.includes(image?.mime_type) ? (
                          <audio controls>
                            <source src={image ? image.original_url : ""} type={image.mime_type}></source>
                          </audio>
                        ) : (
                          <Image src={image?.original_url} alt={image?.name} className="img-fluid" height={780} width={670} />
                        )}
                      </div>
                    ))}
                  </Col>
                </Row>
              </Col>

              <Col className="rtl-text" lg={6}>
                <div className="product-page-details">
                  <CustomerOrderCount productState={productState} />
                  <ProductContent productState={productState} setProductState={setProductState} />
                  <WishlistCompareShare productState={productState} />
                  <ProductStatus productState={productState} />
                  <ProductInformation productState={productState} />
                  <DiscountBar productId={productState?.product?.id} />
                  <ProductDeliveryInformation productState={productState} />
                </div>
              </Col>
            </Row>
          </Container>
        </Col>
      </WrapperComponent>
      <WrapperComponent classes={{ sectionClass: "tab-product product-details-contain pt-0 m-0 section-b-space", fluidClass: "container" }} customCol={true}>
        <ProductDetailsTab productState={productState} setProductState={setProductState} />
      </WrapperComponent>
      {productState?.product?.cross_sell_products?.length > 0 && <CrossSellProducts productState={productState} />}
    </>
  );
};

export default ProductSticky;
