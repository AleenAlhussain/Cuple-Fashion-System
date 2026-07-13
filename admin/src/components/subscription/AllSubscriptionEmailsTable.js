import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { RiDownload2Line } from "react-icons/ri";
import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import request from "@/utils/axiosUtils";
import { SubscriptionEmailExportAPI } from "@/utils/axiosUtils/API";

const AllSubscriptionEmailsTable = ({ data, search, ...props }) => {
  const router = useRouter();
  const { t } = useTranslation("common");

  const downloadFile = async (urlPath, fallbackFilename) => {
    try {
      const response = await request(
        {
          url: urlPath,
          method: "get",
          responseType: "blob",
          headers: { Accept: "*/*" },
        },
        router
      );

      const disposition = response?.headers?.["content-disposition"] ?? "";
      const filenameMatch = disposition.match(/filename=("[^"]+"|[^;]+)/i);
      const filename = filenameMatch
        ? filenameMatch[1].replace(/^"|"$/g, "")
        : fallbackFilename;

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "text/csv",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename || fallbackFilename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Subscription emails export failed:", error);
    }
  };

  const exportEmails = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const query = params.toString();
    const url = query ? `${SubscriptionEmailExportAPI}?${query}` : SubscriptionEmailExportAPI;
    downloadFile(url, `subscription_emails_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const headerObj = {
    checkBox: false,
    isOption: false,
    isSerialNo: false,
    disableRowClick: true,
    column: [
      { title: "ID", apiKey: "id", sorting: true, sortBy: "desc" },
      { title: "Email", apiKey: "email", sorting: true, sortBy: "desc" },
      { title: "Source", apiKey: "source", sorting: true, sortBy: "desc" },
      { title: "IPAddress", apiKey: "ip_address", sorting: false },
      { title: "CreateAt", apiKey: "created_at", sorting: true, sortBy: "desc", type: "date" },
    ],
    data: data || [],
  };

  return (
    <>
      <div className="mb-3 d-flex justify-content-end">
        <button type="button" className="btn btn-sm export-btn" onClick={exportEmails}>
          <RiDownload2Line className="me-1" />
          {t("ExportSubscriptionEmails") || "Export Subscription Emails"}
        </button>
      </div>
      <ShowTable {...props} headerData={headerObj} />
    </>
  );
};

export default TableWrapper(AllSubscriptionEmailsTable);

