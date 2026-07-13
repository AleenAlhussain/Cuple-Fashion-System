import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RiFileCopyLine, RiCheckLine, RiExternalLinkLine } from "react-icons/ri";
import ShowModal from "../../../elements/alerts&Modals/Modal";
import Btn from "../../../elements/buttons/Btn";
import { ToastNotification } from "../../../utils/customFunctions/ToastNotification";
import { resolveAttachmentUrl } from "@/utils/customFunctions/resolveAttachmentUrl";

const formatFileSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const AttachmentDetailsModal = ({ item, onClose }) => {
  const { t } = useTranslation("common");
  const [copied, setCopied] = useState(false);
  const url = resolveAttachmentUrl(item) || "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      ToastNotification("success", t("LinkCopied") || "Link copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      ToastNotification("error", t("SomethingWentWrong") || "Failed to copy link");
    }
  };

  return (
    <ShowModal open={!!item} setModal={() => onClose()} close={true} title={t("MediaDetails") || "Media Details"}>
      {item && (
        <div className="attachment-details">
          <div className="text-center mb-3">
            <img
              src={url || "/assets/images/placeholder.png"}
              alt={item.name}
              style={{ maxHeight: "220px", maxWidth: "100%", objectFit: "contain" }}
            />
          </div>

          <div className="mb-2">
            <strong>{t("Name") || "Name"}:</strong> <span>{item.name}</span>
          </div>
          <div className="mb-2">
            <strong>{t("Type") || "Type"}:</strong> <span>{item.mime_type || "-"}</span>
          </div>
          <div className="mb-2">
            <strong>{t("Size") || "Size"}:</strong> <span>{formatFileSize(item.size)}</span>
          </div>
          <div className="mb-3">
            <strong>{t("UploadedAt") || "Uploaded At"}:</strong> <span>{item.created_at || "-"}</span>
          </div>

          <label className="mb-1 d-block">
            <strong>{t("Link") || "Link"}</strong>
          </label>
          <div className="input-group mb-2">
            <input type="text" className="form-control" readOnly value={url} onFocus={(e) => e.target.select()} />
            <Btn className="btn-outline" onClick={handleCopy}>
              {copied ? <RiCheckLine /> : <RiFileCopyLine />}
            </Btn>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-outline d-flex align-items-center">
              <RiExternalLinkLine />
            </a>
          </div>
        </div>
      )}
    </ShowModal>
  );
};

export default AttachmentDetailsModal;
