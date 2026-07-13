import WrapperComponent from "@/components/widgets/WrapperComponent";
import React from "react";
import { Col, Container, Row } from "reactstrap";
import CrossSellProducts from "../common/CrossSellProducts";
import CustomerOrderCount from "../common/CustomerOrderCount";
import DiscountBar from "../common/DiscountBar";
import ProductContent from "../common/ProductContent";
import ProductDeliveryInformation from "../common/ProductDeliveryInformation";
import ProductDetailSidebar from "../common/productDetailSidebar";
import ProductDetailsTab from "../common/ProductDetailsTab";
import ProductInformation from "../common/ProductInformation";
import ProductStatus from "../common/ProductStatus";
import RelatedProduct from "../common/RelatedProduct";
import WishlistCompareShare from "../common/WishlistCompareShare";
import ThumbnailProductImage from "../productThumbnail/ThumbnailImage";

const ProductSidebarLayout = ({ productState, setProductState, direction }) => {
  return (
    <WrapperComponent classes={{ sectionClass: "collection-wrapper", fluidClass: "container" }} customCol={true}>
      <Container fluid className="p-0">
        <Row>
          {direction == "left" && <ProductDetailSidebar customClass={"collection-filter product-sidebar-box"} productState={productState} />}
          <Col lg="9" sm="12">
            <Container fluid className="p-0">
              <Row>
                <Col lg="6">
                  <ThumbnailProductImage productState={productState} setProductState={setProductState} slideToShow={3} />
                </Col>
                <Col lg="6" className="rtl-text">
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
          {direction == "right" && <ProductDetailSidebar customClass={"product-sidebar-box"} productState={productState} />}
        </Row>
      </Container>

      <WrapperComponent classes={{ sectionClass: "tab-product product-details-contain m-0", fluidClass: "container" }} customCol={true}>
        <ProductDetailsTab productState={productState} setProductState={setProductState} />
      </WrapperComponent>

      {productState?.product?.cross_sell_products?.length > 0 && <CrossSellProducts productState={productState} />}
      {productState?.product?.related_products?.length > 0 && <RelatedProduct customContainerClass="section-t-space" productState={productState} setProductState={setProductState} />}
    </WrapperComponent>
  );
};

export default ProductSidebarLayout;
