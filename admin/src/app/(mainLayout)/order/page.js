"use client";
import AllOrdersTable from "@/components/orders/AllOrdersTable";
import { filterPills } from "@/data/OrderTable";
import request from "@/utils/axiosUtils";
import { OrderAPI, OrderTrashedAPI, StatisticsCountAPI } from "@/utils/axiosUtils/API";
import useCustomQuery from "@/utils/hooks/useCustomQuery";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Col } from "reactstrap";
import usePermissionCheck from "@/utils/hooks/usePermissionCheck";
import { canCreateAdminOrders } from "@/utils/customFunctions/adminRoles";

const Order = () => {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [canCreate] = usePermissionCheck(["create"], "order");
  const showCreateOrder = canCreate && canCreateAdminOrders();
  const { data: StatisticsCountData, isLoading, refetch: refetchStatistics } = useCustomQuery(
    [StatisticsCountAPI],
    () => request({ url: StatisticsCountAPI }, router),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data // Get the actual statistics from response.data.data
    }
  );
  const { data: orderTotalCount } = useCustomQuery(
    ["order-total-count"],
    () => request({ url: OrderAPI, params: { paginate: 1, page: 1 } }, router),
    {
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.meta?.total ?? 0,
    }
  );
  const [isCheck, setIsCheck] = useState([]);
  const [storeFilterData, setStoreFilterData] = useState([]);
  const searchParams = useSearchParams();
  const statusValue = searchParams.get("status");

  // Determine which API to use based on status
  const isTrashed = statusValue === "trashed";
  const orderUrl = isTrashed ? OrderTrashedAPI : OrderAPI;
  const resolvedTotalOrders =
    StatisticsCountData?.total_orders > 0
      ? StatisticsCountData.total_orders
      : orderTotalCount ?? 0;

  useEffect(() => {
    if (!isLoading && StatisticsCountData) {
      const updatedData = filterPills.map((pill) => ({
        ...pill,
        count: StatisticsCountData[pill?.countKey] ?? 0,
      }));
      setStoreFilterData(updatedData);
    }
  }, [StatisticsCountData, isLoading]);

  return (
    <Col sm="12">
      <div className="orders-page">
          <AllOrdersTable
          filterHeader={{
            noSearch: true,
            customTitleRight: showCreateOrder ? (
              <Link href="/order/create" className="btn btn-theme orders-add-btn">
                <FiPlus />
                <span>{t("AddOrder") || "Add Order"}</span>
              </Link>
            ) : null,
          }}
          differentFilter={
            <div className="order-filter-tabs mb-4" style={{ overflowX: 'auto', paddingBottom: '5px' }}>
              <ul className="order-tab-content d-flex flex-nowrap gap-0 list-unstyled mb-0">
                <li className={`order-tab-item ${!statusValue ? "active" : ""}`}>
                  <Link href="/order" className="order-tab-link">
                    All <span className="order-tab-count">{resolvedTotalOrders}</span>
                  </Link>
                </li>
                {storeFilterData.map((status, index) => (
                  <li key={index} className={`order-tab-item ${statusValue === status.value ? "active" : ""} ${status.color || ""}`}>
                    <Link
                      href={{ pathname: "/order", query: { status: status.value } }}
                      className="order-tab-link"
                    >
                      {status.label} <span className="order-tab-count">{status.count ?? 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          }
          paramsProps={{ status: isTrashed ? null : (statusValue ?? null) }}
          url={orderUrl}
          dateRange={false}
          moduleName="Order"
          isCheck={isCheck}
          setIsCheck={setIsCheck}
          isTrashed={isTrashed}
          onBulkActionComplete={refetchStatistics}
        />
      </div>
    </Col>
  );
};

export default Order;
