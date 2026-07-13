import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { RiDownload2Line } from "react-icons/ri";
import request from "../../utils/axiosUtils";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";

const TableExportOption = ({ exportUrl, isCheck }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading || !exportUrl || !Array.isArray(isCheck) || !isCheck.length) return;

    setLoading(true);
    try {
      const response = await request(
        {
          url: exportUrl,
          method: "post",
          data: { ids: isCheck },
          responseType: "blob",
          headers: { Accept: "text/csv,application/octet-stream,*/*" },
        },
        router
      );

      const disposition = response?.headers?.["content-disposition"] ?? "";
      const filenameMatch = disposition.match(/filename=(\"[^\"]+\"|[^;]+)/i);
      const filename = filenameMatch
        ? filenameMatch[1].replace(/^\"|\"$/g, "")
        : `selected_export_${new Date().toISOString().split("T")[0]}.csv`;

      const blob = new Blob([response.data], {
        type: response?.headers?.["content-type"] || "text/csv",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);

      ToastNotification("success", t("ExportDownloaded") || "Export downloaded successfully");
    } catch (error) {
      console.error("Selected export failed:", error);
      ToastNotification("error", t("SomethingWentWrong") || "Failed to export selected items");
    } finally {
      setLoading(false);
    }
  };

  return (
    <a className={`align-items-center btn btn-outline btn-sm d-flex ${loading ? "disabled" : ""}`} onClick={handleExport}>
      <RiDownload2Line /> {loading ? `${t("Export")}...` : t("Export")}
    </a>
  );
};

export default TableExportOption;
