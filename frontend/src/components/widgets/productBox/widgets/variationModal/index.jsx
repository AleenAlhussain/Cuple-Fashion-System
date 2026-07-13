import ProductAttribute from "@/components/productDetails/common/productAttribute/ProductAttribute";
import WishlistCompareShare from "@/components/productDetails/common/WishlistCompareShare";
import CustomModal from "@/components/widgets/CustomModal";
import { useEffect, useState } from "react";
import { Col, Row } from "reactstrap";
import LeftSideModal from "./LeftSideModal";
import RightVariationModal from "./RightSideModal";
import VariationAddToCart from "./VariationAddToCart";
import VariationModalQty from "./VariationModalQty";

const createInitialVariationState = (productObj) => ({
  product: productObj,
  attributeValues: [],
  productQty: 1,
  selectedVariation: null,
  variation: null,
  variation_id: null,
  variantIds: [],
  statusIds: [],
});

const VariationModal = ({ productObj, variationModal, setVariationModal }) => {
  const [cloneVariation, setCloneVariation] = useState(
    createInitialVariationState(productObj)
  );

  useEffect(() => {
    if (productObj?.id == variationModal) {
      setCloneVariation(createInitialVariationState(productObj));
    }
  }, [productObj, variationModal]);

  return (
    <CustomModal modal={productObj?.id == variationModal} setModal={setVariationModal} classes={{ modalClass: "quick-view-modal modal-lg theme-modal-2", modalHeaderClass: "p-0" }}>
      <Row className="g-sm-4 g-3">
        <LeftSideModal cloneVariation={cloneVariation} productObj={productObj} />
        <Col lg="6" className="rtl-text">
          <div className="right-sidebar-modal product-page-details">
            <RightVariationModal cloneVariation={cloneVariation} />
            {cloneVariation?.product && productObj?.id == variationModal && <ProductAttribute noHoverEffect={true} autoSelectFirstVariant={false} productState={cloneVariation} setProductState={setCloneVariation} />}
            <div className="product-buttons">
              <VariationModalQty cloneVariation={cloneVariation} setCloneVariation={setCloneVariation} />
              <VariationAddToCart  cloneVariation={cloneVariation} setVariationModal={setVariationModal} />
            </div>
            <WishlistCompareShare productState={cloneVariation} />
          </div>
        </Col>
      </Row>
    </CustomModal>
  );
};

export default VariationModal;
