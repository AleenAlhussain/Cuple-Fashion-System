"use client";
import { Button, Card, CardBody, CardHeader, Col, FormGroup, Input, Label, Row } from "reactstrap";
import { useTranslation } from "react-i18next";
import { RiAddLine, RiDeleteBin6Line } from "react-icons/ri";
import CheckBoxField from "../inputFields/CheckBoxField";
import FileUploadField from "../inputFields/FileUploadField";

const LINK_TYPE_OPTIONS = [
  { id: "collection", labelKey: "Collection" },
  { id: "product", labelKey: "Product" },
  { id: "page", labelKey: "Page" },
  { id: "external_url", labelKey: "External Link" },
];

const HighlightCardsTab = ({ values, setFieldValue }) => {
  const { t } = useTranslation("common");
  const sections = values?.options?.home_highlight_sections?.sections || [];

  const updateSections = (next) => {
    setFieldValue("options.home_highlight_sections.sections", next);
  };

  const addSection = () => {
    const nextSection = {
      id: `highlight-${Date.now()}`,
      status: true,
      subtitle: "",
      title: "",
      description: "",
      button_text: "",
      redirect_link: { link_type: "collection", link: "" },
      image: null,
      image_url: "",
    };
    updateSections([...sections, nextSection]);
  };

  const removeSection = (index) => {
    updateSections(sections.filter((_, idx) => idx !== index));
  };

  const handleInputChange = (index, field, value) => {
    setFieldValue(`options.home_highlight_sections.sections[${index}].${field}`, value);
  };

  const handleLinkTypeChange = (index, value) => {
    setFieldValue(
      `options.home_highlight_sections.sections[${index}].redirect_link.link_type`,
      value
    );
  };

  const handleRedirectChange = (index, value) => {
    setFieldValue(`options.home_highlight_sections.sections[${index}].redirect_link.link`, value);
  };

  return (
    <div className="px-2 py-2">
      <Row className="mb-3 align-items-center">
        <Col>
          <div>
            <h5 className="mb-0">{t("HighlightCards")}</h5>
            <p className="text-muted small mb-0">{t("HighlightCardsIntro")}</p>
          </div>
        </Col>
        <Col className="text-end">
          <Button color="primary" onClick={addSection}>
            <RiAddLine className="me-1" />
            {t("AddHighlightCard")}
          </Button>
        </Col>
      </Row>

      {sections.length === 0 && (
        <Row>
          <Col>
            <p className="text-muted">{t("NoHighlightCards")}</p>
          </Col>
        </Row>
      )}

      {sections.map((section, index) => (
        <Card className="mb-4" key={section.id || index}>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <div>
              <h6 className="mb-0">
                {t("HighlightCard")} #{index + 1}
              </h6>
            </div>
            <Button color="outline-danger" size="sm" onClick={() => removeSection(index)}>
              <RiDeleteBin6Line className="me-1" />
              {t("RemoveBanner")}
            </Button>
          </CardHeader>
          <CardBody>
            <Row className="gy-3">
              <Col lg="4">
                <Label className="form-label">{t("HighlightCardImageLabel")}</Label>
                <FileUploadField
                  name={`options.home_highlight_sections.sections[${index}].image_id`}
                  uniquename={section?.image}
                  values={values}
                  setFieldValue={setFieldValue}
                  helpertext={t("HighlightCardImageHelper")}
                  id={`highlight-card-image-${index}`}
                />
              </Col>
              <Col lg="8">
                <Row className="gy-3">
                  <Col md="6">
                    <FormGroup>
                      <Label className="form-label">{t("SubTitle")}</Label>
                      <Input
                        type="text"
                        placeholder={t("EnterSubTitle")}
                        value={section?.subtitle || ""}
                        onChange={(e) => handleInputChange(index, "subtitle", e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label className="form-label">{t("Title")}</Label>
                      <Input
                        type="text"
                        placeholder={t("EnterTitle")}
                        value={section?.title || ""}
                        onChange={(e) => handleInputChange(index, "title", e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="12">
                    <FormGroup>
                      <Label className="form-label">{t("Description")}</Label>
                      <Input
                        type="textarea"
                        rows={3}
                        placeholder={t("EnterDescription")}
                        value={section?.description || ""}
                        onChange={(e) => handleInputChange(index, "description", e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label className="form-label">{t("ButtonText")}</Label>
                      <Input
                        type="text"
                        placeholder={t("ButtonText")}
                        value={section?.button_text || ""}
                        onChange={(e) => handleInputChange(index, "button_text", e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <Row className="gy-3 align-items-end">
                  <Col md="4">
                    <FormGroup>
                      <Label className="form-label">{t("LinkType")}</Label>
                      <Input
                        type="select"
                        value={section?.redirect_link?.link_type || LINK_TYPE_OPTIONS[0].id}
                        onChange={(e) => handleLinkTypeChange(index, e.target.value)}
                      >
                        {LINK_TYPE_OPTIONS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {t(item.labelKey)}
                          </option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md="8">
                    <FormGroup>
                      <Label className="form-label">{t("RedirectLink")}</Label>
                      <Input
                        type="text"
                        placeholder={t("EnterRedirectLink")}
                        value={section?.redirect_link?.link || ""}
                        onChange={(e) => handleRedirectChange(index, e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                </Row>
                <CheckBoxField
                  name={`options.home_highlight_sections.sections[${index}].status`}
                  helpertext={t("ShowOnHomepageHelper")}
                />
              </Col>
            </Row>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

export default HighlightCardsTab;
