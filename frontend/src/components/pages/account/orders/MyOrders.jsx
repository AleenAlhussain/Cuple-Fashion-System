import NoDataFound from "@/components/widgets/NoDataFound";
import Pagination from "@/components/widgets/Pagination";
import { useSettings } from "@/utils/hooks/useSettings";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RiEyeLine } from "react-icons/ri";
import { Card, CardBody, Table } from "reactstrap";
import useAxios from "@/utils/api/helpers/useAxios";

import { showMonthWiseDateAndTime } from "@/utils/customFunctions/DateFormat";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import { useTranslation } from "react-i18next";
import AccountHeading from "../common/AccountHeading";
import Loader from "@/layout/loader";
import Capitalize from "@/utils/customFunctions/Capitalize";
import styles from "./MyOrders.module.scss";

const OrderAPI = "/order";

const getStatusVariant = (status = "") => {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("delivered") || normalized.includes("completed")) {
    return "delivered";
  }
  if (normalized.includes("cancel") || normalized.includes("refunded") || normalized.includes("rejected")) {
    return "cancelled";
  }
  return "pending";
};

const MyOrders = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const { t } = useTranslation("common");
  const axios = useAxios();
  const { settingData } = useSettings();
  const { data, isLoading } = useFetchQuery(
    [OrderAPI, page],
    () => axios({ url: OrderAPI, params: { page: page, paginate: 10 } }),
    {
      enabled: true,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      select: (res) => res?.data,
    }
  );

  const orders = data?.data ?? [];
  const totalOrders = data?.meta?.total ?? 0;
  const showSummary = totalOrders > 0;

  const summaryCounts = useMemo(
    () =>
      orders.reduce(
        (acc, order) => {
          const variant = getStatusVariant(order.status);
          acc[variant] = (acc[variant] ?? 0) + 1;
          return acc;
        },
        { delivered: 0, pending: 0, cancelled: 0 }
      ),
    [orders]
  );

  const statusOptions = useMemo(() => {
    const uniqueStatuses = Array.from(new Set(orders.map((order) => order.status).filter(Boolean)));
    return uniqueStatuses
      .sort((a, b) => a.localeCompare(b))
      .map((status) => ({ value: status, label: Capitalize(status.replace(/-/g, " ")) }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const startDate = dateRange.from ? new Date(dateRange.from) : null;
    const endDate = dateRange.to ? new Date(dateRange.to) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    return orders.filter((order) => {
      if (statusFilter && order.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      if (normalizedSearch) {
        const orderNumber = order.order_number?.toString().toLowerCase() ?? "";
        if (!orderNumber.includes(normalizedSearch)) {
          return false;
        }
      }

      if (startDate || endDate) {
        const created = order.created_at ? new Date(order.created_at) : null;
        if (created) {
          if (startDate && created < startDate) {
            return false;
          }
          if (endDate && created > endDate) {
            return false;
          }
        }
      }

      return true;
    });
  }, [orders, searchTerm, statusFilter, dateRange]);

  const formatCurrency = (amount) => {
    const currency = settingData?.general?.default_currency;
    const parsedDecimals = Number(currency?.no_of_decimal);
    const decimals = Number.isFinite(parsedDecimals) ? Math.min(Math.max(parsedDecimals, 0), 4) : 2;
    const value = Number(amount ?? 0);
    const formattedNumber = value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    if (!currency?.symbol) {
      return formattedNumber;
    }

    return currency.symbol_position === "after_price"
      ? `${formattedNumber} ${currency.symbol}`
      : `${currency.symbol} ${formattedNumber}`;
  };

  const statusVariantClass = (status) => {
    const variant = Capitalize(getStatusVariant(status));
    return `${styles.statusBadge} ${styles[`status${variant}`] ?? ""}`;
  };

  if (isLoading)
    return (
      <div className="box-loader">
        <Loader classes={"blur-bg"} />
      </div>
    );

  const summaryItems = [
    { label: t("TotalOrders"), value: totalOrders, variant: "total" },
    { label: t("Delivered"), value: summaryCounts.delivered, variant: "delivered" },
    { label: t("Pending"), value: summaryCounts.pending, variant: "pending" },
    { label: t("Cancelled"), value: summaryCounts.cancelled, variant: "cancelled" },
  ];

  return (
    <Card className={`dashboard-table mt-0 ${styles.ordersCard}`}>
      <CardBody className={styles.cardBody}>
        <AccountHeading title="MyOrders" classes={"top-sec"} />

        {showSummary && (
          <>
            <div className={styles.summaryBar}>
              {summaryItems.map((item) => (
                <div key={item.label} className={`${styles.summaryChip} ${styles[`chip${Capitalize(item.variant)}`] ?? ""}`}>
                  <span className="text-secondary">{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className={styles.filterRow}>
              <div className={styles.filterItem}>
                <label>{t("OrderNumber")}</label>
                <input
                  type="search"
                  placeholder={t("SearchByOrderNumber")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.filterInput}
                />
              </div>

              <div className={styles.filterItem}>
                <label>{t("OrderStatus")}</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={styles.filterInput}
                >
                  <option value="">{t("AllStatuses")}</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterItem}>
                <label>{t("Date")}</label>
                <div className={styles.dateInputs}>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                    className={styles.filterInput}
                  />
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                    className={styles.filterInput}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {showSummary ? (
          <div className={styles.tableWrapper}>
            {filteredOrders.length > 0 ? (
              <div className="table-responsive">
                <Table className={`${styles.ordersTable} table cart-table order-table mb-0`}>
                  <thead>
                    <tr className="table-head">
                      <th>{t("OrderNumber")}</th>
                      <th>{t("Date")}</th>
                      <th className="text-end">{t("Amount")}</th>
                      <th>{t("OrderStatus")}</th>
                      <th>{t("PaymentMethod")}</th>
                      <th>{t("Option")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id ?? order.order_number}>
                        <td className={styles.orderNumberCell}>
                          <span className={styles.orderNumberValue}>#{order.order_number}</span>
                        </td>
                        <td className={styles.dateCell}>{showMonthWiseDateAndTime(order?.created_at)}</td>
                        <td className={`${styles.amountCell} text-end`}>{formatCurrency(order?.total)}</td>
                        <td>
                          <div className={statusVariantClass(order.status)}>
                            <span>{Capitalize((order?.status || "").replace(/-/g, " "))}</span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.paymentBadge}>{order.payment_method?.toUpperCase()}</span>
                        </td>
                        <td className={styles.actionCell}>
                          <Link href={`/account/order/details/${order.order_number}`} className={styles.viewButton}>
                            <RiEyeLine />
                            <span>{t("View")}</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className={styles.emptyFilters}>
                <p>{t("NoMatchingOrders")}</p>
              </div>
            )}
          </div>
        ) : (
          <NoDataFound
            customClass="no-data-added"
            imageUrl={`/assets/svg/empty-items.svg`}
            title="NoOrdersFound"
            description="NoOrdersHaveBeenMadeYet"
            height="300"
            width="300"
          />
        )}

        {showSummary && (
          <div className="product-pagination">
            <div className="theme-pagination-block">
              <nav>
                <Pagination
                  current_page={data?.meta?.current_page}
                  total={data?.meta?.total}
                  per_page={data?.meta?.per_page}
                  setPage={setPage}
                />
              </nav>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default MyOrders;
