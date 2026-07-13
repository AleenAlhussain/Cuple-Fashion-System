import { useState } from "react";
import VariationModal from "../variationModal";

const QuickViewButton = ({ productstate, hideAction, className }) => {
  const [variationModal, setVariationModal] = useState("");
  return (
    <>
      {!hideAction?.includes("view") && (
        <div className={className ? className : ""} title="View" onClick={() => setVariationModal(productstate.id)}>
          <a>
            <i className="ri-search-line" />
          </a>
        </div>
      )}
      <VariationModal setVariationModal={setVariationModal} variationModal={variationModal} productObj={productstate} />
    </>
  );
};

export default QuickViewButton;
