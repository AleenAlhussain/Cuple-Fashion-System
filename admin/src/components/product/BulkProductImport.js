"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RiArrowGoBackLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiDownload2Line,
  RiErrorWarningLine,
  RiFileExcel2Line,
  RiHistoryLine,
  RiRefreshLine,
  RiTimeLine,
  RiUpload2Line,
} from "react-icons/ri";
import { Alert, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import Btn from "@/elements/buttons/Btn";
import request from "@/utils/axiosUtils";
import {
  ProductActionImportHistoryAPI,
  ProductActionImportHistoryDetailAPI,
  ProductActionImportProcessAPI,
  ProductActionImportRollbackAPI,
  ProductActionImportStartAPI,
} from "@/utils/axiosUtils/API";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import ProductExportModal from "./ProductExportModal";

const BulkProductImport = ({ refetch, defaultAction = "" }) => {
  const { t } = useTranslation("common");
  const [modal, setModal] = useState(false);
  const [file, setFile] = useState(null);
  const [selectedAction, setSelectedAction] = useState(defaultAction);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeImport, setActiveImport] = useState(null);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyActionId, setHistoryActionId] = useState(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const actionOptions = [
    { id: "update_quantity", label: "Update Quantity" },
    { id: "update_price", label: "Update Price - SKU" },
    { id: "update_parent_price", label: "Update Price Parent" },
    { id: "update_title", label: "Update Title" },
    { id: "new_sell", label: "New Sell" },
    { id: "add_update_category", label: "Add/Update Category" },
    { id: "add_update_tag", label: "Add/Update Tag" },
    { id: "remove_product", label: "Remove Product" },
  ];

  const selectedActionLabel =
    actionOptions.find((action) => action.id === selectedAction)?.label || "";

  const acceptedExtensions =
    selectedAction === "update_quantity" ? [".xlsx"] : [".xlsx", ".xls", ".csv"];

  const acceptAttribute =
    selectedAction === "update_quantity" ? ".xlsx" : ".xlsx,.xls,.csv";

  const getActionLabel = (actionId) =>
    actionOptions.find((action) => action.id === actionId)?.label || actionId || "-";

  const clearPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const buildHistoryResult = (importRecord) => {
    if (!importRecord) return null;

    return {
      success: importRecord.status === "completed",
      summary: importRecord.summary || null,
      message:
        importRecord.message ||
        (importRecord.status === "completed"
          ? "Import completed successfully."
          : importRecord.last_error || "Import failed."),
      report_url: importRecord.report_url || null,
      error_file: importRecord.error_file || null,
      errors_count: importRecord.errors_count || 0,
      warnings_count: importRecord.warnings_count || 0,
    };
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await request({
        url: `${ProductActionImportHistoryAPI}?per_page=10`,
        method: "get",
      });
      setHistoryEntries(response?.data?.data || []);
    } catch (error) {
      console.error("Failed to load import history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchHistoryDetail = async (importId) => {
    const response = await request({
      url: ProductActionImportHistoryDetailAPI(importId),
      method: "get",
      timeout: 10000,
    });

    return response?.data?.data?.import || null;
  };

  const startPolling = (importId) => {
    clearPolling();

    const poll = async () => {
      try {
        const importRecord = await fetchHistoryDetail(importId);
        if (!importRecord) return;

        setActiveImport(importRecord);

        if (["completed", "failed"].includes(importRecord.status)) {
          clearPolling();
          if (!result || result?.success === false) {
            setResult((currentResult) => currentResult || buildHistoryResult(importRecord));
          }
          fetchHistory();
        }
      } catch (error) {
        console.error("Failed to poll import history:", error);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 1000);
  };

  useEffect(() => {
    setSelectedAction(defaultAction || "");
  }, [defaultAction]);

  useEffect(() => {
    setFile(null);
    setResult(null);
    setLoading(false);
    setUploadProgress(0);
    setActiveImport(null);
    clearPolling();
  }, [selectedAction]);

  useEffect(() => {
    if (modal) {
      fetchHistory();
    } else {
      clearPolling();
    }

    return () => clearPolling();
  }, [modal]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    const fileName = selectedFile.name.toLowerCase();
    const isValid = acceptedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      alert(
        selectedAction === "update_quantity"
          ? "Please select a valid Excel file (.xlsx)"
          : "Please select a valid Excel file (.xlsx, .xls) or CSV file (.csv)"
      );
      return;
    }

    setFile(selectedFile);
    setResult(null);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const downloadTemplate = async () => {
    if (!selectedAction) return;

    setDownloadingTemplate(true);
    const backendUrl = (process.env.API_PROD_URL || "").replace(/\/+$/, "");
    const templateEndpoint = `${backendUrl}/import/template?action=${encodeURIComponent(
      selectedAction
    )}&_=${Date.now()}`;

    try {
      const response = await fetch(templateEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("uat")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const contentDisposition = response.headers.get("content-disposition") || "";
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      const normalMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
      const rawFileName =
        utf8Match?.[1] || normalMatch?.[1] || "product_import_template.xlsx";

      const fileName = (() => {
        try {
          return decodeURIComponent(rawFileName);
        } catch {
          return rawFileName;
        }
      })();

      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading template:", error);
      alert("Failed to download template. Please try again.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedAction || loading) return;

    clearPolling();
    setLoading(true);
    setResult(null);
    setActiveImport(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("action", selectedAction);

    try {
      const startResponse = await request({
        url: ProductActionImportStartAPI,
        method: "post",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
        onUploadProgress: (progressEvent) => {
          const total = progressEvent?.total || 0;
          if (!total) return;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          setUploadProgress(Math.max(0, Math.min(100, percent)));
        },
      });

      const importRecord = startResponse?.data?.data?.import;
      if (!importRecord?.id) {
        throw new Error("Failed to create import history.");
      }

      setActiveImport(importRecord);
      setUploadProgress(100);
      startPolling(importRecord.id);

      const processResponse = await request({
        url: ProductActionImportProcessAPI(importRecord.id),
        method: "post",
        timeout: 1800000,
      });

      setResult(processResponse?.data?.data || processResponse?.data);

      if (refetch) {
        refetch();
      }

      const latestImport = await fetchHistoryDetail(importRecord.id);
      if (latestImport) {
        setActiveImport(latestImport);
      }

      fetchHistory();
    } catch (error) {
      console.error("Import error:", error);
      setResult({
        success: false,
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Import failed. Please check your file format.",
      });
      fetchHistory();
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (importId) => {
    if (!window.confirm("Undo this import and restore the previous product data?")) {
      return;
    }

    setHistoryActionId(importId);
    try {
      await request({
        url: ProductActionImportRollbackAPI(importId),
        method: "post",
      });

      ToastNotification("success", "Import rollback completed successfully.");
      fetchHistory();

      if (refetch) {
        refetch();
      }
    } catch (error) {
      ToastNotification(
        "error",
        error?.response?.data?.message || "Failed to rollback this import."
      );
    } finally {
      setHistoryActionId(null);
    }
  };

  const handleDeleteHistory = async (importId) => {
    if (!window.confirm("Remove this import history record without changing the products?")) {
      return;
    }

    setHistoryActionId(importId);
    try {
      await request({
        url: ProductActionImportHistoryDetailAPI(importId),
        method: "delete",
      });

      ToastNotification("success", "Import history removed successfully.");
      setHistoryEntries((current) => current.filter((entry) => entry.id !== importId));

      if (activeImport?.id === importId) {
        setActiveImport(null);
        setResult(null);
      }
    } catch (error) {
      ToastNotification(
        "error",
        error?.response?.data?.message || "Failed to remove this import history."
      );
    } finally {
      setHistoryActionId(null);
    }
  };

  const resetModal = () => {
    setFile(null);
    setResult(null);
    setLoading(false);
    setUploadProgress(0);
    setActiveImport(null);
    clearPolling();
  };

  const closeModal = () => {
    setModal(false);
    resetModal();
  };

  const formatNumber = (num) => num?.toLocaleString?.() || "0";

  const formatSummaryLine = (summary) => {
    if (!summary) return "No summary";

    const summaryMap = [
      ["created", "created"],
      ["products_created", "created"],
      ["updated", "updated"],
      ["products_updated", "updated"],
      ["deleted", "deleted"],
      ["variations_created", "variants created"],
      ["variations_updated", "variants updated"],
      ["rows_failed", "failed"],
      ["rows_failed_validation", "validation failed"],
      ["skipped", "skipped"],
      ["skipped_rows", "skipped"],
    ];

    const parts = summaryMap
      .filter(([key]) => Number(summary[key]) > 0)
      .map(([key, label]) => `${summary[key]} ${label}`);

    return parts.length ? parts.join(" | ") : "No changes";
  };

  const summaryFields = [
    {
      key: "products_created",
      label: "Products Created",
      bgClass: "bg-success-subtle",
      textClass: "text-success",
    },
    {
      key: "products_updated",
      label: "Products Updated",
      bgClass: "bg-info-subtle",
      textClass: "text-info",
    },
    {
      key: "variations_created",
      label: "Variations Created",
      bgClass: "bg-primary-subtle",
      textClass: "text-primary",
    },
    {
      key: "variations_updated",
      label: "Variations Updated",
      bgClass: "bg-warning-subtle",
      textClass: "text-warning",
    },
    {
      key: "updated",
      label: "Products Updated",
      bgClass: "bg-success-subtle",
      textClass: "text-success",
    },
    {
      key: "deleted",
      label: "Products Deleted",
      bgClass: "bg-danger-subtle",
      textClass: "text-danger",
    },
    {
      key: "skipped_rows",
      label: "Rows Skipped",
      bgClass: "bg-secondary-subtle",
      textClass: "text-secondary",
    },
    {
      key: "skipped",
      label: "Rows Skipped",
      bgClass: "bg-secondary-subtle",
      textClass: "text-secondary",
    },
    {
      key: "not_found",
      label: "SKU Not Found",
      bgClass: "bg-warning-subtle",
      textClass: "text-warning",
    },
    {
      key: "processed",
      label: "Rows Processed",
      bgClass: "bg-info-subtle",
      textClass: "text-info",
    },
    {
      key: "rows_processed",
      label: "Rows Processed",
      bgClass: "bg-info-subtle",
      textClass: "text-info",
    },
  ];

  const statusClassName = (status) => {
    switch (status) {
      case "completed":
        return "bg-success-subtle text-success";
      case "processing":
        return "bg-warning-subtle text-warning";
      case "failed":
        return "bg-danger-subtle text-danger";
      case "pending":
      default:
        return "bg-secondary-subtle text-secondary";
    }
  };

  const progressBlock = useMemo(() => {
    if (!loading) return null;

    const isUploading = uploadProgress < 100 && !activeImport;
    const progressValue = isUploading
      ? uploadProgress
      : activeImport?.progress_percentage || 0;
    const progressLabel = isUploading ? "Uploading file..." : "Processing import...";
    const processedRows = activeImport?.processed_rows || 0;
    const totalRows = activeImport?.total_rows || 0;

    return {
      progressLabel,
      progressValue,
      processedRows,
      totalRows,
    };
  }, [loading, uploadProgress, activeImport]);

  return (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <ProductExportModal />
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <select
            className="form-select form-select-sm"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            style={{ minWidth: 220 }}
          >
            <option value="">Select Action</option>
            {actionOptions.map((action) => (
              <option key={action.id} value={action.id}>
                {action.label}
              </option>
            ))}
          </select>

          {selectedAction ? (
            <>
              <button
                type="button"
                className="align-items-center btn btn-success d-flex gap-1"
                onClick={downloadTemplate}
                disabled={downloadingTemplate}
              >
                <RiDownload2Line />
                {downloadingTemplate ? "Downloading..." : "Download Template"}
              </button>
              <button
                type="button"
                className="align-items-center btn btn-theme d-flex gap-1"
                onClick={() => setModal(true)}
              >
                <RiUpload2Line />
                {t("BulkImport") || "Bulk Import"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <Modal
        isOpen={modal}
        toggle={closeModal}
        size="xl"
        centered
        className="bulk-import-modal"
      >
        <ModalHeader toggle={closeModal}>
          <RiFileExcel2Line className="me-2" />
          {selectedActionLabel ? `${selectedActionLabel} Import` : "Bulk Product Import"}
        </ModalHeader>

        <ModalBody>
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="mb-4">
                <h6 className="fw-bold mb-3">
                  {selectedActionLabel
                    ? `Upload File for ${selectedActionLabel}`
                    : "Upload Your Excel File"}
                </h6>

                <div
                  className={`drop-zone p-4 border border-2 rounded text-center ${
                    dragActive ? "border-primary bg-light" : ""
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: "pointer", borderStyle: "dashed" }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept={acceptAttribute}
                    style={{ display: "none" }}
                  />

                  {file ? (
                    <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
                      <RiFileExcel2Line size={24} className="text-success" />
                      <span className="fw-medium">{file.name}</span>
                      <span className="text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger ms-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setResult(null);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <RiUpload2Line size={48} className="text-muted mb-2" />
                      <p className="mb-1">Drag and drop your Excel file here</p>
                      <p className="text-muted small">or click to browse</p>
                      <p className="text-muted small">
                        {selectedAction === "update_quantity"
                          ? "Supported: .xlsx (max 10MB)"
                          : "Supported: .xlsx, .xls, .csv (max 10MB)"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {selectedAction ? (
                <div className="bg-light p-3 rounded mb-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-muted small">Don't have the template?</span>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="btn btn-link p-0 text-decoration-none small"
                    >
                      <RiDownload2Line className="me-1" />
                      Download Excel Template
                    </button>
                  </div>
                </div>
              ) : null}

              {progressBlock && (
                <div className="border rounded p-3 mb-3 bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-semibold">{progressBlock.progressLabel}</div>
                    <div className="fw-bold">{progressBlock.progressValue}%</div>
                  </div>
                  <div className="progress" style={{ height: 10 }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated"
                      role="progressbar"
                      style={{ width: `${progressBlock.progressValue}%` }}
                    />
                  </div>
                  <div className="text-muted small mt-2">
                    {progressBlock.totalRows > 0
                      ? `${progressBlock.processedRows} / ${progressBlock.totalRows} rows processed`
                      : "Preparing import..."}
                  </div>
                </div>
              )}

              {result && !loading && (
                <div className="mt-4">
                  <hr />
                  <h6 className="fw-bold mb-3">Import Results</h6>

                  {result.success !== false ? (
                    <>
                      {(() => {
                        const summary = result?.summary || result?.data?.summary || {};
                        const errorsCount =
                          result?.errors?.length || result?.data?.errors?.length || 0;
                        const warningsCount =
                          result?.warnings_count ||
                          result?.data?.warnings_count ||
                          result?.warnings?.length ||
                          result?.data?.warnings?.length ||
                          result?.warnings_sample?.length ||
                          result?.data?.warnings_sample?.length ||
                          0;
                        const hasIssues = Boolean(
                          (summary.rows_failed_validation || 0) > 0 ||
                            (summary.skipped_rows || 0) > 0 ||
                            (summary.skipped_variant_not_found || 0) > 0 ||
                            (summary.skipped_not_found || 0) > 0 ||
                            errorsCount > 0 ||
                            warningsCount > 0 ||
                            (summary.errors_count || 0) > 0
                        );
                        return (
                          <Alert
                            color={hasIssues ? "warning" : "success"}
                            className="d-flex align-items-center"
                          >
                            {hasIssues ? (
                              <RiErrorWarningLine size={20} className="me-2" />
                            ) : (
                              <RiCheckLine size={20} className="me-2" />
                            )}
                            {result.message ||
                              (hasIssues
                                ? "Import completed with issues."
                                : "Import completed successfully!")}
                          </Alert>
                        );
                      })()}

                      {result.summary && (
                        <div className="row g-3 mt-2">
                          {summaryFields
                            .filter((field) =>
                              Object.prototype.hasOwnProperty.call(result.summary, field.key)
                            )
                            .map((field) => (
                              <div className="col-md-4" key={field.key}>
                                <div className={`card ${field.bgClass} border-0`}>
                                  <div className="card-body text-center py-3">
                                    <h3 className={`mb-0 ${field.textClass}`}>
                                      {formatNumber(result.summary[field.key])}
                                    </h3>
                                    <small className="text-muted">{field.label}</small>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {result.errors_count > 0 && result.error_file && (
                        <Alert color="warning" className="mt-3">
                          <div className="d-flex align-items-center justify-content-between">
                            <div>
                              <RiErrorWarningLine size={20} className="me-2" />
                              <strong>{result.errors_count} row(s)</strong> failed to import.
                            </div>
                            <Btn
                              className="btn-warning btn-sm"
                              onClick={() => window.open(result.error_file, "_blank")}
                            >
                              <RiDownload2Line className="me-1" />
                              Download Error Report
                            </Btn>
                          </div>
                        </Alert>
                      )}

                      {result.report_url && (
                        <Alert
                          color="info"
                          className="mt-3 d-flex align-items-center justify-content-between"
                        >
                          <div>
                            <RiDownload2Line size={20} className="me-2" />
                            Download import report.
                          </div>
                          <Btn
                            className="btn-info btn-sm"
                            onClick={() => window.open(result.report_url, "_blank")}
                          >
                            Download Report
                          </Btn>
                        </Alert>
                      )}
                    </>
                  ) : (
                    <Alert color="danger" className="d-flex align-items-center">
                      <RiCloseLine size={20} className="me-2" />
                      {result.message || "Import failed. Please check your file format."}
                    </Alert>
                  )}
                </div>
              )}
            </div>

            <div className="col-lg-5">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <RiHistoryLine />
                  Import History
                </h6>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={fetchHistory}
                  disabled={historyLoading}
                >
                  <RiRefreshLine className={historyLoading ? "spin" : ""} />
                </button>
              </div>

              <div className="border rounded history-panel">
                {historyLoading ? (
                  <div className="p-4 text-center text-muted">Loading import history...</div>
                ) : historyEntries.length ? (
                  historyEntries.map((entry) => {
                    const isActionLoading = historyActionId === entry.id;
                    return (
                      <div key={entry.id} className="history-row border-bottom p-3">
                        <div className="d-flex justify-content-between align-items-start gap-3">
                          <div className="min-w-0">
                            <div className="fw-semibold text-truncate">
                              {getActionLabel(entry.action)}
                            </div>
                            <div className="text-muted small text-truncate">
                              {entry.original_file_name}
                            </div>
                            <div className="text-muted small d-flex align-items-center gap-1 mt-1">
                              <RiTimeLine />
                              {entry.created_at
                                ? new Date(entry.created_at).toLocaleString()
                                : "-"}
                            </div>
                          </div>
                          <span
                            className={`badge rounded-pill px-3 py-2 ${statusClassName(
                              entry.status
                            )}`}
                          >
                            {entry.status}
                          </span>
                        </div>

                        <div className="progress mt-3" style={{ height: 8 }}>
                          <div
                            className={`progress-bar ${
                              entry.status === "failed"
                                ? "bg-danger"
                                : entry.status === "completed"
                                ? "bg-success"
                                : "bg-warning progress-bar-striped progress-bar-animated"
                            }`}
                            style={{ width: `${entry.progress_percentage || 0}%` }}
                          />
                        </div>

                        <div className="d-flex justify-content-between text-muted small mt-2">
                          <span>
                            {entry.processed_rows || 0} / {entry.total_rows || 0} rows
                          </span>
                          <span>{entry.progress_percentage || 0}%</span>
                        </div>

                        <div className="small mt-2">{formatSummaryLine(entry.summary)}</div>
                        {entry.message ? (
                          <div className="small text-muted mt-1">{entry.message}</div>
                        ) : null}
                        {entry.rollback_status && entry.rollback_status !== "none" ? (
                          <div className="small mt-2 text-muted">
                            Rollback: {entry.rollback_status}
                          </div>
                        ) : null}

                        <div className="d-flex flex-wrap gap-2 mt-3">
                          {entry.report_url ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => window.open(entry.report_url, "_blank")}
                            >
                              <RiDownload2Line className="me-1" />
                              Report
                            </button>
                          ) : null}

                          {entry.error_file ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => window.open(entry.error_file, "_blank")}
                            >
                              <RiErrorWarningLine className="me-1" />
                              Errors
                            </button>
                          ) : null}

                          {entry.can_rollback ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleRollback(entry.id)}
                              disabled={isActionLoading}
                            >
                              <RiArrowGoBackLine className="me-1" />
                              {isActionLoading ? "Working..." : "Undo Import"}
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteHistory(entry.id)}
                            disabled={isActionLoading || entry.status === "processing"}
                          >
                            <RiDeleteBinLine className="me-1" />
                            {isActionLoading ? "Working..." : "Delete Record"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-muted">
                    No product import history yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Btn className="btn-outline-secondary text-white" onClick={closeModal}>
            Close
          </Btn>
          <Btn
            className="btn-theme"
            onClick={handleImport}
            disabled={!file || loading || !selectedAction}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Importing...
              </>
            ) : (
              <>
                <RiUpload2Line className="me-1" />
                Start Import
              </>
            )}
          </Btn>
        </ModalFooter>
      </Modal>

      <style jsx global>{`
        .bulk-import-modal .drop-zone:hover {
          background-color: #f8f9fa;
        }

        .bulk-import-modal .drop-zone.border-primary {
          background-color: #e7f1ff !important;
        }

        .bulk-import-modal .history-panel {
          max-height: 70vh;
          overflow-y: auto;
          background: #fff;
        }

        .bulk-import-modal .history-row:last-child {
          border-bottom: 0 !important;
        }

        .bulk-import-modal .min-w-0 {
          min-width: 0;
        }

        .bulk-import-modal .spin {
          animation: bulk-import-spin 1s linear infinite;
        }

        @keyframes bulk-import-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

export default BulkProductImport;
