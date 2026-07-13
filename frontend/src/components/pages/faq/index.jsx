"use client";
import NoDataFound from "@/components/widgets/NoDataFound";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Loader from "@/layout/loader";
import Breadcrumbs from "@/utils/commonComponents/breadcrumb";
import { localizedValue } from "@/utils/constants";
import { useGetFaqs } from "@/utils/api";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionBody, AccordionHeader, AccordionItem, Container } from "reactstrap";

const BrowserFaq = () => {
  const { i18n } = useTranslation("common");
  const [open, setOpen] = useState("1");
  const language = String(i18n?.language || "").toLowerCase().startsWith("ar") ? "ar" : "en";

  const getFaqValue = (faq, field) => {
    const localized = localizedValue(faq, field, language);

    if (localized) {
      return localized;
    }

    return language === "ar" ? faq?.[field] || "" : faq?.[`${field}_ar`] || "";
  };

  const toggle = (id) => {
    if (open === id) {
      setOpen();
    } else {
      setOpen(id);
    }
  };
  const { data, isLoading } = useGetFaqs({ status: 1 }, {
    enabled: true,
    refetchOnWindowFocus: false,
    select: (data) => data?.data,
  });

  if (isLoading) return <Loader />;
  return (
    <>
      <Breadcrumbs title={`FAQ's`} subNavigation={[{ name: `FAQ's` }]} />
      {data?.length > 0 ? (
        <WrapperComponent classes={{ sectionClass: "faq-section section-b-space", fluidClass: "container", colClass: "col-sm-12" }}>
          <Accordion className="faq-accordion" aria-expanded={toggle} open={open} toggle={toggle}>
            {data?.map((faq, i) => (
              <AccordionItem className="card" key={faq?.id || i}>
                <AccordionHeader className="card-header" targetId={String(i + 1)}>
                  <span dir="auto">{getFaqValue(faq, "title")}</span>
                </AccordionHeader>
                <AccordionBody className="card-body" accordionId={String(i + 1)}>
                  <p dir="auto">{getFaqValue(faq, "description")}</p>
                </AccordionBody>
              </AccordionItem>
            ))}
          </Accordion>
        </WrapperComponent>
      ) : (
        <section className="section-b-space section-t-space">
          <Container>
            <NoDataFound customClass="no-data-added" imageUrl={'/assets/svg/empty-items.svg'} title="NoFAQFound" description="NoFAQDescription" height="300" width="300" />
          </Container>
        </section>
      )}
    </>
  );
};

export default BrowserFaq;
