import WrapperComponent from "@/components/widgets/WrapperComponent";
import ProductRelatedGrid from "./ProductRelatedGrid";
import { useTranslation } from "react-i18next";

const RelatedProduct = ({ productState, customContainerClass }) => {
  const { t } = useTranslation("common");

  // Get related products or cross-sell products
  const relatedProducts = productState?.product?.related_products ||
                          productState?.product?.cross_sell_products ||
                          [];

  if (!relatedProducts.length) {
    return null;
  }

  return (
    <WrapperComponent
      classes={{
        sectionClass: "pt-0 section-b-space m-0",
        fluidClass: customContainerClass ? customContainerClass : "",
      }}
      noRowCol={true}
    >
      <div className="product-related">
        <h2>{t("RelatedProducts")}</h2>
      </div>
      <ProductRelatedGrid products={relatedProducts} />
    </WrapperComponent>
  );
};

export default RelatedProduct;
