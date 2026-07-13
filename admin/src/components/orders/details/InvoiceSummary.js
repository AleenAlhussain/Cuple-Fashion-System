import Btn from "@/elements/buttons/Btn";
import SettingContext from "@/helper/settingContext";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody } from "reactstrap";
import ReceiptModal from "./receiptModal";
import { RiDownloadLine, RiMailSendLine } from "react-icons/ri";
import { toast } from "react-toastify";
import request from "@/utils/axiosUtils";
import { useRouter } from "next/navigation";

const InvoiceSummary = ({ data }) => {
  const { t } = useTranslation("common");
  const { convertCurrency } = useContext(SettingContext);
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const router = useRouter();

  const downloadInvoice = async (orderId) => {
    if (!orderId) {
      toast.error(t("Order ID is missing"));
      return;
    }
    try {
      setLoading(true);
      const response = await request(
        {
          url: `/order/${orderId}/invoice/download`,
          method: "GET",
          responseType: "blob",
          headers: {
            Accept: "application/pdf",
          },
        },
        router
      );
      const blob = response?.data;
      if (!blob) {
        throw new Error("Failed to download invoice");
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${data?.order_number || orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t("Invoice downloaded successfully"));
    } catch (error) {
      toast.error(t("Failed to download invoice"));
      console.error("Invoice download error:", error);
    } finally {
      setLoading(false);
    }
  };

  const resendInvoiceEmail = async (orderId) => {
    try {
      setEmailLoading(true);
      const invoiceResponse = await request(
        {
          url: `/order/${orderId}/invoice/generate`,
          method: "POST",
        },
        router
      );

      if (invoiceResponse?.data?.data?.id) {
        const emailResponse = await request(
          {
            url: `/invoice/${invoiceResponse.data.data.id}/send-email`,
            method: "POST",
          },
          router
        );

        if (emailResponse?.data?.success) {
          toast.success(t("Invoice email sent successfully"));
        } else {
          toast.error(t("Failed to send invoice email"));
        }
      } else {
        toast.error(t("Failed to send invoice email"));
      }
    } catch (error) {
      toast.error(t("Failed to send invoice email"));
      console.error("Invoice email error:", error);
    } finally {
      setEmailLoading(false);
    }
  };

  const [openReceiptModal, setOpenReceiptModal] = useState(false);

  return (
    <Card>
      <CardBody>
        <div className="title-header">
          <div className="d-flex align-items-center">
            <h5>{t("Summary")}</h5>
          </div>
        </div>

        {/* Invoice Actions */}
        <div className="d-flex gap-2 mb-3 flex-wrap">
          <Btn
            className="btn-animation btn-sm d-flex align-items-center gap-1"
            onClick={() => downloadInvoice(data?.id)}
            loading={loading}
            disabled={loading}
          >
            <RiDownloadLine size={16} />
            {t("Download Invoice")}
          </Btn>
          <Btn
            className="btn-light-bg btn-sm d-flex align-items-center gap-1"
            onClick={() => resendInvoiceEmail(data?.id)}
            loading={emailLoading}
            disabled={emailLoading}
          >
            <RiMailSendLine size={16} />
            {t("Resend Email")}
          </Btn>
          <Btn
            className="btn-outline btn-sm"
            onClick={() => setOpenReceiptModal(true)}
          >
            {t("Receipt")}
          </Btn>
        </div>

        <div className="tracking-total tracking-wrapper">
          <ul>
            <li>
              {t("Subtotal")} :<span>{convertCurrency(data?.subtotal ?? data?.amount ?? 0)}</span>
            </li>
            {!data?.is_digital_only && (
              <li>
                {t("Shipping")} :<span>{convertCurrency(data?.shipping_amount ?? data?.shipping_total ?? 0)}</span>
              </li>
            )}
            <li>
              {t("Tax")} :<span>{convertCurrency(data?.tax_amount ?? data?.tax_total ?? 0)}</span>
            </li>
            {data?.points_amount ? (
              <li className="txt-primary fw-bold">
                {t("Points")} <span>{convertCurrency(data?.points_amount)}</span>
              </li>
            ) : null}
            {data?.wallet_balance ? (
              <li className="txt-primary fw-bold">
                {t("WalletBalance")} <span>{convertCurrency(data?.wallet_balance)}</span>
              </li>
            ) : null}
            {data?.gift_box_discount_amount ? (
              <li className="txt-primary fw-bold">
                {t("Gift Box Discount")} <span>-{convertCurrency(data?.gift_box_discount_amount)}</span>
              </li>
            ) : null}
            {(data?.discount_amount ?? data?.coupon_total_discount) ? (
              <li className="txt-primary fw-bold">
                {t("discount")} <span>-{convertCurrency(data?.discount_amount ?? data?.coupon_total_discount)}</span>
              </li>
            ) : null}
            <li className="fw-bold">
              {t("Total")} <span>{convertCurrency(data?.total ?? 0)}</span>
            </li>
          </ul>
        </div>

        {/* Invoice Info */}
        {data?.invoice && (
          <div className="mt-3 pt-3 border-top">
            <small className="text-muted d-block mb-1">
              <strong>{t("Invoice")}:</strong> {data?.order_number ?? data?.invoice_number ?? data?.invoice?.invoice_number}
            </small>
            {data.invoice.sent_at && (
              <small className="text-success d-block">
                {t("Email sent")}: {new Date(data.invoice.sent_at).toLocaleString()}
              </small>
            )}
          </div>
        )}
      </CardBody>
      {openReceiptModal && <ReceiptModal open={openReceiptModal} data={data} setOpen={setOpenReceiptModal} />}
    </Card>
  );
};

export default InvoiceSummary;
