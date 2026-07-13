import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Col, Row, Card, CardBody, Button, Input, Label, FormGroup } from "reactstrap";
import { RiDeleteBin6Line, RiAddLine } from "react-icons/ri";

const uid = () => `sec-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const CollectionLayoutTab = ({ values, setFieldValue, categoryData }) => {
  const { t } = useTranslation("common");
  const [activeParentId, setActiveParentId] = useState(null);
  const [selectedBySection, setSelectedBySection] = useState({});

  const sections = useMemo(() => {
    const raw = values?.options?.collection?.subcategory_sections;
    return Array.isArray(raw) ? raw : [];
  }, [values?.options?.collection?.subcategory_sections]);

  const parentCategories = useMemo(() => {
    const parents = (categoryData || []).filter((cat) => !cat.parent_id);
    if (parents.length) return parents;
    return categoryData || [];
  }, [categoryData]);

  useEffect(() => {
    if (!parentCategories.length) {
      setActiveParentId(null);
      return;
    }

    if (activeParentId && parentCategories.some((cat) => cat.id === activeParentId)) {
      return;
    }

    const sectionParentId = sections.find((section) =>
      parentCategories.some((cat) => cat.id === section.parent_category_id)
    )?.parent_category_id;

    setActiveParentId(
      sectionParentId ?? parentCategories[0]?.id ?? sections[0]?.parent_category_id ?? null
    );
  }, [parentCategories, sections, activeParentId]);

  const updateSections = (newSections) => {
    setFieldValue("options.collection.subcategory_sections", newSections);
  };

  const parentSectionList = useMemo(
    () => sections.filter((section) => section.parent_category_id === activeParentId),
    [sections, activeParentId]
  );

  const findCategory = (categoryList, id) => {
    if (!categoryList || !categoryList.length || !id) return null;
    for (const category of categoryList) {
      if (category?.id === id) return category;
      const nextLevel =
        (Array.isArray(category.children) && category.children) ||
        (Array.isArray(category.subcategories) && category.subcategories) ||
        [];
      if (nextLevel.length) {
        const found = findCategory(nextLevel, id);
        if (found) return found;
      }
    }
    return null;
  };

  const activeParent = useMemo(() => findCategory(categoryData, activeParentId), [
    categoryData,
    activeParentId,
  ]);

  const handleAddSection = () => {
    if (!activeParentId) return;
    const newSections = [
      ...sections,
      {
        id: uid(),
        parent_category_id: activeParentId,
        enabled: true,
        title: "",
        title_ar: "",
        description: "",
        description_ar: "",
        items: [],
      },
    ];
    updateSections(newSections);
  };

  const handleRemoveSection = (sectionId) => {
    const newSections = sections.filter((section) => section.id !== sectionId);
    updateSections(newSections);
    setSelectedBySection((prev) => {
      const copy = { ...prev };
      delete copy[sectionId];
      return copy;
    });
  };

  const handleSectionEnabled = (sectionId, enabled) => {
    const newSections = sections.map((section) =>
      section.id === sectionId ? { ...section, enabled } : section
    );
    updateSections(newSections);
  };

  const handleSectionTitle = (sectionId, title) => {
    const newSections = sections.map((section) =>
      section.id === sectionId ? { ...section, title } : section
    );
    updateSections(newSections);
  };

  const handleSectionTitleAr = (sectionId, titleAr) => {
    const newSections = sections.map((section) =>
      section.id === sectionId ? { ...section, title_ar: titleAr } : section
    );
    updateSections(newSections);
  };

  const handleSectionDescription = (sectionId, description) => {
    const newSections = sections.map((section) =>
      section.id === sectionId ? { ...section, description } : section
    );
    updateSections(newSections);
  };

  const handleSectionDescriptionAr = (sectionId, descriptionAr) => {
    const newSections = sections.map((section) =>
      section.id === sectionId ? { ...section, description_ar: descriptionAr } : section
    );
    updateSections(newSections);
  };

  const handleAddCategory = (sectionId) => {
    const selectedCategoryId = selectedBySection[sectionId];
    if (!selectedCategoryId) return;

    const newSections = sections.map((section) => {
      if (section.id !== sectionId) return section;
      const items = section.items || [];
      return {
        ...section,
        items: [...items, { category_id: Number(selectedCategoryId), layout: "half" }],
      };
    });
    updateSections(newSections);
    setSelectedBySection((prev) => ({ ...prev, [sectionId]: "" }));
  };

  const handleRemoveCategory = (sectionId, itemIndex) => {
    const newSections = sections.map((section) => {
      if (section.id !== sectionId) return section;
      const newItems = (section.items || []).filter((_, i) => i !== itemIndex);
      return { ...section, items: newItems };
    });
    updateSections(newSections);
  };

  const handleToggleLayout = (sectionId, itemIndex) => {
    const newSections = sections.map((section) => {
      if (section.id !== sectionId) return section;
      const newItems = [...(section.items || [])];
      if (!newItems[itemIndex]) return section;
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        layout: newItems[itemIndex].layout === "full" ? "half" : "full",
      };
      return { ...section, items: newItems };
    });
    updateSections(newSections);
  };

  const handleMoveUp = (sectionId, itemIndex) => {
    const newSections = sections.map((section) => {
      if (section.id !== sectionId) return section;
      const items = [...(section.items || [])];
      if (itemIndex === 0) return section;
      [items[itemIndex - 1], items[itemIndex]] = [items[itemIndex], items[itemIndex - 1]];
      return { ...section, items };
    });
    updateSections(newSections);
  };

  const handleMoveDown = (sectionId, itemIndex) => {
    const newSections = sections.map((section) => {
      if (section.id !== sectionId) return section;
      const items = [...(section.items || [])];
      if (itemIndex === items.length - 1) return section;
      [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
      return { ...section, items };
    });
    updateSections(newSections);
  };

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

  const getChildrenList = (category) => {
    if (!category?.id) return [];
    const directChildren = category?.children || category?.subcategories;
    if (Array.isArray(directChildren) && directChildren.length) {
      return directChildren;
    }
    return (categoryData || []).filter((cat) => cat.parent_id === category.id);
  };
  const parentChildren = getChildrenList(activeParent);

  return (
    <div className="theme-tab-content">
      <h4 className="fw-semibold mb-3">{t("CollectionLayout")}</h4>

      <Card className="mt-4">
        <CardBody>
          <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3 mb-3">
            <h5 className="mb-0">{t("SubcategorySections") || "Subcategories Layout"}</h5>
            <div className="d-flex gap-3 flex-column flex-sm-row w-100 flex-lg-row">
              <FormGroup className="flex-grow-1 mb-0">
                <Label className="mb-1">{t("ParentCategory") || "Parent Category"}</Label>
                <Input
                  type="select"
                  value={activeParentId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveParentId(val ? Number(val) : null);
                  }}
                >
                  <option value="">{t("SelectParentCategory") || "-- Select Parent Category --"}</option>
                  {parentCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
              <Button color="primary" className="ms-auto" onClick={handleAddSection} disabled={!activeParentId}>
                <RiAddLine size={18} className="me-1" />
                Add Section
              </Button>
            </div>
          </div>

          {!parentCategories.length ? (
            <p className="text-muted mb-0">No parent categories available. Please create a category first.</p>
          ) : !activeParent ? (
            <p className="text-muted mb-0">Select a parent category to configure its subcategory layout.</p>
          ) : parentSectionList.length === 0 ? (
            <p className="text-muted mb-0">No sections yet. Click Add Section to start grouping subcategories.</p>
          ) : (
            parentSectionList.map((section, sectionIndex) => {
              const items = section.items || [];
              const previewRows = generatePreview(items);
                  const availableChildren = parentChildren.filter(
                    (child) => !items.some((item) => item.category_id === child.id)
                  );

              return (
                <Card className="mb-4" key={section.id}>
                  <CardBody>
                    <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                      <div className="flex-grow-1">
                        <h6 className="mb-2">
                          {activeParent?.name || "Parent"} • Section #{sectionIndex + 1}
                        </h6>

                        <FormGroup switch className="ps-0 form-switch custom-switch-flex form-check mb-3">
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={section?.enabled === undefined ? true : Boolean(section.enabled)}
                              onChange={(e) => handleSectionEnabled(section.id, e.target.checked)}
                            />
                            <span className="switch-state"></span>
                          </label>
                          <Label className="ms-2 mb-0">{t("EnableSection") || "Enable Section"}</Label>
                        </FormGroup>

                        <FormGroup className="mb-3">
                          <Label>{t("SectionTitle") || "Section Title"} <span className="text-danger">*</span></Label>
                          <Input
                            type="text"
                            value={section?.title || ""}
                            placeholder="Enter section title"
                            onChange={(e) => handleSectionTitle(section.id, e.target.value)}
                            invalid={!section?.title?.trim()}
                          />
                          {!section?.title?.trim() && (
                            <div className="invalid-feedback d-block">Section Title is required.</div>
                          )}
                        </FormGroup>

                        <FormGroup className="mb-3">
                          <Label>Arabic Section Title <span className="text-danger">*</span></Label>
                          <Input
                            type="text"
                            dir="rtl"
                            value={section?.title_ar || ""}
                            placeholder="Enter arabic section title"
                            onChange={(e) => handleSectionTitleAr(section.id, e.target.value)}
                            invalid={!section?.title_ar?.trim()}
                          />
                          {!section?.title_ar?.trim() && (
                            <div className="invalid-feedback d-block">Arabic Section Title is required.</div>
                          )}
                        </FormGroup>

                        <FormGroup className="mb-3">
                          <Label>
                            {t("SectionDescription") || "Section Description"}{" "}
                            <span className="text-muted">(optional)</span>
                          </Label>
                          <Input
                            type="text"
                            value={section?.description || ""}
                            placeholder="Enter section description (optional)"
                            onChange={(e) => handleSectionDescription(section.id, e.target.value)}
                          />
                        </FormGroup>

                        <FormGroup className="mb-0">
                          <Label>
                            Arabic Section Description{" "}
                            <span className="text-muted">(optional)</span>
                          </Label>
                          <Input
                            type="text"
                            dir="rtl"
                            value={section?.description_ar || ""}
                            placeholder="Enter arabic section description (optional)"
                            onChange={(e) => handleSectionDescriptionAr(section.id, e.target.value)}
                          />
                        </FormGroup>
                      </div>

                      <Button color="danger" outline onClick={() => handleRemoveSection(section.id)}>
                        <RiDeleteBin6Line size={16} className="me-1" />
                        Remove
                      </Button>
                    </div>

                    <Card className="mb-4">
                      <CardBody>
                        <h6 className="mb-3">Add Subcategory</h6>
                        <div className="d-flex gap-2 align-items-end flex-column flex-md-row">
                          <FormGroup className="flex-grow-1 mb-0">
                            <Label>Select Subcategory</Label>
                            <Input
                              type="select"
                              value={selectedBySection[section.id] || ""}
                              onChange={(e) =>
                                setSelectedBySection((prev) => ({
                                  ...prev,
                                  [section.id]: e.target.value,
                                }))
                              }
                              disabled={!availableChildren.length}
                            >
                              <option value="">{t("SelectSubcategory") || "-- Select Subcategory --"}</option>
                              {availableChildren.map((child) => (
                                <option key={child.id} value={child.id}>
                                  {child.name}
                                </option>
                              ))}
                            </Input>
                          </FormGroup>
                          <Button
                            color="primary"
                            onClick={() => handleAddCategory(section.id)}
                            disabled={!selectedBySection[section.id] || !availableChildren.length}
                          >
                            <RiAddLine size={18} className="me-1" />
                            Add
                          </Button>
                        </div>
                        {!availableChildren.length && (
                          <small className="text-muted d-block mt-2">
                            No more subcategories available for this parent.
                          </small>
                        )}
                      </CardBody>
                    </Card>

                    <Card className="mb-4">
                      <CardBody>
                        <h6 className="mb-3">
                          Selected Subcategories ({items.length})
                        </h6>
                        {items.length === 0 ? (
                          <p className="text-muted">No subcategories added yet.</p>
                        ) : (
                          <div className="category-list">
                            {items.map((item, itemIndex) => {
                              const category = findCategory(categoryData, item.category_id);
                              if (!category) return null;

                              return (
                                <div
                                  key={`${section.id}-${item.category_id}`}
                                  className="d-flex align-items-center gap-3 p-3 mb-2 border rounded"
                                  style={{
                                    backgroundColor: item.layout === "full" ? "#f8f9fa" : "#fff",
                                  }}
                                >
                                  <div className="d-flex flex-column gap-1">
                                    <Button
                                      size="sm"
                                      color="light"
                                      onClick={() => handleMoveUp(section.id, itemIndex)}
                                      disabled={itemIndex === 0}
                                      title="Move up"
                                    >
                                      ƒ-ý
                                    </Button>
                                    <Button
                                      size="sm"
                                      color="light"
                                      onClick={() => handleMoveDown(section.id, itemIndex)}
                                      disabled={itemIndex === items.length - 1}
                                      title="Move down"
                                    >
                                      ƒ-¬
                                    </Button>
                                  </div>

                                  <div className="flex-grow-1">
                                    <strong>{category.name}</strong>
                                    <div className="small text-muted">
                                      {item.layout === "full" ? "Full Width (1376x690px)" : "Half Width (676x339px)"}
                                    </div>
                                  </div>

                                  <div className="d-flex align-items-center gap-2">
                                    <Label className="mb-0 small">Layout:</Label>
                                    <Button
                                      size="sm"
                                      color={item.layout === "full" ? "primary" : "outline-primary"}
                                      onClick={() => handleToggleLayout(section.id, itemIndex)}
                                    >
                                      {item.layout === "full" ? "Full Width" : "Half Width"}
                                    </Button>
                                  </div>

                                  <Button
                                    size="sm"
                                    color="danger"
                                    outline
                                    onClick={() => handleRemoveCategory(section.id, itemIndex)}
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

                    {items.length > 0 && (
                      <Card>
                        <CardBody>
                          <h6 className="mb-3">Layout Preview</h6>
                          <div className="border rounded p-3" style={{ backgroundColor: "#f8f9fa" }}>
                            {previewRows.map((row, rowIndex) => (
                              <div key={rowIndex} className="d-flex gap-2 mb-2">
                                {row.items.map((it) => {
                                  const cat = findCategory(categoryData, it.category_id);
                                  return (
                                    <div
                                      key={`${section.id}-pv-${it.category_id}`}
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
                            This preview shows how subcategories will display when visitors open the selected parent category.
                          </small>
                        </CardBody>
                      </Card>
                    )}
                  </CardBody>
                </Card>
              );
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default CollectionLayoutTab;
