import WrapperComponent from "@/components/widgets/WrapperComponent";
import { Col } from "reactstrap";
import CrossSellProducts from "../common/CrossSellProducts";
import CustomerOrderCount from "../common/CustomerOrderCount";
import DiscountBar from "../common/DiscountBar";
import ProductContent from "../common/ProductContent";
import ProductDeliveryInformation from "../common/ProductDeliveryInformation";
import ProductDetailsTab from "../common/ProductDetailsTab";
import ProductInformation from "../common/ProductInformation";
import ProductStatus from "../common/ProductStatus";
import WishlistCompareShare from "../common/WishlistCompareShare";
import FourImage from "./FourImage";
import RelatedProduct from "../common/RelatedProduct";
import UpsellProduct from "../common/UpsellProduct";

const Product4Image = ({ productState, setProductState }) => {
  return (
    <WrapperComponent classes={{ sectionClass: "collection-wrapper ratio_asos", fluidClass: "container", row: "g-4" }} customCol={true}>
      <Col lg={6}>
        <FourImage productState={productState} />
      </Col>
      <Col lg={6} className="rtl-text">
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
      <WrapperComponent classes={{ sectionClass: "tab-product product-details-contain m-0 section-b-space", fluidClass: "container" }} customCol={true}>
        <ProductDetailsTab productState={productState} setProductState={setProductState} />
      </WrapperComponent>
      {productState?.product?.cross_sell_products?.length > 0 && <CrossSellProducts productState={productState} />}
      {productState?.product?.upsell_products?.length > 0 && <UpsellProduct productState={productState} />}
      {productState?.product?.related_products?.length > 0 && <RelatedProduct productState={productState} />}
    </WrapperComponent>
  );
};

export default Product4Image;
