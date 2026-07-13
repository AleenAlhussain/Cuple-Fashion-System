"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import request from "@/utils/axiosUtils";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import Loader from "@/components/commonComponent/Loader";
import NoDataFound from "@/components/commonComponent/NoDataFound";
import ShowModal from "@/elements/alerts&Modals/Modal";
import {
  AramexStatusMappingsAPI,
  AramexStatusMappingReimportAPI,
  AramexStatusMappingUpdateAPI,
} from "@/utils/axiosUtils/API";

const AramexStatusMappingPage = () => {
  const router = useRouter();
  const { data = [], isLoading, refetch } = useCustomQuery(
    ["aramexStatusMappings"],
    () => request({ url: AramexStatusMappingsAPI }, router),
    {
      select: (response) => response?.data?.data ?? [],
      refetchOnWindowFocus: false,
    }
  );

  const [alert, setAlert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [formState, setFormState] = useState({
    stage: "",
    severity: "info",
    customer_title_en: "",
    customer_message_en: "",
    customer_title_ar: "",
    customer_message_ar: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [reimporting, setReimporting] = useState(false);

  const openModal = (mapping) => {
    setSelectedMapping(mapping);
    setFormState({
      stage: mapping.stage ?? "",
      severity: mapping.severity ?? "info",
      customer_title_en: mapping.customer_title_en ?? "",
      customer_message_en: mapping.customer_message_en ?? "",
      customer_title_ar: mapping.customer_title_ar ?? "",
      customer_message_ar: mapping.customer_message_ar ?? "",
      is_active: mapping.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedMapping(null);
  };

  const handleFieldChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedMapping) return;
    setSaving(true);
    setAlert(null);

    try {
      await request(
        {
          url: AramexStatusMappingUpdateAPI(selectedMapping.id),
          method: "put",
          data: formState,
        },
        router
      );
      setAlert({ type: "success", message: "Mapping updated successfully." });
      refetch();
      handleModalClose();
    } catch (error) {
      setAlert({
        type: "danger",
        message: error?.response?.data?.message || "Unable to update mapping.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReimport = async (overwrite = false) => {
    setAlert(null);
    setReimporting(true);

    try {
      const response = await request(
        {
          url: AramexStatusMappingReimportAPI,
          method: "post",
          data: { overwrite },
        },
        router
      );
      setAlert({
        type: "success",
        message: response?.data?.message || "Re-import completed successfully.",
      });
      refetch();
    } catch (error) {
      setAlert({
        type: "danger",
        message: error?.response?.data?.message || "Re-import failed.",
      });
    } finally {
      setReimporting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="fs-4 mb-1">Aramex Status Mapping</h1>
          <p className="text-muted mb-0">Manage the customer-friendly messages for each Aramex status code.</p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => handleReimport(false)}
            disabled={reimporting}
          >
            {reimporting ? "Re-importing…" : "Re-import from Excel"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleReimport(true)}
            disabled={reimporting}
          >
            {reimporting ? "Re-importing…" : "Re-import & overwrite"}
          </button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} mb-4`} role="alert">
          {alert.message}
        </div>
      )}

      {isLoading ? (
        <Loader />
      ) : data.length === 0 ? (
        <NoDataFound noImage />
      ) : (
        <div className="table-responsive">
          <table className="table table-hover table-borderless">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Stage</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Customer Title</th>
                <th>Customer Message</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((mapping) => (
                <tr key={mapping.id}>
                  <td>{mapping.aramex_code}</td>
                  <td>
                    {mapping.aramex_name}
                    {mapping.is_manual_override && (
                      <span className="badge bg-secondary ms-2">Manual</span>
                    )}
                  </td>
                  <td>{mapping.stage}</td>
                  <td>{mapping.severity}</td>
                  <td>{mapping.is_active ? "Active" : "Inactive"}</td>
                  <td>
                    <div>
                      <strong>EN:</strong> {mapping.customer_title_en || "-"}
                    </div>
                    <div>
                      <strong>AR:</strong> {mapping.customer_title_ar || "-"}
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>EN:</strong> {mapping.customer_message_en || "-"}
                    </div>
                    <div>
                      <strong>AR:</strong> {mapping.customer_message_ar || "-"}
                    </div>
                  </td>
                  <td className="text-end">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openModal(mapping)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ShowModal
        open={modalOpen}
        setModal={handleModalClose}
        title="Edit Aramex mapping"
        buttons={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={handleModalClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">Stage</label>
          <input
            type="text"
            className="form-control"
            value={formState.stage}
            onChange={(e) => handleFieldChange("stage", e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Severity</label>
          <select
            className="form-select"
            value={formState.severity}
            onChange={(e) => handleFieldChange("severity", e.target.value)}
          >
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="mappingActive"
            checked={formState.is_active}
            onChange={(e) => handleFieldChange("is_active", e.target.checked)}
          />
          <label className="form-check-label" htmlFor="mappingActive">
            Active
          </label>
        </div>
        <div className="mb-3">
          <label className="form-label">Customer Title (EN)</label>
          <input
            type="text"
            className="form-control"
            value={formState.customer_title_en}
            onChange={(e) => handleFieldChange("customer_title_en", e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Customer Message (EN)</label>
          <textarea
            className="form-control"
            rows="3"
            value={formState.customer_message_en}
            onChange={(e) => handleFieldChange("customer_message_en", e.target.value)}
          />
        </div>
        <div className="mb-3 text-end">
          <label className="form-label">Customer Title (AR)</label>
          <input
            type="text"
            className="form-control text-end"
            value={formState.customer_title_ar}
            onChange={(e) => handleFieldChange("customer_title_ar", e.target.value)}
          />
        </div>
        <div className="mb-3 text-end">
          <label className="form-label">Customer Message (AR)</label>
          <textarea
            className="form-control text-end"
            rows="3"
            value={formState.customer_message_ar}
            onChange={(e) => handleFieldChange("customer_message_ar", e.target.value)}
          />
        </div>
      </ShowModal>
    </div>
  );
};

export default AramexStatusMappingPage;
