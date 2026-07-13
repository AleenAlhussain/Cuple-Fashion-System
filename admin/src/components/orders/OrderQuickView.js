import { useContext, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { RiEyeLine, RiFileCopyLine } from "react-icons/ri";
import SettingContext from "../../helper/settingContext";
import { dateFormat } from "../../utils/customFunctions/DateFormat";
import ShowModal from "../../elements/alerts&Modals/Modal";
import Btn from "../../elements/buttons/Btn";

const normalizeStatusKey = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const formatStatusLabel = (value) => {
  if (!value) return "-";
  return value
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const buildAddressLines = (address) => {
  if (!address) return ["-"];
  const parts = [
    address.street,
    address.city,
    address.state?.name,
    address.country?.name,
    address.pincode,
  ]
    .filter(Boolean)
    .map((part) => part.toString().trim())
    .filter(Boolean);

  return parts.length ? parts : ["-"];
};

const getTrackingNumber = (order) => {
  const trackingNumberRaw =
    order?.tracking_number ??
    order?.trackingNumber ??
    order?.awb ??
    order?.shipment_awb ??
    order?.shipping_awb ??
    null;

  return (trackingNumberRaw ?? "").toString().trim() || "-";
};

const getItemSkus = (order) => {
  const items = order?.products || order?.items || [];
  if (!Array.isArray(items) || !items.length) return [];
  const skus = items
    .map(
      (item) =>
        item?.sku ||
        item?.variant_sku ||
        item?.pivot?.variation?.sku ||
        item?.variation?.sku ||
        item?.variant?.sku
    )
    .filter(Boolean)
    .map((sku) => sku.toString().trim())
    .filter(Boolean);

  return Array.from(new Set(skus));
};

const OrderQuickView = ({ order, modalTitle }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { convertCurrency } = useContext(SettingContext);
  const [modal, setModal] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const copyTimerRef = useRef(null);

  const orderNumber = order?.order_number ?? order?.order_number_value ?? order?.id ?? "-";
  const customerName = order?.consumer?.name || order?.customer?.name || order?.shipping_name || "-";
  const customerEmail = order?.consumer?.email || order?.email || "-";
  const customerPhone =
    order?.consumer?.phone ||
    order?.shipping_address?.phone ||
    order?.billing_address?.phone ||
    "-";
  const shippingStatus =
    order?.order_status?.name ||
    order?.order_status?.slug ||
    order?._status ||
    order?.shipping_status_label ||
    "-";
  const paymentStatus =
    order?.payment_status_value || order?.payment_status || order?.status || "-";
  const paymentMethod = order?.payment_method || "-";
  const itemsCount = Array.isArray(order?.products)
    ? order.products.length
    : Array.isArray(order?.items)
      ? order.items.length
      : null;

  const shippingAddressLines = useMemo(
    () => buildAddressLines(order?.shipping_address || order?.shippingAddress),
    [order]
  );
  const billingAddressLines = useMemo(
    () => buildAddressLines(order?.billing_address || order?.billingAddress),
    [order]
  );

  const trackingNumber = useMemo(() => {
    if (order?.tracking_number_value) return order.tracking_number_value;
    return getTrackingNumber(order);
  }, [order]);
  const itemSkus = useMemo(() => getItemSkus(order), [order]);

  const paymentStatusKey = normalizeStatusKey(paymentStatus);
  const shippingStatusKey = normalizeStatusKey(shippingStatus);

  const handleCopyTracking = () => {
    if (!trackingNumber || trackingNumber === "-") return;
    navigator?.clipboard?.writeText(trackingNumber).catch(() => {});
    setCopiedTracking(true);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopiedTracking(false);
    }, 1400);
  };

  const handleOpenDetails = () => {
    const orderId = order?.id ?? orderNumber;
    if (!orderId || orderId === "-") return;
    setModal(false);
    router.push(`/order/details/${orderId}`);
  };

  return (
    <>
      <a
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setModal(true);
        }}
        title={t("View") || "View"}
        aria-label={t("View") || "View"}
      >
        <RiEyeLine />
      </a>
      <ShowModal
        open={modal}
        title={modalTitle || "Orders / Order Quick View"}
        close={true}
        setModal={setModal}
        modalAttr={{ className: "order-quickview-modal modal-lg" }}
        buttons={
          <>
            <Btn
              title="Close"
              className="btn-outline-secondary btn-md fw-bold text-white"
              onClick={() => setModal(false)}
            />
            <Btn
              title="Manage"
              className="btn-theme btn-md fw-bold"
              onClick={handleOpenDetails}
            />
          </>
        }
      >
        <div className="order-quickview-body">
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("OrderNumber") || "Order Number"}</div>
            <div className="order-quickview-value">#{orderNumber}</div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("OrderDate") || "Order Date"}</div>
            <div className="order-quickview-value">
              {order?.created_at ? dateFormat(order.created_at) : "-"}
            </div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("CustomerName") || "Customer Name"}</div>
            <div className="order-quickview-value">{customerName}</div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("Email") || "Email"}</div>
            <div className="order-quickview-value">{customerEmail}</div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("Phone") || "Phone"}</div>
            <div className="order-quickview-value">{customerPhone}</div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("TotalAmount") || "Total Amount"}</div>
            <div className="order-quickview-value">
              {order?.total !== undefined && order?.total !== null
                ? convertCurrency(order.total)
                : "-"}
            </div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("PaymentStatus") || "Payment Status"}</div>
            <div className="order-quickview-value">
              {paymentStatus && paymentStatus !== "-" ? (
                <div className={`status-${paymentStatusKey || "pending"}`}>
                  <span>{formatStatusLabel(paymentStatus)}</span>
                </div>
              ) : (
                "-"
              )}
            </div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("PaymentMethod") || "Payment Method"}</div>
            <div className="order-quickview-value">{formatStatusLabel(paymentMethod)}</div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("ShippingStatus") || "Shipping Status"}</div>
            <div className="order-quickview-value">
              {shippingStatus && shippingStatus !== "-" ? (
                <div className={`status-${shippingStatusKey || "pending"}`}>
                  <span>{formatStatusLabel(shippingStatus)}</span>
                </div>
              ) : (
                "-"
              )}
            </div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("TrackingNumber") || "Tracking Number"}</div>
            <div className="order-quickview-value">
              <div className="order-quickview-tracking">
                <span className="order-quickview-tracking-text">{trackingNumber}</span>
                {trackingNumber !== "-" && (
                  <>
                    <button
                      type="button"
                      className="btn btn-light btn-sm orders-copy-btn"
                      onClick={handleCopyTracking}
                      aria-label={t("CopyTrackingNumber") || "Copy tracking number"}
                      title={t("CopyTrackingNumber") || "Copy tracking number"}
                    >
                      <RiFileCopyLine />
                    </button>
                    <span className={`copy-tooltip ${copiedTracking ? "show" : ""}`}>
                      {t("Copied") || "Copied!"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {itemsCount !== null && (
            <div className="order-quickview-row">
              <div className="order-quickview-label">{t("Items") || "Items"}</div>
              <div className="order-quickview-value">{itemsCount}</div>
            </div>
          )}
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("ItemSku") || "Item SKU"}</div>
            <div className="order-quickview-value">
              {itemSkus.length ? (
                <div className="order-quickview-chips">
                  {itemSkus.map((sku) => (
                    <span className="order-quickview-chip" title={sku} key={sku}>
                      {sku}
                    </span>
                  ))}
                </div>
              ) : (
                "-"
              )}
            </div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("ShippingAddress") || "Shipping Address"}</div>
            <div className="order-quickview-value">
              <div className="order-quickview-address">
                {shippingAddressLines.map((line, idx) => (
                  <span key={`${line}-${idx}`}>{line}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="order-quickview-row">
            <div className="order-quickview-label">{t("BillingAddress") || "Billing Address"}</div>
            <div className="order-quickview-value">
              <div className="order-quickview-address">
                {billingAddressLines.map((line, idx) => (
                  <span key={`${line}-${idx}`}>{line}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ShowModal>
    </>
  );
};

export default OrderQuickView;
