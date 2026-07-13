import { Form, Formik } from "formik";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiDownload2Line, RiUpload2Line, RiUploadCloud2Line } from "react-icons/ri";
import { DropdownItem, TabContent, TabPane } from "reactstrap";
import ShowModal from "../../elements/alerts&Modals/Modal";
import Btn from "../../elements/buttons/Btn";
import { YupObject, requiredSchema } from "../../utils/validation/ValidationSchemas";
import FileUploadBrowser from "../inputFields/FileUploadBrowser";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";

const ImportExport = ({ importExport, refetch, moduleName, exportButton, Dropdown, selectedIds = [], exportParams = {} }) => {
  const { t } = useTranslation("common");
  const [modal, setModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const hasSelection = useMemo(
    () => Array.isArray(selectedIds) && selectedIds.length > 0,
    [selectedIds]
  );

  const exportLabel = hasSelection
    ? `${t("Export")} ${t("Selected") || "Selected"} (${selectedIds.length})`
    : `${t("Export")} ${t("All") || "All"}`;

  const buildExportUrl = (targetUrl, params = {}) => {
    if (!targetUrl) return "";
    const baseUrl = process.env.API_PROD_URL || "https://api.cuple.shop/api/admin/";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const rawUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `${normalizedBase}${targetUrl.replace(/^\/+/, "")}`;

    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        searchParams.append(key, value.join(","));
        return;
      }
      searchParams.append(key, value);
    });

    const queryString = searchParams.toString();
    return queryString ? `${rawUrl}?${queryString}` : rawUrl;
  };

  const exportUser = () => {
    if (!importExport?.exportUrl && !importExport?.exportSelectedUrl) return;
    if (exportLoading) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("uat") : null;
    const isSelectedExport = hasSelection && Boolean(importExport?.exportSelectedUrl);
    const exportUrl = isSelectedExport
      ? buildExportUrl(importExport.exportSelectedUrl)
      : buildExportUrl(importExport.exportUrl, exportParams);

    if (!exportUrl) return;

    setExportLoading(true);
    ToastNotification("info", "Preparing export...");

    const xhr = new XMLHttpRequest();
    xhr.open(isSelectedExport ? "POST" : "GET", exportUrl, true);
    xhr.responseType = "blob";

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    if (isSelectedExport) {
      xhr.setRequestHeader("Content-Type", "application/json");
    }

    xhr.onload = function () {
      if (xhr.status === 200) {
        const blob = xhr.response;
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;

        const dateStamp = new Date().toISOString().split("T")[0];
        const fallbackName = `${moduleName?.toLowerCase?.() || "export"}_${dateStamp}.csv`;
        const baseName = importExport?.sampleFile || fallbackName;
        a.download = isSelectedExport ? `selected_${baseName}` : baseName;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        ToastNotification("success", "Export downloaded successfully");
      } else {
        ToastNotification("error", "Failed to export. Please try again.");
      }
      setExportLoading(false);
    };

    xhr.onerror = function () {
      ToastNotification("error", "Failed to export. Please try again.");
      setExportLoading(false);
    };

    if (isSelectedExport) {
      xhr.send(JSON.stringify({ ids: selectedIds }));
    } else {
      xhr.send();
    }
  };

  return (
    <>
      {Dropdown ? (
        <>
          <button onClick={() => setModal(true)} className="dropdown-item">
            {t("Import")}
          </button>
          <DropdownItem onClick={exportUser} disabled={exportLoading}>
            {exportLabel}
          </DropdownItem>
        </>
      ) : (
        <>
          <a className="align-items-center btn btn-light-bg" onClick={() => setModal(true)}>
            <RiUpload2Line />
            {t("Import")}
          </a>
          {exportButton == true && (
            <a className="align-items-center btn btn-light-bg" onClick={() => exportUser()}>
              <RiDownload2Line />
              {exportLoading ? `${t("Export")}...` : exportLabel}
            </a>
          )}
        </>
      )}

      <ShowModal open={modal} setModal={setModal} modalAttr={{ className: "import-export-modal media-modal inset-media-modal modal-dialog modal-dialog-centered modal-xl" }} close={true} title={"InsertMedia"} noClass={true}>
        <TabContent>
          <Formik
            initialValues={{ [moduleName?.toLowerCase()]: "" }}
            validationSchema={YupObject({ [moduleName?.toLowerCase()]: requiredSchema })}
            onSubmit={(values, { resetForm }) => {
              let formData = new FormData();
              Object.values(values[moduleName.toLowerCase()]).forEach((el, i) => {
                formData.append(`${moduleName?.toLowerCase()}`, el);
              });
              setModal(false);
              u;
            }}
          >
            {({ values, setFieldValue, errors }) => (
              <Form className="theme-form theme-form-2 mega-form">
                <TabPane className={"fade active show"} id="select">
                  <div className="content-section drop-files-sec mb-2">
                    <div>
                      <RiUploadCloud2Line />
                      <div>
                        <div className="dflex-wgap justify-content-center ms-auto save-back-button">
                          <h2>
                            {t("Dropfilesherepaste")}
                            <span>{t("or")}</span>
                            <FileUploadBrowser errors={errors} id={moduleName.toLowerCase()} name={moduleName.toLowerCase()} type="file" multiple={true} values={values} setFieldValue={setFieldValue} accept=".csv" />
                          </h2>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p>
                    {t("downloadExampleCSV")}
                    <a className="ms-2" href={`/assets/csv/${importExport?.sampleFile}`} download={importExport?.sampleFile}>
                      {t(importExport?.sampleFile?.includes("csv") ? "Here" : "ReadTheInstructions")}
                    </a>
                    {importExport?.instructionsAndSampleFile && (
                      <>
                        {t("and_please_ensure_you")}
                        <a href={`/assets/csv/${importExport?.instructions}`} download={importExport?.instructions}>
                          {" "}
                          {t("read_the_instructions")}{" "}
                        </a>
                      </>
                    )}
                  </p>
                </TabPane>
                <div className="modal-footer">
                  {values[moduleName.toLowerCase()] && values[moduleName.toLowerCase()]?.length > 0 && (
                    <a href="#javascript" onClick={() => setFieldValue(`${moduleName}`, "")}>
                      {t("Clear")}
                    </a>
                  )}
                  <Btn type="submit" className="btn-theme ms-auto" title="Insert Media" />
                </div>
              </Form>
            )}
          </Formik>
        </TabContent>
      </ShowModal>
    </>
  );
};

export default ImportExport;
