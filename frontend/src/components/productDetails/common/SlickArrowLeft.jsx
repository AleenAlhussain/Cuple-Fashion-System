import { RiArrowLeftSLine } from "react-icons/ri";

const SlickArrowLeft = ({ currentSlide, slideCount, ...props }) => (
<RiArrowLeftSLine
    {...props}
    className={`slick-arrow slick-prev ${currentSlide === 0 ? "slick-disabled" : ""}`}
    aria-hidden="true"
    aria-disabled={currentSlide === 0 ? "true" : "false"}
/>
);

export default SlickArrowLeft;