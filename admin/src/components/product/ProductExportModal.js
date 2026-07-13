"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RiDownload2Line, RiFileExcel2Line, RiFilterLine } from "react-icons/ri";
import { Modal, ModalHeader, ModalBody, ModalFooter, Row, Col } from "reactstrap";
import request from "@/utils/axiosUtils";
import Btn from "@/elements/buttons/Btn";
import { Category, tag } from "@/utils/axiosUtils/API";
import { useRouter } from "next/navigation";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const ProductExportModal = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [status, setStatus] = useState("");
  const [categoryIds, setCategoryIds] = useState([]);
  const [tagIds, setTagIds] = useState([]);
  const [market, setMarket] = useState("");
  const [search, setSearch] = useState("");
  const [exportType, setExportType] = useState("");

  const exportTypeOptions = [
    { id: "", name: "Select export type" },
    { id: "quantity", name: "Export Quantity (SKU + Stores Stock)" },
    { id: "prices", name: "Export Prices (Variant SKU + Regular + Sale)" },
    { id: "full_items", name: "Export Full Items (New Sell Template)" },
  ];

  const fullItemsColumns = [
    "Article",
    "SKU",
    "Color",
    "Size",
    "Inventory",
    "Price",
    "Category",
    "ar_category",
    "Image",
    "Title",
    "ar_title",
    "Short_description",
    "short_description_ar",
    "Description",
    "ar_description",
    "Weight (kg)",
    "Tags",
    "Published",
    "Brand",
    "Store",
  ];

  // Fetch categories
  const { data: categoryData } = useCustomQuery(
    [Category],
    () => request({ url: Category, params: { status: 1 } }, router),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data?.map((elem) => ({ id: elem.id, name: elem.name })),
    }
  );

  // Fetch tags
  const { data: tagData } = useCustomQuery(
    [tag],
    () => request({ url: tag, params: { status: 1 } }, router),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data?.map((elem) => ({ id: elem.id, name: elem.name })),
    }
  );

  const stockStatusOptions = [
    { id: "", name: "All" },
    { id: "in_stock", name: "In Stock" },
    { id: "out_of_stock", name: "Out of Stock" },
  ];

  const statusOptions = [
    { id: "", name: "All" },
    { id: "1", name: "Active" },
    { id: "0", name: "Inactive" },
  ];

  const marketOptions = [
    { id: "", name: "All Markets" },
    { id: "uae", name: "UAE" },
    { id: "ksa", name: "KSA" },
  ];

  const getAdminApiBase = () => {
    const raw = process.env.API_PROD_URL || "https://api.cuple.shop/api/admin/";
    const normalized = String(raw).replace(/\/+$/, "");
    return /\/admin$/i.test(normalized) ? normalized : `${normalized}/admin`;
  };

  const buildExcelExportUrl = (queryString = "") => {
    const baseUrl = getAdminApiBase();
    return `${baseUrl}/product/excel/export${queryString ? `?${queryString}` : ""}`;
  };

  const handleCategoryChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setCategoryIds(selected);
  };

  const handleTagChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setTagIds(selected);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();

      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      if (stockStatus) params.append("stock_status", stockStatus);
      if (status) params.append("status", status);
      if (categoryIds.length > 0) params.append("category_ids", categoryIds.join(","));
      if (tagIds.length > 0) params.append("tag_ids", tagIds.join(","));
      if (market) params.append("market", market);
      if (search) params.append("search", search);
      if (exportType) params.append("export_type", exportType);

      if (!exportType) {
        alert("Please select export type before exporting.");
        setLoading(false);
        return;
      }

      const queryString = params.toString();
      const url = buildExcelExportUrl(queryString);

      // Use XMLHttpRequest for more reliable binary file download
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "blob";

      // Add auth header if available
      const token = localStorage.getItem("uat");
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.onload = function () {
        if (xhr.status === 200) {
          const blob = xhr.response;
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = `products_${exportType}_export_${new Date().toISOString().split("T")[0]}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);
          closeModal();
        } else {
          console.error("Export failed with status:", xhr.status);
          alert("Failed to export products. Please try again.");
        }
        setLoading(false);
      };

      xhr.onerror = function () {
        console.error("Export error");
        alert("Failed to export products. Please try again.");
        setLoading(false);
      };

      xhr.send();
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export products. Please try again.");
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setStockStatus("");
    setStatus("");
    setCategoryIds([]);
    setTagIds([]);
    setMarket("");
    setSearch("");
    setExportType("");
  };

  const closeModal = () => {
    setModal(false);
    resetFilters();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (stockStatus) count++;
    if (status) count++;
    if (categoryIds.length > 0) count++;
    if (tagIds.length > 0) count++;
    if (market) count++;
    if (search) count++;
    return count;
  };

  return (
    <>
      <a
        className="align-items-center btn btn-primary d-flex gap-1"
        onClick={() => setModal(true)}
        style={{ cursor: "pointer", color: "#fff" }}
      >
        <RiDownload2Line />
        Export Excel
      </a>

      <Modal isOpen={modal} toggle={closeModal} size="lg" centered className="export-modal">
        <ModalHeader toggle={closeModal}>
          <RiFileExcel2Line className="me-2" />
          Export Products to Excel
        </ModalHeader>

        <ModalBody>
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold mb-0">
                <RiFilterLine className="me-2" />
                Export Filters
              </h6>
              {getActiveFilterCount() > 0 && (
                <span className="badge bg-primary">{getActiveFilterCount()} filter(s) active</span>
              )}
            </div>
            <p className="text-muted small mb-3">
              Select filters to export specific products. Leave all filters empty to export all products.
            </p>

            <Row className="g-3">
              {/* Search */}
              <Col md="12">
                <label className="form-label">Export Type *</label>
                <select
                  className="form-select"
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                >
                  {exportTypeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </Col>

              {/* Search */}
              <Col md="12">
                <label className="form-label">Search (Name/SKU)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by product name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Col>

              {/* Date Range */}
              <Col md="6">
                <label className="form-label">Date From</label>
                <input
                  type="date"
                  className="form-control"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </Col>
              <Col md="6">
                <label className="form-label">Date To</label>
                <input
                  type="date"
                  className="form-control"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Col>

              {/* Stock Status */}
              <Col md="6">
                <label className="form-label">Stock Status</label>
                <select
                  className="form-select"
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                >
                  {stockStatusOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </Col>

              {/* Product Status */}
              <Col md="6">
                <label className="form-label">Product Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </Col>

              {/* Market */}
              <Col md="6">
                <label className="form-label">Market</label>
                <select
                  className="form-select"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                >
                  {marketOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </Col>

              {/* Categories */}
              <Col md="6">
                <label className="form-label">Categories</label>
                <select
                  className="form-select"
                  multiple
                  value={categoryIds}
                  onChange={handleCategoryChange}
                  style={{ height: "100px" }}
                >
                  {categoryData?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <small className="text-muted">Hold Ctrl/Cmd to select multiple</small>
              </Col>

              {/* Tags */}
              <Col md="6">
                <label className="form-label">Tags</label>
                <select
                  className="form-select"
                  multiple
                  value={tagIds}
                  onChange={handleTagChange}
                  style={{ height: "100px" }}
                >
                  {tagData?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <small className="text-muted">Hold Ctrl/Cmd to select multiple</small>
              </Col>
            </Row>
          </div>

          {/* Export Info */}
          <div className="bg-light p-3 rounded">
            <h6 className="fw-bold mb-2">Export Columns:</h6>
            {exportType === "quantity" && (
              <ul className="mb-0 small text-muted">
                <li>sku</li>
                <li>Store columns (UAE, 06 Mall, Warehouse, DFC, ...)</li>
                <li>Each value = SKU stock in that store</li>
              </ul>
            )}
            {exportType === "prices" && (
              <ul className="mb-0 small text-muted">
                <li>Variant SKU</li>
                <li>Regular Price</li>
                <li>Sale Price</li>
              </ul>
            )}
            {exportType === "full_items" && (
              <ul className="mb-0 small text-muted">
                {fullItemsColumns.map((column) => (
                  <li key={column}>{column}</li>
                ))}
              </ul>
            )}
            {!exportType && <p className="mb-0 small text-muted">Please select export type to preview columns.</p>}
          </div>
        </ModalBody>

        <ModalFooter>
          <Btn className="btn-outline-secondary" onClick={resetFilters}>
            Reset Filters
          </Btn>
          <Btn className="btn-outline-secondary" onClick={closeModal}>
            Cancel
          </Btn>
          <Btn className="btn-primary" onClick={handleExport} disabled={loading || !exportType}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Exporting...
              </>
            ) : (
              <>
                <RiDownload2Line className="me-1" />
                Export to Excel
              </>
            )}
          </Btn>
          <Btn
            className="btn-outline-primary"
            disabled={!exportType}
            onClick={() => {
              const params = new URLSearchParams();
              if (dateFrom) params.append("date_from", dateFrom);
              if (dateTo) params.append("date_to", dateTo);
              if (stockStatus) params.append("stock_status", stockStatus);
              if (status) params.append("status", status);
              if (categoryIds.length > 0) params.append("category_ids", categoryIds.join(","));
              if (tagIds.length > 0) params.append("tag_ids", tagIds.join(","));
              if (market) params.append("market", market);
              if (search) params.append("search", search);
              if (exportType) params.append("export_type", exportType);
              const queryString = params.toString();
              const url = buildExcelExportUrl(queryString);
              window.open(url, "_blank");
              closeModal();
            }}
          >
            Direct Download
          </Btn>
        </ModalFooter>
      </Modal>

      <style jsx global>{`
        .export-modal .form-select[multiple] {
          overflow-y: auto;
        }
      `}</style>
    </>
  );
};

export default ProductExportModal;
