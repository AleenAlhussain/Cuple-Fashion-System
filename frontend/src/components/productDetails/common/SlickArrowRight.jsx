import { RiArrowRightSLine } from "react-icons/ri";

const SlickArrowRight = ({ currentSlide, slideCount, ...props }) => (
<RiArrowRightSLine
    {...props}
    className={`slick-arrow slick-next ${currentSlide === slideCount - 1 ? "slick-disabled" : ""}`}
    aria-hidden="true"
    aria-disabled={currentSlide === slideCount - 1 ? "true" : "false"}
/>
);  

export default SlickArrowRight;