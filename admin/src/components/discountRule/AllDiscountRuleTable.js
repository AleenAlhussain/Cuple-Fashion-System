import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";

const AllDiscountRuleTable = ({ data, ...props }) => {
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);

  const headerObj = {
    checkBox: true,
    isOption: edit === false && destroy === false ? false : true,
    noEdit: edit ? false : true,
    isSerialNo: false,
    optionHead: { title: "Action" },
    editRedirect: "offers/discount-rules",
    column: [
      { title: "Name", apiKey: "name", sorting: true, sortBy: "desc" },
      { title: "Type", apiKey: "rule_type", sorting: true, sortBy: "desc" },
      { title: "Discount", apiKey: "discount_display", sorting: false },
      { title: "Start Date", apiKey: "starts_at", sorting: true, sortBy: "desc", type: "date" },
      { title: "End Date", apiKey: "ends_at", sorting: true, sortBy: "desc", type: "date" },
      { title: "Usage", apiKey: "current_usage", sorting: false },
      { title: "Status", apiKey: "is_active", type: "switch" }
    ],
    data: data || []
  };

  if (!data) return null;

  return (
    <ShowTable
      {...props}
      headerData={headerObj}
    />
  );
};

export default TableWrapper(AllDiscountRuleTable);
