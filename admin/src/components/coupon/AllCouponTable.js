import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";

const AllCouponTable = ({ data, ...props }) => {
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);
  const headerObj = {
    checkBox: true,
    isOption: edit == false && destroy == false ? false : true,
    noEdit: edit ? false : true,
    isSerialNo: false,
    optionHead: { title: "Action" },
    column: [
      { title: "Code", apiKey: "code", sorting: true, sortBy: "desc" },
      { title: "Type", apiKey: "type", sorting: true, sortBy: "desc" },
      { title: "Value", apiKey: "value", sorting: true, sortBy: "desc" },
      { title: "Min Order", apiKey: "min_order_amount", sorting: false },
      { title: "Usage", apiKey: "usage_count", sorting: false },
      { title: "Start Date", apiKey: "start_date", sorting: true, sortBy: "desc", type: "date" },
      { title: "End Date", apiKey: "end_date", sorting: true, sortBy: "desc", type: "date" },
      { title: "Status", apiKey: "is_active", type: "switch" }
    ],
    data: data || []
  };
  if (!data) return null;
  return <>
    <ShowTable {...props} headerData={headerObj} />
  </>
};

export default TableWrapper(AllCouponTable);