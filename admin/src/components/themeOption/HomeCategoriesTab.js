"use client";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Col, Row, Card, CardBody, Button, Input, Label, FormGroup } from "reactstrap";
import { RiDeleteBin6Line, RiAddLine } from "react-icons/ri";

const uid = () => `sec-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const HomeCategoriesTab = ({ values, setFieldValue, categoryData }) => {
  const { t } = useTranslation("common");

  // selected category per section index
  const [selectedBySection, setSelectedBySection] = useState({});

  const sections = useMemo(() => {
    const raw = values?.options?.home_categories?.sections;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [values?.options?.home_categories?.sections]);

  // Flatten nested category tree so parent + child categories are selectable.
  const flatCategories = useMemo(() => {
    const nodes = Array.isArray(categoryData) ? categoryData : [];
    const map = new Map();

    const walk = (items, ancestors = []) => {
      items.forEach((item) => {
        if (!item?.id) return;

        const currentName = item?.name || item?.title || `#${item.id}`;
        const path = [...ancestors, currentName];

        if (!map.has(item.id)) {
          map.set(item.id, {
            ...item,
            display_name: path.join(" > "),
          });
        }

        const children = Array.isArray(item?.subcategories)
          ? item.subcategories
          : Array.isArray(item?.children)
            ? item.children
            : Array.isArray(item?.child)
              ? item.child
              : [];

        if (children.length) {
          walk(children, path);
        }
      });
    };

    walk(nodes);
    return Array.from(map.values());
  }, [categoryData]);

  const globalHeadline = values?.options?.home_categories?.headline || "";
  const globalSubheadline = values?.options?.home_categories?.subheadline || "";
  const globalHeadlineAr = values?.options?.home_categories?.headline_ar || "";
  const globalSubheadlineAr = values?.options?.home_categories?.subheadline_ar || "";
  const globalHeadlineValid = Boolean(globalHeadline.trim());
  const globalHeadlineArValid = Boolean(globalHeadlineAr.trim());

  // helper: update sections array in formik
  const updateSections = (newSections) => {
    setFieldValue("options.home_categories.sections", newSections);
  };

  // helper: find category
  const getCategoryById = (id) =>
    flatCategories.find((cat) => Number(cat.id) === Number(id));

  // Add Section
  const handleAddSection = () => {
    const newSections = [
      ...sections,
      {
        id: uid(),
        enabled: true,
        title: "", // REQUIRED
        title_ar: "", // REQUIRED
        description: "", // optional
        description_ar: "", // optional
        items: [],
      },
    ];
    updateSections(newSections);
  };

  // Remove Section
  const handleRemoveSection = (sectionIndex) => {
    const newSections = sections.filter((_, i) => i !== sectionIndex);
    updateSections(newSections);

    // cleanup selected state
    setSelectedBySection((prev) => {
      const copy = { ...prev };
      delete copy[sectionIndex];
      return copy;
    });
  };

  // Toggle section enabled
  const handleSectionEnabled = (sectionIndex, enabled) => {
    const newSections = [...sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], enabled };
    updateSections(newSections);
  };

  // Change section title (REQUIRED)
  const handleSectionTitle = (sectionIndex, title) => {
    const newSections = [...sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], title };
    updateSections(newSections);
  };

  // Change section Arabic title (REQUIRED)
  const handleSectionTitleAr = (sectionIndex, titleAr) => {
    const newSections = [...sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], title_ar: titleAr };
    updateSections(newSections);
  };

  // Change section description (optional)
  const handleSectionDescription = (sectionIndex, description) => {
    const newSections = [...sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], description };
    updateSections(newSections);
  };

  // Change section Arabic description (optional)
  const handleSectionDescriptionAr = (sectionIndex, descriptionAr) => {
    const newSections = [...sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], description_ar: descriptionAr };
    updateSections(newSections);
  };

  // Add category to section
  const handleAddCategory = (sectionIndex) => {
    const selectedCategoryId = selectedBySection[sectionIndex];
    if (!selectedCategoryId) return;

    const sec = sections[sectionIndex];
    const items = sec?.items || [];

    const newItems = [...items, { category_id: parseInt(selectedCategoryId), layout: "half" }];

    const newSections = [...sections];
    newSections[sectionIndex] = { ...sec, items: newItems };
    updateSections(newSections);

    setSelectedBySection((prev) => ({ ...prev, [sectionIndex]: "" }));
  };

  // Remove category from section
  const handleRemoveCategory = (sectionIndex, itemIndex) => {
    const sec = sections[sectionIndex];
    const newItems = (sec.items || []).filter((_, i) => i !== itemIndex);

    const newSections = [...sections];
    newSections[sectionIndex] = { ...sec, items: newItems };
    updateSections(newSections);
  };

  // Toggle layout for item in section
  const handleToggleLayout = (sectionIndex, itemIndex) => {
    const sec = sections[sectionIndex];
    const newItems = [...(sec.items || [])];

    newItems[itemIndex] = {
      ...newItems[itemIndex],
      layout: newItems[itemIndex].layout === "full" ? "half" : "full",
    };

    const newSections = [...sections];
    newSections[sectionIndex] = { ...sec, items: newItems };
    updateSections(newSections);
  };

  // Move item up/down in section
  const handleMoveUp = (sectionIndex, itemIndex) => {
    if (itemIndex === 0) return;

    const sec = sections[sectionIndex];
    const newItems = [...(sec.items || [])];
    [newItems[itemIndex - 1], newItems[itemIndex]] = [newItems[itemIndex], newItems[itemIndex - 1]];

    const newSections = [...sections];
    newSections[sectionIndex] = { ...sec, items: newItems };
    updateSections(newSections);
  };

  const handleMoveDown = (sectionIndex, itemIndex) => {
    const sec = sections[sectionIndex];
    const items = sec.items || [];
    if (itemIndex === items.length - 1) return;

    const newItems = [...items];
    [newItems[itemIndex], newItems[itemIndex + 1]] = [newItems[itemIndex + 1], newItems[itemIndex]];

    const newSections = [...sections];
    newSections[sectionIndex] = { ...sec, items: newItems };
    updateSections(newSections);
  };

  // Preview generator (same logic but per section)
  const generatePreview = (items) => {
    const rows = [];
    let i = 0;
    while (i < items.length) {
      if (items[i].layout === "full") {
        rows.push({ type: "full", items: [items[i]] });
        i++;
      } else {
        const halfItems = [items[i]];
        if (i + 1 < items.length && items[i + 1].layout === "half") {
          halfItems.push(items[i + 1]);
          i += 2;
        } else {
          i++;
        }
        rows.push({ type: "half", items: halfItems });
      }
    }
    return rows;
  };

  return (
    <Row>
      <Col sm="12">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="mb-0">{t("HomepageCategories") || "Homepage Categories"}</h5>
          <Button color="primary" onClick={handleAddSection}>
            <RiAddLine size={18} className="me-1" />
            Add Section
          </Button>
        </div>

        {/* ✅ Global Headline (once for all sections) */}
        <Card className="mb-4">
          <CardBody>
            <h6 className="mb-3">Homepage Categories Headline</h6>

            <FormGroup className="mb-3">
              <Label>
                Sections Headline <span className="text-danger">*</span>
              </Label>
              <Input
                type="text"
                value={globalHeadline}
                placeholder="Enter Sections Headline"
                onChange={(e) => setFieldValue("options.home_categories.headline", e.target.value)}
                invalid={!globalHeadlineValid}
              />
              {!globalHeadlineValid ? (
                <div className="invalid-feedback d-block">Sections Headline is required.</div>
              ) : null}
            </FormGroup>

            <FormGroup className="mb-3">
              <Label>
                Arabic Sections Headline <span className="text-danger">*</span>
              </Label>
              <Input
                type="text"
                dir="rtl"
                value={globalHeadlineAr}
                placeholder="Enter Arabic Sections Headline"
                onChange={(e) => setFieldValue("options.home_categories.headline_ar", e.target.value)}
                invalid={!globalHeadlineArValid}
              />
              {!globalHeadlineArValid ? (
                <div className="invalid-feedback d-block">Arabic Sections Headline is required.</div>
              ) : null}
            </FormGroup>

            <FormGroup className="mb-0">
              <Label>
                Sections Subheadline <span className="text-muted">(optional)</span>
              </Label>
              <Input
                type="text"
                value={globalSubheadline}
                placeholder="Enter Sections Subheadline (Optional)"
                onChange={(e) => setFieldValue("options.home_categories.subheadline", e.target.value)}
              />
            </FormGroup>

            <FormGroup className="mb-0 mt-3">
              <Label>
                Arabic Sections Subheadline <span className="text-muted">(optional)</span>
              </Label>
              <Input
                type="text"
                dir="rtl"
                value={globalSubheadlineAr}
                placeholder="Enter Arabic Sections Subheadline (Optional)"
                onChange={(e) => setFieldValue("options.home_categories.subheadline_ar", e.target.value)}
              />
            </FormGroup>
          </CardBody>
        </Card>

        {sections.length === 0 ? (
          <p className="text-muted">No sections yet. Click “Add Section”.</p>
        ) : (
          <>
            {sections.map((section, sectionIndex) => {
              const items = section.items || [];
              const previewRows = generatePreview(items);

              // available categories ONLY for this section (prevent duplicates inside section)
              const availableCategories = flatCategories.filter(
                (cat) => !items.find((it) => Number(it.category_id) === Number(cat.id))
              );

              return (
                <Card className="mb-4" key={section?.id || sectionIndex}>
                  <CardBody>
                    {/* Section header */}
                    <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                      <div className="flex-grow-1">
                        <h6 className="mb-2">Section #{sectionIndex + 1}</h6>

                        <FormGroup switch className="ps-0 form-switch custom-switch-flex form-check mb-3">
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={section?.enabled === undefined ? true : Boolean(section.enabled)}
                              onChange={(e) => handleSectionEnabled(sectionIndex, e.target.checked)}
                            />
                            <span className="switch-state"></span>
                          </label>
                          <Label className="ms-2 mb-0">{t("EnableSection") || "Enable Section"}</Label>
                        </FormGroup>

                        {/* Title (REQUIRED) */}
                        <FormGroup className="mb-3">
                          <Label>
                            {t("SectionTitle") || "Section Title"} <span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            value={section?.title || ""}
                            placeholder="Enter section title"
                            onChange={(e) => handleSectionTitle(sectionIndex, e.target.value)}
                            invalid={!section?.title?.trim()}
                          />
                          {!section?.title?.trim() ? (
                            <div className="invalid-feedback d-block">Section Title is required.</div>
                          ) : null}
                        </FormGroup>

                        {/* Arabic Title (REQUIRED) */}
                        <FormGroup className="mb-3">
                          <Label>
                            Arabic Section Title <span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            dir="rtl"
                            value={section?.title_ar || ""}
                            placeholder="Enter Arabic section title"
                            onChange={(e) => handleSectionTitleAr(sectionIndex, e.target.value)}
                            invalid={!section?.title_ar?.trim()}
                          />
                          {!section?.title_ar?.trim() ? (
                            <div className="invalid-feedback d-block">Arabic Section Title is required.</div>
                          ) : null}
                        </FormGroup>

                        {/* Description (optional) */}
                        <FormGroup className="mb-0">
                          <Label>
                            {t("SectionDescription") || "Section Description"}{" "}
                            <span className="text-muted">(optional)</span>
                          </Label>
                          <Input
                            type="text"
                            value={section?.description || ""}
                            placeholder="Enter section description (optional)"
                            onChange={(e) => handleSectionDescription(sectionIndex, e.target.value)}
                          />
                        </FormGroup>

                        {/* Arabic Description (optional) */}
                        <FormGroup className="mb-0 mt-3">
                          <Label>
                            Arabic Section Description <span className="text-muted">(optional)</span>
                          </Label>
                          <Input
                            type="text"
                            dir="rtl"
                            value={section?.description_ar || ""}
                            placeholder="Enter Arabic section description (optional)"
                            onChange={(e) => handleSectionDescriptionAr(sectionIndex, e.target.value)}
                          />
                        </FormGroup>
                      </div>

                      <Button
                        color="danger"
                        outline
                        onClick={() => handleRemoveSection(sectionIndex)}
                        title="Remove Section"
                      >
                        <RiDeleteBin6Line size={16} className="me-1" />
                        Remove
                      </Button>
                    </div>

                    {/* Add Category */}
                    <Card className="mb-4">
                      <CardBody>
                        <h6 className="mb-3">Add Category</h6>
                        <div className="d-flex gap-2 align-items-end">
                          <FormGroup className="flex-grow-1 mb-0">
                            <Label>Select Category</Label>
                            <Input
                              type="select"
                              value={selectedBySection[sectionIndex] || ""}
                              onChange={(e) =>
                                setSelectedBySection((prev) => ({
                                  ...prev,
                                  [sectionIndex]: e.target.value,
                                }))
                              }
                            >
                              <option value="">-- Select Category --</option>
                              {availableCategories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.display_name || cat.name}
                                </option>
                              ))}
                            </Input>
                          </FormGroup>

                          <Button
                            color="primary"
                            onClick={() => handleAddCategory(sectionIndex)}
                            disabled={!selectedBySection[sectionIndex]}
                          >
                            <RiAddLine size={18} className="me-1" />
                            Add
                          </Button>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Category List */}
                    <Card className="mb-4">
                      <CardBody>
                        <h6 className="mb-3">Selected Categories ({items.length})</h6>
                        {items.length === 0 ? (
                          <p className="text-muted">No categories selected for this section.</p>
                        ) : (
                          <div className="category-list">
                            {items.map((item, itemIndex) => {
                              const category = getCategoryById(item.category_id);
                              if (!category) return null;

                              return (
                                <div
                                  key={`${section?.id || sectionIndex}-${item.category_id}`}
                                  className="d-flex align-items-center gap-3 p-3 mb-2 border rounded"
                                  style={{ backgroundColor: item.layout === "full" ? "#f8f9fa" : "#fff" }}
                                >
                                  {/* Reorder */}
                                  <div className="d-flex flex-column gap-1">
                                    <Button
                                      size="sm"
                                      color="light"
                                      onClick={() => handleMoveUp(sectionIndex, itemIndex)}
                                      disabled={itemIndex === 0}
                                      title="Move up"
                                    >
                                      ▲
                                    </Button>
                                    <Button
                                      size="sm"
                                      color="light"
                                      onClick={() => handleMoveDown(sectionIndex, itemIndex)}
                                      disabled={itemIndex === items.length - 1}
                                      title="Move down"
                                    >
                                      ▼
                                    </Button>
                                  </div>

                                  {/* Category */}
                                  <div className="flex-grow-1">
                                    <strong>{category.name}</strong>
                                    <div className="small text-muted">
                                      {item.layout === "full" ? "Full Width (1376x690px)" : "Half Width (676x339px)"}
                                    </div>
                                  </div>

                                  {/* Layout */}
                                  <div className="d-flex align-items-center gap-2">
                                    <Label className="mb-0 small">Layout:</Label>
                                    <Button
                                      size="sm"
                                      color={item.layout === "full" ? "primary" : "outline-primary"}
                                      onClick={() => handleToggleLayout(sectionIndex, itemIndex)}
                                    >
                                      {item.layout === "full" ? "Full Width" : "Half Width"}
                                    </Button>
                                  </div>

                                  {/* Delete */}
                                  <Button
                                    size="sm"
                                    color="danger"
                                    outline
                                    onClick={() => handleRemoveCategory(sectionIndex, itemIndex)}
                                    title="Remove"
                                  >
                                    <RiDeleteBin6Line size={16} />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardBody>
                    </Card>

                    {/* Preview */}
                    {items.length > 0 && (
                      <Card>
                        <CardBody>
                          <h6 className="mb-3">Layout Preview</h6>
                          <div className="border rounded p-3" style={{ backgroundColor: "#f8f9fa" }}>
                            {previewRows.map((row, rowIndex) => (
                              <div key={rowIndex} className="d-flex gap-2 mb-2">
                                {row.items.map((it) => {
                                  const cat = getCategoryById(it.category_id);
                                  return (
                                    <div
                                      key={`${section?.id || sectionIndex}-pv-${it.category_id}`}
                                      className="border rounded p-2 text-center"
                                      style={{
                                        flex: row.type === "full" ? "1 0 100%" : "1 0 48%",
                                        backgroundColor: "#fff",
                                        minHeight: "60px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <div>
                                        <strong className="small">{cat?.name}</strong>
                                        <div className="text-muted" style={{ fontSize: "10px" }}>
                                          {row.type === "full" ? "100%" : "50%"}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>

                          <small className="text-muted mt-2 d-block">
                            This preview shows how categories will appear on the homepage. Full width categories take the
                            entire row, half width categories appear side by side.
                          </small>
                        </CardBody>
                      </Card>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </>
        )}
      </Col>
    </Row>
  );
};

export default HomeCategoriesTab;
