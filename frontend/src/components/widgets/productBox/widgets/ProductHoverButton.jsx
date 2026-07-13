import QuickViewButton from './hoverButton/QuickViewButton';
import WishlistButton from './hoverButton/WishlistButton';
import AddToCartHoverButton from './hoverButton/AddToCartHoverButton';

const ProductHoverButton = ({ productstate, listClass, actionsToHide }) => {
  return (
    <ul className="hover-action">
      <WishlistButton productstate={productstate} hideAction={actionsToHide} />
      <AddToCartHoverButton productstate={productstate} hideAction={actionsToHide} />
      <QuickViewButton productstate={productstate} hideAction={actionsToHide} />
    </ul>
  );
};

export default ProductHoverButton;
