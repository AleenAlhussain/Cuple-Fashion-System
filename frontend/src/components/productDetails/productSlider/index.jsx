import WrapperComponent from "@/components/widgets/WrapperComponent";
import { Col, Row } from "reactstrap";
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
import SliderImage from "./SliderImage";

const ProductSlider = ({ productState, setProductState }) => {

  return (
    <>
      <WrapperComponent classes={{ sectionClass: "collection-wrapper ratio_asos product-details-box", fluidClass: "container" }} noRowCol={true}>
        <SliderImage productState={productState} />
        <Row>
          <Col xxl="9" xl="8" lg="7">
            <Row className="g-4">
              <div className="col-12 rtl-text">
                <div className="product-page-details">
                  <CustomerOrderCount productState={productState} />
                  <ProductContent productState={productState} setProductState={setProductState} />
                  <WishlistCompareShare productState={productState} />
                  <ProductStatus productState={productState} />
                  <ProductInformation productState={productState} />
                  <DiscountBar productId={productState?.product?.id} />
                  <ProductDeliveryInformation productState={productState} />
                </div>
              </div>
              <WrapperComponent classes={{ sectionClass: "tab-product section-b-space product-details-contain m-0 px-0", fluidClass: "container" }} customCol={true}>
                <ProductDetailsTab productState={productState} />
              </WrapperComponent>
              {productState?.product?.cross_sell_products?.length > 0 && (
                <CrossSellProducts productState={productState} />
              )}
            </Row>
          </Col>
          <ProductDetailSidebar productState={productState} />
        </Row>
        <RelatedProduct productState={productState} />
      </WrapperComponent>
    </>
  );
};

export default ProductSlider;
