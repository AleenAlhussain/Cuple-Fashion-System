import Pagination from "@/components/widgets/Pagination";
import Loader from "@/layout/loader";
import useAxios from "@/utils/api/helpers/useAxios";

import { ImagePath } from "@/utils/constants";
import Capitalize from "@/utils/customFunctions/Capitalize";
import { showMonthWiseDateAndTime } from "@/utils/customFunctions/DateFormat";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody, Col, Row, Table } from "reactstrap";

const WalletConsumerAPI = "/wallet";
const PointsValueAPI = "/wallet/points-value";

const WalletCard = () => {
  const [page, setPage] = useState(1);
  const { t } = useTranslation("common");
  const axios = useAxios();
  const { data, isLoading, refetch, error } = useFetchQuery([WalletConsumerAPI], () => axios({ url: WalletConsumerAPI, params: { page, paginate: 10 } }), {
    enabled: false,
    refetchOnWindowFocus: false,
    select: (res) => res?.data,
  });
  const { data: pointsValueData, isLoading: isLoadingPointsValue, refetch: refetchPointsValue, error: pointsValueError } = useFetchQuery(
    [PointsValueAPI],
    () => axios({ url: PointsValueAPI }),
    {
      enabled: false,
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data ?? null,
    }
  );
  const convertCurrency = (amount) => {
    if (amount === null || amount === undefined) return "0.00 AED";
    const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(num)) return "0.00 AED";
    return `${num.toFixed(2)} AED`;
  };
  const formatHeroAmount = (value) => {
    const numeric = Number(value ?? 0);
    if (Number.isNaN(numeric)) {
      return "0";
    }
    return Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(2);
  };
  useEffect(() => {
    refetch();
  }, [page, refetch]);
  useEffect(() => {
    refetchPointsValue();
  }, [refetchPointsValue]);

  const fetchError = error ?? pointsValueError;

  if (isLoading || isLoadingPointsValue)
    return (
      <div className="box-loader">
        <Loader classes={'blur-bg'} />
      </div>
    );

  if (fetchError) {
    const alertMessage =
      fetchError?.response?.data?.message ?? fetchError?.message ?? "Unable to load wallet data. Please try again.";
    return (
      <div className="box-loader">
        <div className="alert alert-danger mb-0">{alertMessage}</div>
      </div>
    );
  }

  const walletTransactions = data?.transactions;
  const transactions = walletTransactions?.data ?? [];
  const hasTransactions = transactions.length > 0;
  const availableValueAed = pointsValueData?.available_value_aed ?? 0;

  return (
    <>
      <Row className="g-2">
        <Col xs="12">
          <Card className="wallet-highlight-card">
            <CardBody className="wallet-highlight-body">
              <div className="wallet-highlight-content">
                <p className="wallet-highlight-label">{t("WalletBalanceTitle")}</p>
                <div className="wallet-highlight-amount-row">
                  <h2 className="wallet-highlight-amount">{formatHeroAmount(availableValueAed)}</h2>
                  <span className="wallet-highlight-currency">AED</span>
                </div>
                <p className="wallet-highlight-subtitle">{t("WalletBalanceSubtitle")}</p>
                <p className="wallet-highlight-note">{t("WalletBalanceCheckoutHint")}</p>
              </div>
              <div className="wallet-highlight-badge" aria-hidden="true">
                <span className="wallet-highlight-icon">🪙</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs="12">
          <Card className="wallet-info-card">
            <CardBody>
              <div className="wallet-info-content">
                <p className="wallet-info-title">{t("WalletInfoTitle")}</p>
                <ul className="wallet-info-list">
                  <li>{t("WalletInfoList1")}</li>
                  <li>{t("WalletInfoList2")}</li>
                  <li>{t("WalletInfoList3")}</li>
                </ul>
              </div>
            </CardBody>
          </Card>
        </Col>

        {hasTransactions ? (
          <Col xs="12">
            <Card className="dashboard-table mt-0">
              <CardBody className="p-0">
                <div className="wallet-table">
                  <div className="table-responsive">
                    <Table className="table cart-table order-table">
                      <thead>
                        <tr>
                          <th>{t("Date")}</th>
                          <th>{t("Amount")}</th>
                          <th>{t("Remark")}</th>
                          <th>{t("Status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction, i) => (
                          <tr key={i}>
                            <td>{showMonthWiseDateAndTime(transaction?.created_at)}</td>
                            <td>{convertCurrency(transaction.amount)}</td>
                            <td>{transaction.detail}</td>
                            <td>
                              <div className={`${transaction.type == "credit" ? "badge bg-credit custom-badge rounded-0" : "badge bg-debit custom-badge rounded-0"}`}>
                                <span>{Capitalize(transaction?.type)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
                <div className="product-pagination">
                  <div className="theme-pagination-block">
                    <nav>
                      <Pagination current_page={walletTransactions?.current_page} total={walletTransactions?.total} per_page={walletTransactions?.per_page} setPage={setPage} />
                    </nav>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        ) : (
          <Col xs="12">
            <Card className="dashboard-table mt-0 wallet-empty-card">
              <CardBody className="p-4">
                <p className="mb-0 text-muted text-center">{t("WalletNoTransactionsMessage")}</p>
              </CardBody>
            </Card>
          </Col>
        )}
      </Row>
    </>
  );
};

export default WalletCard;
