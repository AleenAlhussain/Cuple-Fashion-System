import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Row,
  Col,
  Card,
  CardBody,
  Table,
  Button,
  Badge,
  Input,
  Alert,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label,
} from "reactstrap";
import {
  RiDeleteBin6Line,
  RiUpload2Line,
  RiDownload2Line,
  RiSearchLine,
  RiFilterLine,
  RiCheckboxMultipleLine,
  RiCloseCircleLine,
} from "react-icons/ri";
import FormBtn from "../../elements/buttons/FormBtn";
import request from "../../utils/axiosUtils";
import { YupObject, nameSchema } from "../../utils/validation/ValidationSchemas";
import Loader from "../commonComponent/Loader";
import CheckBoxField from "../inputFields/CheckBoxField";
import SimpleInputField from "../inputFields/SimpleInputField";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import {
  PromoGroupAPI,
  PromoGroupUploadSkusAPI,
  PromoGroupTemplateAPI,
  DiscountRuleFilterOptionsAPI,
  PromoGroupVariantsByCategoryAPI,
} from "@/utils/axiosUtils/API";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const PromoGroupForm = ({ updateId, mutate, loading, buttonName }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [variants, setVariants] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [allSkus, setAllSkus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);

  // Bulk selection state
  const [bulkSelectModal, setBulkSelectModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filteredVariants, setFilteredVariants] = useState([]);
  const [selectedForBulk, setSelectedForBulk] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [bulkSearchTerm, setBulkSearchTerm] = useState("");

  // Selected SKUs for deletion
  const [selectedForDelete, setSelectedForDelete] = useState([]);

  // Fetch existing promo group data
  const {
    data: oldData,
    isLoading,
    refetch,
  } = useCustomQuery(
    ["promo-group", updateId],
    () => request({ url: `${PromoGroupAPI}/${updateId}` }, router),
    { refetchOnMount: false, enabled: false }
  );

  // Fetch all SKUs and categories for selection
  const { data: filterOptions } = useCustomQuery(
    ["filter-options"],
    () => request({ url: DiscountRuleFilterOptionsAPI }, router),
    { refetchOnMount: true }
  );

  useEffect(() => {
    if (updateId) {
      refetch();
    }
  }, [updateId]);

  useEffect(() => {
    if (oldData?.data?.data?.variants) {
      setVariants(oldData.data.data.variants);
    }
  }, [oldData]);

  useEffect(() => {
    if (filterOptions?.data?.data) {
      setAllSkus(filterOptions.data.data.skus || []);
      setCategories(filterOptions.data.data.categories || []);
    }
  }, [filterOptions]);

  // Handle Excel upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!updateId) {
      ToastNotification("error", "Please save the promo group first before uploading SKUs");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await request(
        {
          url: PromoGroupUploadSkusAPI(updateId),
          method: "post",
          data: formData,
          headers: { "Content-Type": "multipart/form-data" },
        },
        router
      );

      if (response?.data?.success) {
        ToastNotification("success", response.data.message || "SKUs uploaded successfully");
        setUploadResult({
          success: true,
          added: response.data.added_count || 0,
          notFound: response.data.not_found_skus || [],
        });
        refetch();
      } else {
        ToastNotification("error", response?.data?.message || "Upload failed");
      }
    } catch (error) {
      ToastNotification("error", "Failed to upload SKUs");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const response = await request(
        {
          url: PromoGroupTemplateAPI,
          responseType: "blob",
        },
        router
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "promo_group_sku_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      ToastNotification("error", "Failed to download template");
    }
  };

  // Add SKU manually
  const addSku = (sku) => {
    if (!variants.find((v) => v.id === sku.value)) {
      setVariants([...variants, { id: sku.value, sku: sku.label }]);
    }
    setSearchTerm("");
    setShowSkuDropdown(false);
  };

  // Remove SKU
  const removeSku = (variantId) => {
    setVariants(variants.filter((v) => v.id !== variantId));
    setSelectedForDelete(selectedForDelete.filter((id) => id !== variantId));
  };

  // Remove selected SKUs (bulk delete)
  const removeSelectedSkus = () => {
    setVariants(variants.filter((v) => !selectedForDelete.includes(v.id)));
    setSelectedForDelete([]);
  };

  // Toggle selection for delete
  const toggleDeleteSelection = (variantId) => {
    if (selectedForDelete.includes(variantId)) {
      setSelectedForDelete(selectedForDelete.filter((id) => id !== variantId));
    } else {
      setSelectedForDelete([...selectedForDelete, variantId]);
    }
  };

  // Select all for delete
  const selectAllForDelete = () => {
    setSelectedForDelete(variants.map((v) => v.id));
  };

  // Clear delete selection
  const clearDeleteSelection = () => {
    setSelectedForDelete([]);
  };

  // Filter SKUs based on search
  const filteredSkus = allSkus.filter(
    (sku) =>
      sku.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !variants.find((v) => v.id === sku.value)
  );

  // Fetch variants by category for bulk selection
  const fetchVariantsByCategory = async (categoryId) => {
    if (!categoryId) {
      setFilteredVariants([]);
      return;
    }

    setLoadingVariants(true);
    try {
      const response = await request(
        { url: PromoGroupVariantsByCategoryAPI(categoryId) },
        router
      );

      if (response?.data?.success) {
        setFilteredVariants(response.data.data || []);
      } else {
        setFilteredVariants([]);
      }
    } catch (error) {
      ToastNotification("error", "Failed to fetch variants");
      setFilteredVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Handle category change in bulk modal
  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    setSelectedForBulk([]);
    setBulkSearchTerm("");
    fetchVariantsByCategory(categoryId);
  };

  // Filter variants in bulk modal by search
  const filteredBulkVariants = filteredVariants.filter(
    (v) =>
      v.sku.toLowerCase().includes(bulkSearchTerm.toLowerCase()) ||
      (v.product_name && v.product_name.toLowerCase().includes(bulkSearchTerm.toLowerCase()))
  );

  // Toggle bulk selection
  const toggleBulkSelection = (variantId) => {
    if (selectedForBulk.includes(variantId)) {
      setSelectedForBulk(selectedForBulk.filter((id) => id !== variantId));
    } else {
      setSelectedForBulk([...selectedForBulk, variantId]);
    }
  };

  // Select all filtered variants
  const selectAllFiltered = () => {
    const existingIds = variants.map((v) => v.id);
    const newIds = filteredBulkVariants
      .filter((v) => !existingIds.includes(v.id))
      .map((v) => v.id);
    setSelectedForBulk(newIds);
  };

  // Clear bulk selection
  const clearBulkSelection = () => {
    setSelectedForBulk([]);
  };

  // Add selected variants from bulk modal
  const handleBulkAdd = () => {
    const existingIds = variants.map((v) => v.id);
    const newVariants = filteredVariants
      .filter((v) => selectedForBulk.includes(v.id) && !existingIds.includes(v.id))
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        product_name: v.product_name,
      }));

    setVariants([...variants, ...newVariants]);
    ToastNotification("success", `Added ${newVariants.length} SKUs`);
    setBulkSelectModal(false);
    setSelectedForBulk([]);
    setSelectedCategory("");
    setFilteredVariants([]);
    setBulkSearchTerm("");
  };

  // Close bulk modal
  const closeBulkModal = () => {
    setBulkSelectModal(false);
    setSelectedForBulk([]);
    setSelectedCategory("");
    setFilteredVariants([]);
    setBulkSearchTerm("");
  };

  if (updateId && isLoading) return <Loader />;

  return (
    <>
      <Formik
        enableReinitialize
        initialValues={{
          name: updateId ? oldData?.data?.data?.name || "" : "",
          name_ar: updateId ? oldData?.data?.data?.name_ar || "" : "",
          description: updateId ? oldData?.data?.data?.description || "" : "",
          is_active: updateId ? Boolean(oldData?.data?.data?.is_active) : true,
        }}
        validationSchema={YupObject({ name: nameSchema })}
        onSubmit={(values) => {
          const data = {
            ...values,
            variant_ids: variants.map((v) => v.id),
          };
          mutate(data);
        }}
      >
        {() => (
          <Form className="theme-form theme-form-2 mega-form">
            <Row>
              <Col sm="12">
                <SimpleInputField
                  nameList={[
                    {
                      name: "name",
                      placeholder: t("Enter Promo Group Name"),
                      require: "true",
                      title: "Name",
                    },
                    {
                      name: "name_ar",
                      placeholder: "ادخل اسم المجموعة",
                      title: "Name (Arabic)",
                      dir: "rtl",
                    },
                    {
                      name: "description",
                      type: "textarea",
                      title: "Description",
                      placeholder: t("Enter Description"),
                    },
                  ]}
                />
                <CheckBoxField name="is_active" title="Active" />
              </Col>

              {/* SKUs Section */}
              <Col sm="12" className="mt-4">
                <Card>
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">SKUs in this Promo Group</h6>
                      <div className="d-flex gap-2 flex-wrap">
                        <Button
                          color="info"
                          size="sm"
                          outline
                          onClick={() => setBulkSelectModal(true)}
                        >
                          <RiFilterLine className="me-1" /> Bulk Select by Category
                        </Button>
                        {updateId && (
                          <>
                            <Button
                              color="secondary"
                              size="sm"
                              outline
                              onClick={handleDownloadTemplate}
                            >
                              <RiDownload2Line className="me-1" /> Template
                            </Button>
                            <Button
                              color="primary"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                            >
                              {uploading ? (
                                <Spinner size="sm" className="me-1" />
                              ) : (
                                <RiUpload2Line className="me-1" />
                              )}
                              Upload Excel
                            </Button>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              accept=".xlsx,.xls,.csv"
                              style={{ display: "none" }}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {!updateId && (
                      <Alert color="info" className="mb-3">
                        Save the promo group first to enable Excel upload for bulk SKU import.
                      </Alert>
                    )}

                    {uploadResult && (
                      <Alert
                        color={uploadResult.notFound.length > 0 ? "warning" : "success"}
                        className="mb-3"
                      >
                        <strong>{uploadResult.added} SKUs added.</strong>
                        {uploadResult.notFound.length > 0 && (
                          <div className="mt-2">
                            <small>SKUs not found: {uploadResult.notFound.join(", ")}</small>
                          </div>
                        )}
                      </Alert>
                    )}

                    {/* Manual SKU Selection */}
                    <div className="position-relative mb-3">
                      <div className="input-group">
                        <span className="input-group-text">
                          <RiSearchLine />
                        </span>
                        <Input
                          type="text"
                          placeholder="Search and add SKUs one by one..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowSkuDropdown(true);
                          }}
                          onFocus={() => setShowSkuDropdown(true)}
                          onBlur={() => setTimeout(() => setShowSkuDropdown(false), 200)}
                        />
                      </div>
                      {showSkuDropdown && searchTerm && filteredSkus.length > 0 && (
                        <div
                          className="position-absolute bg-white border rounded shadow-sm w-100"
                          style={{ zIndex: 1000, maxHeight: "200px", overflowY: "auto" }}
                        >
                          {filteredSkus.slice(0, 20).map((sku) => (
                            <div
                              key={sku.value}
                              className="px-3 py-2 cursor-pointer"
                              style={{ cursor: "pointer" }}
                              onClick={() => addSku(sku)}
                              onMouseEnter={(e) => (e.target.style.backgroundColor = "#f8f9fa")}
                              onMouseLeave={(e) => (e.target.style.backgroundColor = "white")}
                            >
                              {sku.label}
                            </div>
                          ))}
                          {filteredSkus.length > 20 && (
                            <div className="px-3 py-2 text-muted">
                              +{filteredSkus.length - 20} more results
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bulk Delete Actions */}
                    {variants.length > 0 && (
                      <div className="d-flex gap-2 mb-2 align-items-center">
                        <Button
                          color="light"
                          size="sm"
                          onClick={selectAllForDelete}
                          disabled={selectedForDelete.length === variants.length}
                        >
                          <RiCheckboxMultipleLine className="me-1" /> Select All
                        </Button>
                        {selectedForDelete.length > 0 && (
                          <>
                            <Button color="light" size="sm" onClick={clearDeleteSelection}>
                              Clear Selection
                            </Button>
                            <Button color="danger" size="sm" onClick={removeSelectedSkus}>
                              <RiDeleteBin6Line className="me-1" /> Remove Selected (
                              {selectedForDelete.length})
                            </Button>
                          </>
                        )}
                        <Button
                          color="link"
                          size="sm"
                          className="text-danger ms-auto"
                          onClick={() => setVariants([])}
                        >
                          Clear All
                        </Button>
                      </div>
                    )}

                    {/* Selected SKUs Table */}
                    <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
                      <Table bordered size="sm" className="mb-0">
                        <thead style={{ position: "sticky", top: 0, backgroundColor: "#f8f9fa" }}>
                          <tr>
                            <th style={{ width: "40px" }} className="text-center">
                              <Input
                                type="checkbox"
                                checked={
                                  variants.length > 0 &&
                                  selectedForDelete.length === variants.length
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    selectAllForDelete();
                                  } else {
                                    clearDeleteSelection();
                                  }
                                }}
                              />
                            </th>
                            <th>SKU</th>
                            <th>Product</th>
                            <th style={{ width: "80px" }} className="text-center">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {variants.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="text-center text-muted py-4">
                                No SKUs added yet. Use "Bulk Select by Category" or search above.
                              </td>
                            </tr>
                          ) : (
                            variants.map((variant) => (
                              <tr key={variant.id}>
                                <td className="text-center">
                                  <Input
                                    type="checkbox"
                                    checked={selectedForDelete.includes(variant.id)}
                                    onChange={() => toggleDeleteSelection(variant.id)}
                                  />
                                </td>
                                <td>{variant.sku}</td>
                                <td>{variant.product_name || "-"}</td>
                                <td className="text-center">
                                  <Button
                                    color="danger"
                                    size="sm"
                                    outline
                                    onClick={() => removeSku(variant.id)}
                                  >
                                    <RiDeleteBin6Line />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </Table>
                    </div>

                    <div className="text-muted mt-2">
                      <small>Total: {variants.length} SKUs</small>
                    </div>
                  </CardBody>
                </Card>
              </Col>

              <FormBtn loading={loading} buttonName={buttonName} />
            </Row>
          </Form>
        )}
      </Formik>

      {/* Bulk Select Modal */}
      <Modal isOpen={bulkSelectModal} toggle={closeBulkModal} size="lg">
        <ModalHeader toggle={closeBulkModal}>Bulk Select SKUs by Category</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Select Category</Label>
            <Input
              type="select"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="">-- Select a category --</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Input>
          </FormGroup>

          {selectedCategory && (
            <>
              <FormGroup>
                <Input
                  type="text"
                  placeholder="Search within category results..."
                  value={bulkSearchTerm}
                  onChange={(e) => setBulkSearchTerm(e.target.value)}
                />
              </FormGroup>

              <div className="d-flex gap-2 mb-3 align-items-center">
                <Button color="secondary" size="sm" onClick={selectAllFiltered}>
                  <RiCheckboxMultipleLine className="me-1" />
                  Select All ({filteredBulkVariants.filter(
                    (v) => !variants.find((ev) => ev.id === v.id)
                  ).length} new)
                </Button>
                <Button color="light" size="sm" onClick={clearBulkSelection}>
                  Clear Selection
                </Button>
                <Badge color="primary" className="ms-auto">
                  Selected: {selectedForBulk.length}
                </Badge>
              </div>

              {loadingVariants ? (
                <div className="text-center py-4">
                  <Spinner size="sm" /> Loading variants...
                </div>
              ) : filteredBulkVariants.length === 0 ? (
                <Alert color="info">No variants found in this category.</Alert>
              ) : (
                <div
                  className="table-responsive"
                  style={{ maxHeight: "300px", overflowY: "auto" }}
                >
                  <Table bordered size="sm" className="mb-0">
                    <thead style={{ position: "sticky", top: 0, backgroundColor: "#f8f9fa" }}>
                      <tr>
                        <th style={{ width: "40px" }} className="text-center">
                          <Input
                            type="checkbox"
                            checked={
                              filteredBulkVariants.length > 0 &&
                              filteredBulkVariants
                                .filter((v) => !variants.find((ev) => ev.id === v.id))
                                .every((v) => selectedForBulk.includes(v.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                selectAllFiltered();
                              } else {
                                clearBulkSelection();
                              }
                            }}
                          />
                        </th>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBulkVariants.map((variant) => {
                        const alreadyAdded = variants.find((v) => v.id === variant.id);
                        return (
                          <tr
                            key={variant.id}
                            style={{ opacity: alreadyAdded ? 0.5 : 1 }}
                          >
                            <td className="text-center">
                              <Input
                                type="checkbox"
                                checked={selectedForBulk.includes(variant.id)}
                                onChange={() => toggleBulkSelection(variant.id)}
                                disabled={!!alreadyAdded}
                              />
                            </td>
                            <td>{variant.sku}</td>
                            <td>{variant.product_name || "-"}</td>
                            <td>{variant.price} AED</td>
                            <td>
                              {alreadyAdded ? (
                                <Badge color="success">Already Added</Badge>
                              ) : selectedForBulk.includes(variant.id) ? (
                                <Badge color="primary">Selected</Badge>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={closeBulkModal}>
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleBulkAdd}
            disabled={selectedForBulk.length === 0}
          >
            Add {selectedForBulk.length} SKUs
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default PromoGroupForm;
