import WrapperComponent from "@/components/widgets/WrapperComponent";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext } from "react";
import { Row } from "reactstrap";
import SellerSteps from "./SellerSteps";

const SellerBusiness = () => {
  const { themeOption } = useContext(ThemeOptionContext);
  return (
    <WrapperComponent classes={{ sectionClass: "section-b-space become-vendor", fluidClass: "container" }} noRowCol={true}>
      <h4>{themeOption?.seller?.steps?.title}</h4>
      <div className="step-bg">
        <Row>
          <SellerSteps data={themeOption?.seller?.steps?.step_1} number={1} />
          <SellerSteps data={themeOption?.seller?.steps?.step_2} number={2} />
          <SellerSteps data={themeOption?.seller?.steps?.step_3} number={3} />
        </Row>
      </div>
    </WrapperComponent>
  );
};

export default SellerBusiness;
