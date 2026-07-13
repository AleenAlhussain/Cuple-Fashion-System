import Link from "next/link";
import NoDataFound from "@/components/widgets/NoDataFound";
import Pagination from "@/components/widgets/Pagination";
import Loader from "@/layout/loader";
import useAxios from "@/utils/api/helpers/useAxios";
import Capitalize from "@/utils/customFunctions/Capitalize";
import { showMonthWiseDate } from "@/utils/customFunctions/DateFormat";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Table } from "reactstrap";
import AccountHeading from "../common/AccountHeading";
import { getHistorySummaryItems, getStatusBadgeStyle } from "../history/historyHelpers";

const ExchangeAPI = "/exchange";

const ExchangeTable = () => {
  const { t } = useTranslation("common");
  const [page, setPage] = useState(1);
  const axios = useAxios();
  const { data, isLoading, refetch } = useFetchQuery(
    [ExchangeAPI],
    () => axios({ url: ExchangeAPI, params: { page, paginate: 10 } }),
    {
      enabled: false,
      refetchOnWindowFocus: false,
      select: (res) => res?.data,
    }
  );

  useEffect(() => {
    refetch();
  }, [page, refetch]);

  const exchanges = useMemo(() => data?.data ?? [], [data]);
  const summaryItems = useMemo(() => getHistorySummaryItems(exchanges, "exchange"), [exchanges]);

  if (isLoading)
    return (
      <div className="box-loader">
        <Loader classes={"blur-bg"} />
      </div>
    );

  const hasRecords = Boolean(exchanges.length);

  return (
    <Card className="dashboard-table mt-0 history-card">
      <CardBody className="p-0">
        <AccountHeading title="ExchangeHistory" classes={"top-sec"} />

        <div className="history-summary">
          {summaryItems.map((item) => (
            <div
              key={item.labelKey}
              className="history-summary__pill"
              style={{ borderColor: item.color, backgroundColor: item.background }}
            >
              <span>{t(item.labelKey)}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>

        {hasRecords ? (
          <>
            <div className="table-responsive history-table-wrapper">
              <Table className="table cart-table order-table mb-0 history-table">
                <thead>
                  <tr>
                    <th>{t("Order")}</th>
                    <th>{t("Status")}</th>
                    <th>{t("Reason")}</th>
                    <th>{t("CreatedAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {exchanges.map((exchange, index) => {
                    const status = exchange?.status ?? "";
                    const badge = getStatusBadgeStyle(status);
                    const orderNumber = exchange?.order?.order_number;
                    const orderHref = orderNumber ? `/account/order/details/${orderNumber}` : "/account/orders";
                    const reason = (exchange?.reason || "").trim();

                    return (
                      <tr key={exchange?.id ?? `${index}-${orderNumber}`}>
                        <td>
                          <Link href={orderHref} className="history-order-link">
                            <span className="history-order-number">
                              {orderNumber ? `#${orderNumber}` : t("Order")}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <span
                            className="history-table__status-pill"
                            style={{ color: badge.color, borderColor: badge.color, backgroundColor: badge.background }}
                          >
                            {Capitalize(status.replace(/[-_]/g, " ")) || "Updated"}
                          </span>
                        </td>
                        <td className="history-table__reason" title={reason}>
                          {reason || "—"}
                        </td>
                        <td className="history-table__date">
                          {showMonthWiseDate(exchange?.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

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
          </>
        ) : (
          <div className="history-empty-state">
            <NoDataFound
              customClass="no-data-added"
              imageUrl={`/assets/svg/empty-items.svg`}
              title="NoExchangeFound"
              description="NoExchangeYetDescription"
              height="300"
              width="300"
            />
            <Link href="/account/orders" className="history-empty-cta__button">
              {t("ViewOrders")}
            </Link>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default ExchangeTable;
