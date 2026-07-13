import WrapperComponent from "@/components/widgets/WrapperComponent";
import React from "react";
import { Col, Container, Row } from "reactstrap";
import CrossSellProducts from "../common/CrossSellProducts";
import CustomerOrderCount from "../common/CustomerOrderCount";
import DiscountBar from "../common/DiscountBar";
import OfferTimer from "../common/OfferTimer";
import ProductContent from "../common/ProductContent";
import ProductDeliveryInformation from "../common/ProductDeliveryInformation";
import ProductDetailsTab from "../common/ProductDetailsTab";
import ProductInformation from "../common/ProductInformation";
import ProductStatus from "../common/ProductStatus";
import RelatedProduct from "../common/RelatedProduct";
import WishlistCompareShare from "../common/WishlistCompareShare";
import ThumbnailProductImage from "../productThumbnail/ThumbnailImage";

const ProductColumn = ({ productState, setProductState, direction }) => {
  return (
    <section className="collection-wrapper section-t-space">
      <Container>
        <Row className="g-sm-4 g-3">
          <Col xl="4">
            <ThumbnailProductImage
              productState={productState}
              slideToShow={3}
            />
          </Col>
          <Col xl="4" lg="7">
            <div className="product-right product-description-box product-page-details">
              <CustomerOrderCount productState={productState} />
              <ProductContent
                productState={productState}
                setProductState={setProductState}
                noQuantityButtons={true}
                productAccordion={true}
              />
              <ProductInformation productState={productState} />
              <DiscountBar productId={productState?.product?.id} />
              <ProductDeliveryInformation productState={productState} />
            </div>
          </Col>
          <Col xl="4" lg="5">
            <div className="product-right product-form-box product-page-details">
              <ProductContent
                productState={productState}
                setProductState={setProductState}
                noDetails={true}
                noModals={true}
              />
              <ProductStatus productState={productState} />
              <WishlistCompareShare productState={productState} />
              {productState?.product?.status &&
                productState?.product?.sale_starts_at &&
                productState?.product?.sale_expired_at && (
                  <OfferTimer productState={productState} />
                )}
            </div>
          </Col>
        </Row>
        <WrapperComponent
          classes={{
            sectionClass:
              "tab-product product-details-contain section-b-space m-0",
            fluidClass: "container",
          }}
          customCol={true}
        >
          <ProductDetailsTab
            productState={productState}
            setProductState={setProductState}
          />
        </WrapperComponent>
        {productState?.product?.cross_sell_products?.length > 0 && (
          <CrossSellProducts productState={productState} />
        )}
        {productState?.product?.related_products?.length > 0 && (
          <RelatedProduct
            productState={productState}
            setProductState={setProductState}
          />
        )}
      </Container>
    </section>
  );
};

export default ProductColumn;
