import Pagination from "@/components/widgets/Pagination";
import Capitalize from "@/utils/customFunctions/Capitalize";
import { showMonthWiseDateAndTime } from "@/utils/customFunctions/DateFormat";
import { useTranslation } from "react-i18next";
import { Table } from "reactstrap";
import { formatPointsValue, formatRemarkLabel } from "./pointHelpers";

const PointTable = ({ data, setPage }) => {
  const { t } = useTranslation("common");
  const transactions = data?.transactions?.data ?? [];
  const pagination = data?.transactions ?? {};

  return (
    <>
      <div className="wallet-table">
        <div className="table-responsive">
          <Table className="cart-table order-table points-transaction-table">
            <thead>
              <tr>
                <th>{t("Date")}</th>
                <th>{t("Points")}</th>
                <th>{t("Remark")}</th>
                <th>{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, i) => {
                const isCredit = transaction?.type === "credit";
                const amountLabel = formatPointsValue(transaction?.amount);
                return (
                  <tr key={i}>
                    <td>{showMonthWiseDateAndTime(transaction?.created_at)}</td>
                    <td>
                      <span className={`points-amount ${isCredit ? "points-amount--positive" : "points-amount--negative"}`}>
                        {isCredit ? "+" : "-"}
                        {amountLabel}
                      </span>
                    </td>
                    <td>{formatRemarkLabel(transaction?.remark, transaction?.detail)}</td>
                    <td>
                      <div className={`badge ${isCredit ? "bg-credit" : "bg-debit"} loyalty-badge`}>
                        <span>{Capitalize(transaction?.type ?? "")}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </div>
      <div className="product-pagination">
        <div className="theme-pagination-block">
          <nav>
            <Pagination current_page={pagination?.current_page} total={pagination?.total} per_page={pagination?.per_page} setPage={setPage} />
          </nav>
        </div>
      </div>
    </>
  );
};

export default PointTable;
