import { useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Table } from "reactstrap";
import SettingContext from "../../helper/settingContext";
import { useTranslation } from "react-i18next";
import Btn from "../../elements/buttons/Btn";
import request from "@/utils/axiosUtils";
import { ExchangeReturnAwbAPI, RefundReturnAwbAPI, ReturnSchedulePickupAPI } from "@/utils/axiosUtils/API";
import SuccessHandle from "@/utils/customFunctions/SuccessHandle";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";

const ViewDetailBody = ({ fullObj, refetch }) => {
  const { t } = useTranslation("common");
  const { convertCurrency } = useContext(SettingContext);
  const router = useRouter();
  const [creatingReturn, setCreatingReturn] = useState(false);
  const [schedulingPickup, setSchedulingPickup] = useState(false);

  const isReturnType = ["refund", "exchange"].includes(fullObj?.type);
  const returnStatus = useMemo(() => {
    if (fullObj?.return_status) return fullObj.return_status;
    if (fullObj?.return_awb_number) return "created";
    return "not_created";
  }, [fullObj?.return_status, fullObj?.return_awb_number]);

  const canCreateReturn =
    isReturnType &&
    ["approved", "processing"].includes(fullObj?.status) &&
    !fullObj?.return_awb_number &&
    !creatingReturn;

  const canRetryPickup =
    isReturnType &&
    ["approved", "processing"].includes(fullObj?.status) &&
    !!fullObj?.return_awb_number &&
    !fullObj?.return_pickup_reference &&
    !schedulingPickup;

  const handleCreateReturn = async () => {
    if (!fullObj?.id || creatingReturn) return;
    setCreatingReturn(true);
    try {
      const createUrl = fullObj?.type === "exchange" ? ExchangeReturnAwbAPI(fullObj.id) : RefundReturnAwbAPI(fullObj.id);
      const res = await request(
        {
          url: createUrl,
          method: "post",
        },
        router
      );
      SuccessHandle(res, false, false, res?.data?.message || t("ReturnShipmentCreated") || "Return shipment created successfully.");
      refetch && refetch();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || t("SomethingWentWrong");
      ToastNotification("error", message);
    } finally {
      setCreatingReturn(false);
    }
  };

  const handleRetryPickup = async () => {
    if (!fullObj?.id || schedulingPickup) return;
    setSchedulingPickup(true);
    try {
      const res = await request(
        {
          url: ReturnSchedulePickupAPI(fullObj.id),
          method: "post",
        },
        router
      );
      SuccessHandle(res, false, false, res?.data?.message || t("PickupScheduled") || "Pickup scheduling updated.");
      refetch && refetch();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || t("SomethingWentWrong");
      ToastNotification("error", message);
    } finally {
      setSchedulingPickup(false);
    }
  };

  return (
    <div className="border">
      <Table className="all-package theme-table no-footer">
        <tbody>
          {fullObj?.message && (
            <tr>
              <td className="text-start fw-semibold">{t("Message")}</td>
              <td className="text-start">{fullObj?.message}</td>
            </tr>
          )}
          {fullObj?.reason && (
            <tr>
              <td className="text-start fw-semibold">{t("Reason")}</td>
              <td className="text-start">{fullObj?.reason}</td>
            </tr>
          )}
          {fullObj?.amount && (
            <tr>
              <td className="text-start fw-semibold">{t("Amount")}</td>
              <td className="text-start">{convertCurrency(fullObj?.amount)}</td>
            </tr>
          )}

          {fullObj?.user?.payment_account && (
            <>
              {" "}
              <tr>
                <td className="text-start fw-semibold">{t("BankName")} </td>
                <td className="text-start"> {fullObj?.user?.payment_account?.bank_name}</td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("BankAccountName")} </td>
                <td className="text-start">{fullObj?.user?.payment_account?.bank_holder_name}</td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("BankAccountNumber")} </td>
                <td className="text-start"> {fullObj?.user?.payment_account?.bank_account_no}</td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("BankIFSCCode")} </td>
                <td className="text-start">{fullObj?.user?.payment_account?.ifsc}</td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("BankSWIFTCode")} </td>
                <td className="text-start">{fullObj?.user?.payment_account?.swift}</td>
              </tr>
            </>
          )}
          {fullObj?.payment_type && (
            <tr>
              <td className="text-start fw-semibold">{t("PaymentMethod")} </td>
              <td className="text-start">{fullObj?.payment_type?.toUpperCase()}</td>
            </tr>
          )}
          {fullObj?.status && (
            <tr>
              <td className="text-start fw-semibold">{t("Status")}</td>
              <td className="text-start">
                <div className={`status-${fullObj?.status}`}>
                  <span>{fullObj?.status}</span>
                </div>
              </td>
            </tr>
          )}
          {Array.isArray(fullObj?.attachments) && fullObj.attachments.length > 0 && (
            <tr>
              <td className="text-start fw-semibold">{t("Attachments") || "Attachments"}</td>
              <td className="text-start">
                <div className="d-flex flex-wrap gap-2">
                  {fullObj.attachments.map((file) => (
                    <a
                      key={file.id || file.file_url}
                      href={file.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="d-inline-block"
                    >
                      {file?.mime_type?.startsWith?.("image/") ? (
                        <img src={file.file_url} alt="attachment" width={56} height={56} />
                      ) : (
                        <span className="badge bg-light text-dark">Open</span>
                      )}
                    </a>
                  ))}
                </div>
              </td>
            </tr>
          )}

          {isReturnType && (
            <>
              <tr>
                <td className="text-start fw-semibold" colSpan={2}>
                  {t("AramexReturn") || "Aramex Return"}
                </td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("Status")}</td>
                <td className="text-start text-capitalize">{returnStatus.replace(/_/g, " ")}</td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("ReturnAwbNumber") || "Return AWB Number"}</td>
                <td className="text-start">{fullObj?.return_awb_number || "-"}</td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("PickupReference") || "Pickup Reference"}</td>
                <td className="text-start">{fullObj?.return_pickup_reference || "-"}</td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("PickupDate") || "Pickup Date"}</td>
                <td className="text-start">{fullObj?.return_pickup_date || "-"}</td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("International") || "International"}</td>
                <td className="text-start">
                  {fullObj?.return_is_international === undefined
                    ? "-"
                    : fullObj?.return_is_international
                    ? t("Yes") || "Yes"
                    : t("No") || "No"}
                </td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("LabelURL") || "Label URL"}</td>
                <td className="text-start">{fullObj?.return_label_url || "-"}</td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("Error") || "Error"}</td>
                <td className="text-start text-danger">{fullObj?.return_error_message || "-"}</td>
              </tr>
              <tr>
                <td className="text-start fw-semibold">{t("Actions") || "Actions"}</td>
                <td className="text-start d-flex flex-wrap gap-2">
                  {["approved", "processing"].includes(fullObj?.status) && returnStatus !== "created" && (
                    <Btn
                      title={t("CreateReturnAwb") || "Create Return AWB"}
                      onClick={handleCreateReturn}
                      loading={Number(creatingReturn)}
                      disabled={!canCreateReturn}
                      className="btn-theme btn-sm fw-bold"
                    />
                  )}
                  {canRetryPickup && (
                    <Btn
                      title={t("RetryPickup") || "Retry Pickup"}
                      onClick={handleRetryPickup}
                      loading={Number(schedulingPickup)}
                      disabled={!canRetryPickup}
                      className="btn-outline-secondary btn-sm fw-bold"
                    />
                  )}
                  {fullObj?.return_label_url && (
                    <a
                      href={fullObj?.return_label_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-secondary btn-sm fw-bold"
                    >
                      {t("ViewLabel") || "View Label"}
                    </a>
                  )}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default ViewDetailBody;
