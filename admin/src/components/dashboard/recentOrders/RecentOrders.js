import { useRouter } from "next/navigation";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import SettingContext from "../../../helper/settingContext";
import TableWrapper from "../../../utils/hoc/TableWrapper";
import ShowTable from "../../table/ShowTable";
import { dateWithOnlyMonth } from "../../../utils/customFunctions/DateFormat";

const RecentOrders = ({ data, ...props }) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { convertCurrency } = useContext(SettingContext);

  const isDataAvailable = data && data.length > 0;

  const renderOrderNumber = (row) => <span className="recent-orders-number">#{row?.order_number}</span>;
  const renderDate = (row) => <span className="recent-orders-date">{dateWithOnlyMonth(row?.created_at)}</span>;
  const renderName = (row) => (
    <span className="recent-orders-name" title={row?.consumer?.name}>
      {row?.consumer?.name || "-"}
    </span>
  );
  const renderAmount = (row) => {
    const formatted = convertCurrency(row?.total);
    if (!formatted) {
      return "-";
    }
    const [currency, ...rest] = formatted.split(" ");
    const amount = rest.join(" ");
    return (
      <span className="recent-orders-amount">
        <span className="recent-orders-currency">{currency}</span>
        <span className="recent-orders-value">{amount}</span>
      </span>
    );
  };
  const renderPaymentStatus = (row) => {
    const status = row?.payment_status?.toString().toLowerCase() || "";
    return (
      <div className={`recent-orders-status status-${status}`}>
        <span>{row?.payment_status || "-"}</span>
      </div>
    );
  };

  const headerObj = {
    checkBox: false,
    isOption: true,
    noEdit: false,
    isSerialNo: false,
    optionHead: { title: "Action", type: "View", redirectUrl: "/order/details", modalTitle: t("Orders") },
    noCustomClass: true,
    column: [
      { title: "Number", apiKey: "order_number", render: renderOrderNumber },
      { title: "Date", apiKey: "created_at", sorting: isDataAvailable, sortBy: "desc", render: renderDate },
      { title: "Name", apiKey: "consumer", render: renderName },
      { title: "Amount", apiKey: "total", render: renderAmount },
      { title: "Payment", apiKey: "payment_status", render: renderPaymentStatus },
    ],
    data: data || [],
  };
  const redirectLink = (data) => {
    const orderId = data?.id ?? data?.order_number;
    router.push(`/order/details/${orderId}`);
  };
  return <ShowTable {...props} headerData={headerObj} redirectLink={redirectLink} tableClassName="recent-orders-table" />;
};

export default TableWrapper(RecentOrders);
