import WrapperComponent from "@/components/widgets/WrapperComponent";
import React, { useRef, useState } from "react";
import { Col, Container, Row } from "reactstrap";
import CrossSellProducts from "../common/CrossSellProducts";
import CustomerOrderCount from "../common/CustomerOrderCount";
import DiscountBar from "../common/DiscountBar";
import ProductContent from "../common/ProductContent";
import ProductDeliveryInformation from "../common/ProductDeliveryInformation";
import ProductDetailsTab from "../common/ProductDetailsTab";
import ProductInformation from "../common/ProductInformation";
import ProductStatus from "../common/ProductStatus";
import RelatedProduct from "../common/RelatedProduct";
import WishlistCompareShare from "../common/WishlistCompareShare";
import MainImageSlider from "./MainImageSlider";
import OutsideImageSlider from "./ProductOutsideSlider";

const ProductImageOutside = ({ productState, setProductState, direction }) => {
  const [nav1, setNav1] = useState(null);
  const [nav2, setNav2] = useState(null);
  let sliderRef1 = useRef(null);
  let sliderRef2 = useRef(null);


  return (
    <section className="collection-wrapper section-t-space">
      <Container>
        <Row>
          <Col lg="6">
            <MainImageSlider productState={productState} nav2={nav2} sliderRef1={sliderRef1} setNav1={setNav1} />
          </Col>
          <Col lg="6" className="rtl-text">
            <div className="thumbnail-image-outside">
              <div className="product-page-details">
                <CustomerOrderCount productState={productState} />
                <ProductContent productState={productState} setProductState={setProductState} />
                <WishlistCompareShare productState={productState} />
                <ProductStatus productState={productState} />
                <ProductInformation productState={productState} />
                <DiscountBar productId={productState?.product?.id} />
                <ProductDeliveryInformation productState={productState} />
              </div>
              <div className="image-outside-thumbnail">
                <OutsideImageSlider productState={productState} sliderRef2={sliderRef2} nav1={nav1} setNav2={setNav2} />
              </div>
            </div>
          </Col>
          <WrapperComponent classes={{ sectionClass: "tab-product product-details-contain m-0 section-b-space", fluidClass: "container" }} customCol={true}>
            <ProductDetailsTab productState={productState} setProductState={setProductState} />
          </WrapperComponent>
          {productState?.product?.cross_sell_products?.length > 0 && <CrossSellProducts productState={productState} />}
          {productState?.product?.related_products?.length > 0 && <RelatedProduct productState={productState} setProductState={setProductState} />}
        </Row>
      </Container>
    </section>
  );
};

export default ProductImageOutside;
