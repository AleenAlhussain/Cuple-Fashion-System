import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiDownload2Line, RiFileCopyLine, RiFilter3Line } from "react-icons/ri";
import TableWrapper from "@/utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import CalenderFilter from "../table/CalenderFilter";
import AdminSmartSearchBox from "@/components/common/AdminSmartSearchBox";
import request from "@/utils/axiosUtils";
import { OrderAPI, OrderExportPdfAPI, OrderExportXlsxAPI } from "@/utils/axiosUtils/API";
import { ToastNotification } from "@/utils/customFunctions/ToastNotification";
import { canManageAdminOrders } from "@/utils/customFunctions/adminRoles";

const AllOrdersTable = ({ data, paramsProps, setParamsProps, date, setDate, search, setSearch, fetchStatus, ...props }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const canManageOrders = canManageAdminOrders();
  const copyResetTimer = useRef(null);

  const handleCopy = (value) => {
    if (!value) return;
    navigator?.clipboard?.writeText(value).catch(() => {});
    setCopiedValue(value);
    if (copyResetTimer.current) {
      clearTimeout(copyResetTimer.current);
    }
    copyResetTimer.current = setTimeout(() => {
      setCopiedValue("");
    }, 1400);
  };

  const normalizeStatusKey = (value) =>
    (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  const shippingStatusConfig = useMemo(
    () => ({
      pending: { label: t("Pending"), className: "pending" },
      confirmed: { label: t("Confirmed"), className: "confirmed" },
      packed: { label: t("Packed"), className: "packed" },
      out_for_delivery: { label: t("Outfordelivery"), className: "out-for-delivery" },
      delivered: { label: t("delivered"), className: "delivered" },
      failed_delivery: { label: t("FailedDelivery"), className: "failed-delivery" },
      returned: { label: t("Returned"), className: "returned" },
      refunded: { label: t("Refunded"), className: "refunded" },
      cancelled: { label: t("Cancelled"), className: "cancelled" },
    }),
    [t]
  );

  const paymentStatusConfig = useMemo(
    () => ({
      pending: { label: t("Pending") || "Pending" },
      processing: { label: t("Processing") || "Processing" },
      holding: { label: t("Holding") || "Holding" },
      failed: { label: t("Failed") || "Failed" },
      completed: { label: t("Completed") || "Completed" },
    }),
    [t]
  );

  const formatStatusLabel = (key) => {
    if (!key) return "";
    return (
      paymentStatusConfig[key]?.label ||
      key
        .toString()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  const legacyShippingMap = {
    confirmed: "confirmed",
    processing: "packed",
    shipped: "out_for_delivery",
    "out-for-delivery": "out_for_delivery",
    out_for_delivery: "out_for_delivery",
    cancelled: "failed_delivery",
    failed: "failed_delivery",
    completed: "delivered",
    refunded: "refunded",
  };

  const deriveShippingStatus = (order) => {
    const rawStatus =
      order?.shipping_status ||
      order?.order_status?.slug ||
      order?.order_status?.name ||
      order?.status;
    const normalized = normalizeStatusKey(rawStatus);
    const key = shippingStatusConfig[normalized]
      ? normalized
      : legacyShippingMap[normalized] || "pending";
    const meta = shippingStatusConfig[key] || {
      label: key,
      className: key.replace(/_/g, "-"),
    };
    return { ...meta, key };
  };

  const rawData = data || [];

  const [channelFilter, setChannelFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [shippingStatusFilter, setShippingStatusFilter] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState("");
  const [copiedValue, setCopiedValue] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    };
  }, []);

  useEffect(() => {
    if (search !== undefined) {
      setSearchText(search || "");
    }
  }, [search]);

  const paymentStatusOptions = useMemo(() => {
    const set = new Set(Object.keys(paymentStatusConfig));
    rawData.forEach((o) => {
      if (o.payment_status) set.add(normalizeStatusKey(o.payment_status));
    });
    return Array.from(set);
  }, [rawData, paymentStatusConfig]);

  const paymentTypeOptions = useMemo(() => {
    const set = new Set();
    rawData.forEach((o) => {
      if (o.payment_method) set.add(o.payment_method.toString().toLowerCase());
    });
    return Array.from(set);
  }, [rawData]);

  const countryOptions = useMemo(() => {
    const map = new Map();
    rawData.forEach((o) => {
      const countryName =
        o?.shipping_address?.country?.name ||
        o?.billing_address?.country?.name ||
        o?.store?.country?.name ||
        o?.country?.name;
      const countryId =
        o?.country_id ||
        o?.shipping_address?.country?.id ||
        o?.billing_address?.country?.id ||
        o?.store?.country?.id ||
        null;
      if (countryName) {
        const key = countryId || countryName;
        if (!map.has(key)) {
          map.set(key, { id: key, name: countryName });
        }
      }
    });
    return Array.from(map.values());
  }, [rawData]);

  const channelOptions = useMemo(() => {
    const set = new Set();
    rawData.forEach((o) => {
      if (o.sales_channel) set.add(o.sales_channel.toString());
    });
    return Array.from(set);
  }, [rawData]);

  useEffect(() => {
    if (!setParamsProps) return;
    const nextParams = {
      ...(paramsProps || {}),
      payment_status: paymentStatusFilter || null,
      payment_method: paymentTypeFilter || null,
      shipping_status: shippingStatusFilter || null,
      country_id: countryFilter || null,
      channel: channelFilter || null,
    };
    const currentSignature = JSON.stringify(paramsProps || {});
    const nextSignature = JSON.stringify(nextParams);
    if (currentSignature !== nextSignature) {
      setParamsProps(nextParams);
    }
  }, [
    paramsProps,
    setParamsProps,
    paymentStatusFilter,
    paymentTypeFilter,
    shippingStatusFilter,
    countryFilter,
    channelFilter,
  ]);

  const orders = useMemo(() => {
    return (rawData || []).map((element) => {
      const status = element.payment_status;
      const shippingStatus = deriveShippingStatus(element);
      const paymentStatusKey = normalizeStatusKey(status);
      const paymentStatusLabel = formatStatusLabel(paymentStatusKey) || status;
      const trackingNumberRaw =
        element?.tracking_number ??
        element?.trackingNumber ??
        element?.awb ??
        element?.shipment_awb ??
        element?.shipping_awb ??
        null;

      const trackingNumber = (trackingNumberRaw ?? "").toString().trim() || "-";

      const paymentMethodRaw = (element.payment_method || "").toString().toLowerCase();
      const paymentModeMeta = (() => {
        if (paymentMethodRaw.includes("cod") || paymentMethodRaw.includes("cash")) {
          return { icon: "\u{1F4B5}", label: "COD", className: "cod" };
        }
        if (paymentMethodRaw.includes("stripe") || paymentMethodRaw.includes("card")) {
          return { icon: "\u{1F4B3}", label: "Card", className: "card" };
        }
        return { icon: "\u{1F4B3}", label: paymentMethodRaw || "-", className: "card" };
      })();
      return {
        ...element,
        order_number_value: element.order_number,
        _status: shippingStatus.key,
        shipping_status: (
          <div className={`status-${shippingStatus.className}`}>
            <span>{shippingStatus.label}</span>
          </div>
        ),
        order_overview: (
          <div className="order-meta">
            <span className="order-id">#{element.order_number}</span>
            {element.invoice_number && (
              <span className="order-subtext">
                {t("InvoiceNumber") || "Invoice"}: {element.invoice_number}
              </span>
            )}
          </div>
        ),
        tracking_number: trackingNumber !== "-" ? (
          <div className="tracking-cell">
            <span className="order-tracking-number">{trackingNumber}</span>
            <button
              type="button"
              className="btn btn-light btn-sm orders-copy-btn"
              title={t("CopyTrackingNumber") || "Copy tracking number"}
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(trackingNumber);
              }}
              aria-label={t("CopyTrackingNumber") || "Copy tracking number"}
            >
              <RiFileCopyLine />
            </button>
            <span className={`copy-tooltip ${copiedValue === trackingNumber ? "show" : ""}`}>
              {t("Copied") || "Copied!"}
            </span>
          </div>
        ) : (
          "-"
        ),
        tracking_number_value: trackingNumber,

        payment_status: status ? (
          <div
            className={`status-${
              paymentStatusKey ||
              (status && status.toString ? status.toString().toLowerCase() : "")
            }`}
          >
            <span>{paymentStatusLabel}</span>
          </div>
        ) : (
          "-"
        ),
        payment_status_value: status,
        payment_summary: (
          <div className="payment-summary">
            {status ? (
              <div className={`status-${paymentStatusKey || paymentMethodRaw}`}>
                <span>{paymentStatusLabel}</span>
              </div>
            ) : (
              "-"
            )}
            {element.payment_method ? (
              <div className={`payment-mode-pill ${paymentModeMeta.className}`} title={element.payment_method}>
                <span role="img" aria-label={paymentModeMeta.label}>
                  {paymentModeMeta.icon}
                </span>
                <span className="payment-mode-text">{paymentModeMeta.label}</span>
              </div>
            ) : null}
          </div>
        ),
        consumer_name: <span className="text-capitalize order-customer-name">{element?.consumer?.name}</span>,
      };
    });
  }, [rawData, shippingStatusConfig, paymentStatusConfig, t, copiedValue]);

  const headerObj = {
    checkBox: true,
    isOption: true,
    isSerialNo: false,
    disableRowClick: true,
    optionHead: {
      title: "Action",
      show: "order",
      type: "View",  // Use "View" to trigger redirectLink instead of default /edit/ path
      modalTitle: t("Orders"),
      trashAction: {
        titleKey: "MoveOrderToTrash",
        descriptionKey: "MoveOrderToTrashDescription",
        confirmKey: "MoveToTrash",
        triggerKey: "MoveToTrash",
      },
    },
    column: [
      { title: "OrderNumber", apiKey: "order_overview", class: "orders-th-left", tdClass: "orders-td-left" },
      { title: "CustomerName", apiKey: "consumer_name", class: "orders-th-left", tdClass: "orders-td-left" },
      { title: "OrderDate", apiKey: "created_at", sorting: true, sortBy: "desc", type: "date", class: "orders-th-left", tdClass: "orders-td-left" },
      { title: "TotalAmount", apiKey: "total", type: "price", class: "orders-th-right", tdClass: "orders-td-right orders-col-total" },
      { title: "Payment", apiKey: "payment_summary", class: "orders-th-center", tdClass: "orders-td-center" },
      { title: "ShippingStatus", apiKey: "shipping_status", class: "orders-th-center", tdClass: "orders-td-center" },
      { title: "TrackingNumber", apiKey: "tracking_number", class: "orders-th-left", tdClass: "orders-td-left" },
    ],
    data: orders,
  };

  const redirectLink = (row) => {
    const orderId = row?.id;
    if (orderId) router.push(`/order/details/${orderId}`);
  };

  if (!data) return null;

  const getSelectedIds = () => props.isCheck || [];

  const buildExportParams = () => {
    const params = {
      ...(paramsProps || {}),
    };

    if (search) params.search = search;
    if (date?.[0]?.startDate) params.start_date = date[0].startDate;
    if (date?.[0]?.endDate) params.end_date = date[0].endDate;
    if (props.isTrashed) params.trashed = 1;

    return params;
  };

  const getFilenameFromDisposition = (disposition, fallbackName) => {
    if (!disposition) return fallbackName;

    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
      try {
        return decodeURIComponent(utfMatch[1].replace(/\"/g, ""));
      } catch {
        return utfMatch[1].replace(/\"/g, "");
      }
    }

    const asciiMatch = disposition.match(/filename="?([^\";]+)"?/i);
    if (asciiMatch?.[1]) return asciiMatch[1];

    return fallbackName;
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  };

  const getExportErrorMessage = (error) => {
    const status = error?.response?.status;
    if (status === 401) return t("Unauthorized") || "Unauthorized. Please log in again.";
    if (status === 403) return t("AccessDenied") || "You do not have permission to export orders.";
    if (status === 500) return t("ServerError") || "Server error. Please try again later.";
    return error?.response?.data?.message || error?.message || "Export failed. Please try again.";
  };

  const handleExport = async (type) => {
    if (exportLoading) return;

    const selectedIds = getSelectedIds();
    const hasSelection = selectedIds.length > 0;
    const exportParams = buildExportParams();
    const url = type === "xlsx" ? OrderExportXlsxAPI : OrderExportPdfAPI;
    const fallbackName = `orders_${new Date().toISOString().split("T")[0]}.${type}`;

    setExportLoading(type);

    try {
      const response = await request(
        {
          url,
          method: hasSelection ? "post" : "get",
          params: hasSelection ? undefined : exportParams,
          data: hasSelection ? { ...exportParams, ids: selectedIds } : undefined,
          responseType: "blob",
        },
        router
      );

      const blob = response?.data;
      if (!blob) {
        throw new Error("Empty export response.");
      }

      const disposition =
        response?.headers?.["content-disposition"] || response?.headers?.["Content-Disposition"];
      const filename = getFilenameFromDisposition(disposition, fallbackName);
      downloadBlob(blob, filename);
      ToastNotification("success", t("ExportDownloaded") || "Export downloaded successfully");
    } catch (error) {
      ToastNotification("error", getExportErrorMessage(error));
    } finally {
      setExportLoading("");
    }
  };

  const handleExportOnlineRequest = () => {
    const selectedIds = getSelectedIds();
    if (!selectedIds.length) return alert(t("SelectOrdersFirst") || "Please select orders first");

    const baseUrl = process.env.API_PROD_URL || "https://api.cuple.shop/api/admin/";
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const url = `${normalizedBaseUrl}order/pick-list/export`;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.responseType = "blob";
    xhr.setRequestHeader("Content-Type", "application/json");

    const token = localStorage.getItem("uat");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.onload = function () {
      if (xhr.status === 200) {
        const blob = xhr.response;
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `uae_pick_list_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else {
        alert("Failed to export online request. Please try again.");
      }
    };

    xhr.onerror = function () {
      alert("Failed to export online request. Please try again.");
    };

    xhr.send(JSON.stringify({ ids: selectedIds }));
  };

  const handleBulkActionApply = async () => {
    if (!bulkAction) return;
    const selectedIds = getSelectedIds();
    if (!selectedIds.length) return alert(t("SelectOrdersFirst") || "Please select orders first");
    setBulkLoading(true);
    try {
      if (bulkAction === "delete" || bulkAction === "trash") {
        if (props.isTrashed) {
          await Promise.all(
            selectedIds.map((id) =>
              request(
                {
                  url: `${OrderAPI}/${id}/force`,
                  method: "delete",
                },
                router
              )
            )
          );
        } else {
          await request(
            {
              url: `${OrderAPI}/deleteAll`,
              method: "delete",
              data: { ids: selectedIds },
            },
            router
          );
        }
      } else if (bulkAction === "duplicate") {
        await Promise.all(
          selectedIds.map((id) =>
            request(
              {
                url: `${OrderAPI}/${id}/duplicate`,
                method: "post",
              },
              router
            )
          )
        );
      } else if (bulkAction.startsWith("status:")) {
        const status = bulkAction.replace("status:", "").trim();
        if (!status) {
          throw new Error("Missing status value for bulk update.");
        }
        await Promise.all(
          selectedIds.map((id) =>
            request(
              {
                url: `${OrderAPI}/${id}/status`,
                method: "put",
                data: { status },
              },
              router
            )
          )
        );
      }
      props.setIsCheck && props.setIsCheck([]);
      props.refetch && props.refetch();
      props.onBulkActionComplete && props.onBulkActionComplete();
    } catch (error) {
      console.error("Bulk action failed", error);
    } finally {
      setBulkLoading(false);
      setBulkAction("");
    }
  };

  const handleBulkRestore = async () => {
    const selectedIds = getSelectedIds();
    if (!selectedIds.length) return alert(t("SelectOrdersFirst") || "Please select orders first");
    setRestoreLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          request(
            {
              url: `${OrderAPI}/${id}/restore`,
              method: "post",
            },
            router
          )
        )
      );
      props.setIsCheck && props.setIsCheck([]);
      props.refetch && props.refetch();
      props.onBulkActionComplete && props.onBulkActionComplete();
    } catch (error) {
      console.error("Bulk restore failed", error);
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchText("");
    setPaymentStatusFilter("");
    setShippingStatusFilter("");
    setPaymentTypeFilter("");
    setCountryFilter("");
    setChannelFilter("");
    setShowAdvancedFilters(false);
    setBulkAction("");
    if (setSearch) {
      setSearch("");
    }
    if (setDate) {
      setDate([{ startDate: null, endDate: null, key: "selection" }]);
    }
  };

  return (
    <>
      <div className="orders-toolbar mb-3">
        <div className="orders-toolbar-section">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => handleExport("xlsx")}
            disabled={Boolean(exportLoading)}
          >
            <RiDownload2Line />
            <span>{exportLoading === "xlsx" ? `${t("Loading") || "Exporting"}...` : "Export XLSX"}</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => handleExport("pdf")}
            disabled={Boolean(exportLoading)}
          >
            <RiDownload2Line />
            <span>{exportLoading === "pdf" ? `${t("Loading") || "Exporting"}...` : "Export PDF"}</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={handleExportOnlineRequest}
          >
            <RiDownload2Line />
            <span>Export Online Request</span>
          </button>
        </div>

        {canManageOrders ? (
          <div className="orders-toolbar-section">
            <select
              className="form-select form-select-sm"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">{t("BulkActions") || "Bulk Actions"}</option>
              <option value="delete">{t("Delete") || "Delete"}</option>
              <option value="trash">{t("Trash") || "Trash"}</option>
              <option value="duplicate">{t("Duplicate") || "Duplicate"}</option>
              <optgroup label={t("ChangeOrderStatus") || "Change order status"}>
                <option value="status:pending">{t("Pending") || "Pending"}</option>
                <option value="status:confirmed">{t("Confirmed") || "Confirmed"}</option>
                <option value="status:processing">{t("Processing") || "Processing"}</option>
                <option value="status:shipped">{t("Shipped") || "Shipped"}</option>
                <option value="status:out-for-delivery">{t("Outfordelivery") || "Out For Delivery"}</option>
                <option value="status:delivered">{t("Delivered") || "Delivered"}</option>
                <option value="status:cancelled">{t("Cancelled") || "Canceled"}</option>
                <option value="status:refunded">{t("Refunded") || "Refunded"}</option>
              </optgroup>
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!bulkAction || !getSelectedIds().length || bulkLoading || restoreLoading}
              onClick={handleBulkActionApply}
            >
              {bulkLoading ? t("Loading") || "Applying..." : t("Apply") || "Apply"}
            </button>
            {props.isTrashed ? (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                disabled={!getSelectedIds().length || restoreLoading || bulkLoading}
                onClick={handleBulkRestore}
              >
                {restoreLoading ? t("Loading") || "Restoring..." : t("Restore") || "Restore"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="orders-filters mb-3">
        <div className="orders-filters-basic">
          <CalenderFilter
            date={date}
            setDate={setDate}
            startLabel={t("DateFrom") || "Date From"}
            endLabel={t("DateTo") || "Date To"}
          />
          <AdminSmartSearchBox
            value={searchText}
            onChange={setSearchText}
            onApply={(text) => {
              setSearchText(text);
              setSearch && setSearch(text);
            }}
            placeholder={t("SearchOrderNumber") || "Search orders"}
            loading={fetchStatus === "fetching"}
          />
          <button type="button" className="btn btn-outline-secondary" onClick={handleResetFilters}>
            {t("Reset") || "Reset"}
          </button>
          <button
            type="button"
            className="btn btn-light orders-advanced-toggle"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
          >
            <RiFilter3Line />
            <span>{showAdvancedFilters ? t("HideAdvanced") || "Hide Advanced" : t("AdvancedFilters") || "Advanced Filters"}</span>
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="orders-filters-advanced">
            <select
              className="form-select"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="">{t("PaymentStatusFilter") || "Payment Status"}</option>
              {paymentStatusOptions.map((opt) => (
                <option value={opt} key={opt}>
                  {formatStatusLabel(opt)}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              value={shippingStatusFilter}
              onChange={(e) => setShippingStatusFilter(e.target.value)}
            >
              <option value="">{t("ShippingStatusFilter") || "Shipping Status"}</option>
              {Object.keys(shippingStatusConfig).map((key) => (
                <option value={key} key={key}>
                  {shippingStatusConfig[key].label}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
            >
              <option value="">{t("PaymentType") || "Payment Type"}</option>
              {paymentTypeOptions.map((opt) => (
                <option value={opt} key={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="">{t("Country") || "Country"}</option>
              {countryOptions.map((opt) => (
                <option value={opt.id} key={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="">{t("Channel") || "Channel"}</option>
              {channelOptions.length
                ? channelOptions.map((opt) => (
                    <option value={opt} key={opt}>
                      {opt}
                    </option>
                  ))
                : ["online", "store"].map((opt) => (
                    <option value={opt} key={opt}>
                      {opt}
                    </option>
                  ))}
            </select>
            <button type="button" className="btn btn-outline-secondary" onClick={handleResetFilters}>
              {t("Reset") || "Reset"}
            </button>
          </div>
        )}
      </div>

      <ShowTable
        {...props}
        headerData={headerObj}
        redirectLink={redirectLink}
        moduleName="order"
        tableClassName="orders-table"
        isTrashed={props.isTrashed}
        restoreMutate={props.restoreMutate}
        forceDeleteMutate={props.forceDeleteMutate}
      />
    </>
  );
};

export default TableWrapper(AllOrdersTable);
