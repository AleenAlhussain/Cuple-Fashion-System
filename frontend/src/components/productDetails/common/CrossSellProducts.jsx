import WrapperComponent from "@/components/widgets/WrapperComponent";
import ProductRelatedGrid from "./ProductRelatedGrid";
import { useTranslation } from "react-i18next";

const CrossSellProducts = ({ productState, customContainerClass }) => {
  const { t } = useTranslation("common");

  // Get cross-sell products
  const crossSellProducts = productState?.product?.cross_sell_products || [];

  if (!crossSellProducts.length) {
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
        <h2>{t("YouMayAlsoLike")}</h2>
      </div>
      <ProductRelatedGrid products={crossSellProducts} />
    </WrapperComponent>
  );
};

export default CrossSellProducts;
