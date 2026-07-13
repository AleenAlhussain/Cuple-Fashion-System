"use client";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import ThemeOptionContext from "@/context/themeOptionsContext";
import Loader from "@/layout/loader";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { useContext } from "react";
import { Col } from "reactstrap";
import ContactDetails from "./ContactDetails";
import ContactLeftSideBox from "./ContactLeftSideBox";
import ContactUsForm from "./ContactUsForm";

const ContactUsContent = () => {
  const { isLoading } = useContext(ThemeOptionContext);

  if (isLoading) return <Loader />;
  return (
    <>
      <Breadcrumbs title={"ContactUs"} subNavigation={[{ name: "ContactUs" }]} />
      <WrapperComponent classes={{ sectionClass: "contact-page section-b-space", row: "g-sm-4 g-3", fluidClass: "container" }} customCol={true}>
        <Col lg="5">
          <ContactDetails />
        </Col>
        <Col lg="7">
          <ContactUsForm />
        </Col>
        <ContactLeftSideBox />
      </WrapperComponent>
    </>
  );
};

export default ContactUsContent;
