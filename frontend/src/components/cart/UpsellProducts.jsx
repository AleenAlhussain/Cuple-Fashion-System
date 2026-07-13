import ProductBox from "@/components/widgets/productBox";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import { useCartState } from "@/states";
import { useTranslation } from "react-i18next";
import { Col, Row } from "reactstrap";

const UpsellProducts = () => {
  const { t } = useTranslation("common");
  const cart = useCartState((state) => state.cart);

  // Collect all upsell products from cart items
  const allUpsellProducts = cart.reduce((acc, item) => {
    const upsellProducts = item?.product?.upsell_products || [];
    return [...acc, ...upsellProducts];
  }, []);

  // Remove duplicates based on product id and exclude products already in cart
  const cartProductIds = cart.map((item) => item.product_id);
  const uniqueUpsellProducts = allUpsellProducts.filter(
    (product, index, self) =>
      // Remove duplicates
      index === self.findIndex((p) => p.id === product.id) &&
      // Exclude products already in cart
      !cartProductIds.includes(product.id)
  );

  // Limit to 4 products for display
  const displayProducts = uniqueUpsellProducts.slice(0, 4);

  if (!displayProducts.length) {
    return null;
  }

  return (
    <WrapperComponent
      classes={{
        sectionClass: "pt-4 section-b-space",
        fluidClass: "container",
      }}
      noRowCol={true}
    >
      <div className="product-related mb-3">
        <h2>{t("YouMayAlsoLike")}</h2>
      </div>
      <Row className="row row-cols-xxl-4 row-cols-lg-4 row-cols-md-3 row-cols-2 g-sm-4 g-3">
        {displayProducts.map((product, i) => (
          <Col key={product.id || i}>
            <ProductBox product={product} style="vertical" />
          </Col>
        ))}
      </Row>
    </WrapperComponent>
  );
};

export default UpsellProducts;
