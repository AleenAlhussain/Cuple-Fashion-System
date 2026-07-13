"use client";
import ThemeOptionContext from "@/context/themeOptionsContext";
import { useContext } from "react";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import AboutUsImage from "./AboutUsImage";
import AboutUsText from "./AboutUsText";
import ClientSection from "./ClientSection";
import CreativeTeam from "./CreativeTeam";
import ServiceSection from "./ServicesSection";
import Loader from "@/layout/loader";

const AboutUsContent = () => {
  const { themeOption, isLoading } = useContext(ThemeOptionContext);
  if (isLoading) return <Loader />;
  return (
    <>
      <Breadcrumbs title={"AboutUs"} subNavigation={[{ name: "AboutUs" }]} />
      <WrapperComponent
        classes={{
          sectionClass: "about-page section-b-space ",
          fluidClass: "container",
        }}
        noRowCol={true}
      >
        <AboutUsImage />
        <AboutUsText />
      </WrapperComponent>
      {themeOption?.about_us?.testimonial?.status && themeOption?.about_us?.testimonial?.reviews?.length && <ClientSection />}
      {themeOption?.about_us?.team?.status && themeOption?.about_us?.team?.members?.length && <CreativeTeam />}
      {themeOption?.about_us?.about?.futures && <ServiceSection />}
    </>
  );
};

export default AboutUsContent;
