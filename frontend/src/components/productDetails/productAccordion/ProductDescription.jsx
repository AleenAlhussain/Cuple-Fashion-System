import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { localizedValue } from "@/utils/constants";
import { Accordion, AccordionBody, AccordionHeader, AccordionItem, Col, Row } from "reactstrap";
import ProductDeliveryInformation from "../common/ProductDeliveryInformation";
import ProductInformation from "../common/ProductInformation";

const ProductDescription = ({ productState }) => {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const [open, setOpen] = useState("1");
  const toggle = (id) => {
    if (open === id) {
      setOpen();
    } else {
      setOpen(id);
    }
  };

  return (
    <Row className="product-accordion">
      <Col sm="12">
        <Accordion open={open} toggle={toggle} className="theme-accordion">
          <AccordionItem className="card">
            <AccordionHeader className="card-header" targetId="1">
              <h5 className="mb-0">
                <span color="transparent" className="btn-link ">
                  {t("ProductDescription")}
                </span>
              </h5>
            </AccordionHeader>
            <AccordionBody accordionId="1" className="card-body">
              <p>{localizedValue(productState?.product, 'short_description', lang)}</p>
            </AccordionBody>
          </AccordionItem>
          <AccordionItem className="card">
            <AccordionHeader targetId="2" className="card-header">
              <h5 className="mb-0">
                <span color="transparent" className="btn-link ">
                  {t("Information")}
                </span>
              </h5>
            </AccordionHeader>
            <AccordionBody accordionId="2" className="card-body pt-0">
              <ProductInformation productState={productState} />
              <ProductDeliveryInformation productState={productState} />
            </AccordionBody>
          </AccordionItem>
        </Accordion>
      </Col>
    </Row>
  );
};

export default ProductDescription;
