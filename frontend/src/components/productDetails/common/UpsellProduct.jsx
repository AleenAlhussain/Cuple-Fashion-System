import WrapperComponent from "@/components/widgets/WrapperComponent";
import ProductRelatedGrid from "./ProductRelatedGrid";
import { useTranslation } from "react-i18next";

const UpsellProduct = ({ productState, customContainerClass }) => {
  const { t } = useTranslation("common");

  // Get upsell products
  const upsellProducts = productState?.product?.upsell_products || [];

  if (!upsellProducts.length) {
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
        <h2>{t("YouMayAlsoLike") || "You May Also Like"}</h2>
      </div>
      <ProductRelatedGrid products={upsellProducts} />
    </WrapperComponent>
  );
};

export default UpsellProduct;
