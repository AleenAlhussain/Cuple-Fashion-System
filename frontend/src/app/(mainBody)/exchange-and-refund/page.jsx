import WrapperComponent from "@/components/widgets/WrapperComponent";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { Col } from "reactstrap";

const steps = [
  {
    title: "Request exchange or refund",
    description: "Open a support ticket with order number and reason within 14 days of receipt.",
  },
  {
    title: "Send the item back",
    description: "Pack the item securely with original tags and send it through any of our drop-off locations.",
  },
  {
    title: "Get confirmation",
    description: "Once we receive and inspect the item, you will get a confirmation email before refund/ exchange.",
  },
];

const ExchangeRefundPage = () => {
  return (
    <>
      <Breadcrumbs title={"Exchange & Refund"} subNavigation={[{ name: "Exchange & Refund" }]} />
      <WrapperComponent classes={{ sectionClass: "section-b-space", fluidClass: "container" }} customCol={true}>
        <div className="row justify-content-center">
          <Col lg={8}>
            <div className="text-center mb-5">
              <h2 className="fw-bold">Easy Exchange & Refund</h2>
              <p className="text-muted">
                We want you to love every purchase. If you need to exchange or refund, follow the steps below
                and our team will handle the rest.
              </p>
            </div>
          </Col>
        </div>
        <div className="row gy-4">
          {steps.map((step, index) => (
            <Col md={4} key={step.title}>
              <div className="p-4 border border-light rounded-4 h-100 shadow-sm">
                <div className="badge bg-theme-color-light text-theme-color px-3 py-1 mb-3">Step {index + 1}</div>
                <h5 className="fw-bold">{step.title}</h5>
                <p className="text-muted">{step.description}</p>
              </div>
            </Col>
          ))}
        </div>
        <div className="row mt-5 justify-content-center">
          <Col md={6}>
            <div className="p-4 rounded-4 shadow-sm text-center">
              <h5 className="fw-bold mb-2">Need help?</h5>
              <p className="text-muted mb-3">Contact our customer service team for personalized guidance.</p>
              <a className="btn btn-solid btn-lg" href="mailto:ert@ayzme.com">
                ert@ayzme.com
              </a>
            </div>
          </Col>
        </div>
      </WrapperComponent>
    </>
  );
};

export default ExchangeRefundPage;
