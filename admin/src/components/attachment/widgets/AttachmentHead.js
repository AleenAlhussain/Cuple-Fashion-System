import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input, Label } from "reactstrap";
import { RiAddLine, RiDeleteBin2Line, RiDeleteBinLine, RiDownload2Line } from "react-icons/ri";
import ShowModal from "../../../elements/alerts&Modals/Modal";
import Btn from "../../../elements/buttons/Btn";
import request from "../../../utils/axiosUtils";
import { attachmentExport, attachmentDelete } from "../../../utils/axiosUtils/API";
import SuccessHandle from "../../../utils/customFunctions/SuccessHandle";
import usePermissionCheck from "../../../utils/hooks/usePermissionCheck";
import { ToastNotification } from "../../../utils/customFunctions/ToastNotification";
import AttachmentModal from "./attachmentModal";
import useCustomMutation from "@/utils/hooks/useCustomMutation";

const AttachmentHead = ({ isAttachment, state, dispatch, refetch, exportFilters, attachmentsData }) => {
  const { t } = useTranslation("common");
  const [create, destroy] = usePermissionCheck(["create", "destroy"]);
  const [modal, setModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const allIds = (attachmentsData || []).map((item) => item.id).filter(Boolean);
  const allSelected = allIds.length > 0 && allIds.every((id) => state.deleteImage?.includes(id));

  const handleSelectAll = () => {
    dispatch({ type: "DeleteSelectedImage", payload: allSelected ? [] : allIds });
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await request(
        {
          url: attachmentExport,
          params: exportFilters,
          responseType: "blob",
          headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*" },
        },
        router
      );

      if (!response?.data || response?.status === 204) {
        ToastNotification("error", t("NoMediaFound") || "No media found to export");
        return;
      }

      const disposition = response?.headers?.["content-disposition"] ?? "";
      const filenameMatch = disposition.match(/filename=("[^"]+"|[^;]+)/i);
      const filename = filenameMatch
        ? filenameMatch[1].replace(/^"|"$/g, "")
        : `media_library_${new Date().toISOString().split("T")[0]}.xlsx`;

      const blob = new Blob([response.data], {
        type: response?.headers?.["content-type"] || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
      ToastNotification("error", t("SomethingWentWrong") || "Failed to export media");
    } finally {
      setExporting(false);
    }
  };

  const { mutate } = useCustomMutation((data) => request({ url: attachmentDelete, data: { ids: data }, method: "post" }, router), {
    onSuccess: (resData) => {
      SuccessHandle(resData, router, "/attachment", "Deleted Successfully", pathname);
      resData.status == 200 && dispatch({ type: "DeleteSelectedImage", payload: [] });
      refetch();
    },
  });
  return (
    <>
      <div className="title-header option-title media-title">
        <div className="left-content">
          <h5>{t("MediaLibrary")}</h5>
          {allIds.length > 0 && (
            <div className="form-check select-all-media d-flex align-items-center gap-1 ms-3">
              <Input type="checkbox" id="selectAllMedia" checked={allSelected} onChange={handleSelectAll} />
              <Label htmlFor="selectAllMedia" className="mb-0" style={{ cursor: "pointer" }}>
                {t("SelectAll") || "Select All"}
              </Label>
            </div>
          )}
          {state.deleteImage.length > 0 && (
            <div className="selected-options">
              <ul>
                <li>
                  {t("selected")}({state.deleteImage.length})
                </li>
                {destroy && (
                  <li onClick={() => setDeleteModal(true)}>
                    <a href="#javascript">
                      <RiDeleteBin2Line />
                    </a>
                  </li>
                )}
                <ShowModal
                  open={deleteModal}
                  close={false}
                  buttons={
                    <>
                      <Btn title="No" onClick={() => setDeleteModal(false)} className="btn-md btn-outline fw-bold" />
                      <Btn
                        title="Yes"
                        className="btn-theme btn-md fw-bold"
                        onClick={() => {
                          mutate(state.deleteImage);
                          setDeleteModal(false);
                        }}
                      />
                    </>
                  }
                >
                  <div className="remove-box">
                    <RiDeleteBinLine className="icon-box" />
                    <h2>{t("DeleteItem")}?</h2>
                    <p>{t("ThisItemWillBeDeletedPermanently") + " " + t("YouCan'tUndoThisAction!!")} </p>
                  </div>
                </ShowModal>
              </ul>
            </div>
          )}
        </div>
        <div className="right-options">
          <ul>
            <li>
              <Btn className="btn btn-outline" onClick={handleExport} loading={Number(exporting)}>
                <RiDownload2Line />
                {t("Export") || "Export"}
              </Btn>
            </li>
            {create && (
              <li>
                <Btn className="btn btn-solid btn-theme" onClick={() => setModal(true)}>
                  <RiAddLine />
                  {t("AddMedia")}
                </Btn>
              </li>
            )}
          </ul>
        </div>
      </div>
      <AttachmentModal modal={modal} setModal={setModal} isAttachment={isAttachment} noAPICall onUploadComplete={refetch} />
    </>
  );
};

export default AttachmentHead;
