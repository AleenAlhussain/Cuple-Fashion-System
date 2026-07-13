import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiQuestionLine } from "react-icons/ri";
import { FormGroup, Input, Label } from "reactstrap";
import ShowModal from "../../elements/alerts&Modals/Modal";
import Btn from "../../elements/buttons/Btn";
import request from "@/utils/axiosUtils";
import { useRouter } from "next/navigation";

const Status = ({ url, data, disabled, apiKey, refetch }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [status, setStatus] = useState(false);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const newStatus = Boolean(Number(apiKey ? data[apiKey] : data.status ?? data.is_active));
    setStatus(newStatus);
  }, [data, disabled, apiKey]);

  const handleClick = async (value) => {
    if (url && data?.id) {
      setLoading(true);
      const apiUrl = `${url}/${data.id}/status`;

      try {
        const response = await request({ url: apiUrl, method: "put" }, router);

        // Use the response value if available, otherwise toggle
        if (response?.data?.data?.is_active !== undefined) {
          setStatus(Boolean(response.data.data.is_active));
        } else if (response?.data?.is_active !== undefined) {
          setStatus(Boolean(response.data.is_active));
        } else {
          setStatus(value);
        }

        // Refetch the table data
        if (refetch) {
          refetch();
        }
      } catch (error) {
        console.error("[Status] Failed to update status:", error);
        // Revert to original status on error
        setStatus(!value);
      } finally {
        setLoading(false);
      }
    } else {
      setStatus(value);
    }
    setModal(false);
  };

  return (
    <>
      <FormGroup switch className="ps-0 form-switch form-check">
        <Label className="switch" onClick={() => !disabled && !loading && setModal(true)}>
          <Input type="switch" disabled={disabled || loading} checked={status} />
          <span className={`switch-state ${disabled ? "disabled" : ""}`}></span>
        </Label>
      </FormGroup>
      <ShowModal
        open={modal}
        close={false}
        setModal={setModal}
        buttons={
          <>
            <Btn title="No" onClick={() => setModal(false)} className="btn-md btn-outline fw-bold" />
            <Btn title="Yes" onClick={() => handleClick(!status)} className="btn-theme btn-md fw-bold" disabled={loading} />
          </>
        }
      >
        <div className="remove-box">
          <div className="remove-icon">
            <RiQuestionLine className="icon-box wo-bg" />
          </div>
          <h5 className="modal-title">{t("Confirmation")}</h5>
          <p>{t("Areyousureyouwanttoproceed?")} </p>
        </div>
      </ShowModal>
    </>
  );
};

export default Status;
