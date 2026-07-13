import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { RiDeleteBinLine } from "react-icons/ri";
import ShowModal from "../../elements/alerts&Modals/Modal";
import Btn from "../../elements/buttons/Btn";
import request from "../../utils/axiosUtils";
import { ToastNotification } from "../../utils/customFunctions/ToastNotification";

const TableDeleteOption = ({ url, isCheck, setIsCheck }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!isCheck?.length) return;
    setLoading(true);
    try {
      await request(
        {
          url: `${url}/bulk-action`,
          method: "post",
          data: { action: "delete", ids: isCheck },
        },
        router
      );
      ToastNotification("success", t("DeletedSuccessfully") || "Deleted successfully");
      setIsCheck && setIsCheck([]);
      url && queryClient.invalidateQueries({ queryKey: [url] });
    } catch (err) {
      console.error("Delete failed", err);
      ToastNotification("error", err?.response?.data?.message || "Failed to delete");
    } finally {
      setLoading(false);
      setModal(false);
    }
  };

  return (
    <>
      <a className="align-items-center btn btn-outline btn-sm d-flex" onClick={() => setModal(true)}>
        <RiDeleteBinLine /> {t("Delete")}
      </a>
      <ShowModal
        open={modal}
        close={false}
        setModal={setModal}
        buttons={
          <>
            <Btn
              title="No"
              onClick={() => setModal(false)}
              className="btn-md btn-outline fw-bold"
            />
            <Btn
              title="Yes"
              className="btn-theme btn-md fw-bold"
              loading={loading}
              onClick={handleDelete}
            />
          </>
        }
      >
        <div className="remove-box">
          <div className="remove-icon">
            <RiDeleteBinLine className="icon-box" />
          </div>
          <h2 className="mt-2">{t("DeleteItem")}?</h2>
          <p>
            {isCheck?.length > 1
              ? `${isCheck.length} ${t("ItemsWillBeDeleted") || "items will be deleted"}.`
              : t("ThisItemWillBeDeletedPermanently") + " " + t("YouCan'tUndoThisAction!!")}
          </p>
        </div>
      </ShowModal>
    </>
  );
};

export default TableDeleteOption;
