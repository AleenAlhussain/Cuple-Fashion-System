import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";

const AllPromoGroupsTable = ({ data, ...props }) => {
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);
  const headerObj = {
    checkBox: true,
    isOption: edit == false && destroy == false ? false : true,
    noEdit: edit ? false : true,
    isSerialNo: false,
    optionHead: { title: "Action" },
    column: [
      { title: "Name", apiKey: "name", sorting: true, sortBy: "desc" },
      { title: "Name (AR)", apiKey: "name_ar" },
      { title: "SKUs Count", apiKey: "variants_count", type: "badge", badgeColor: "primary" },
      { title: "Created At", apiKey: "created_at", sorting: true, sortBy: "desc", type: "date" },
      { title: "Status", apiKey: "is_active", type: "switch" },
    ],
    data: data || [],
  };

  if (!data) return null;

  return (
    <>
      <ShowTable {...props} headerData={headerObj} />
    </>
  );
};

export default TableWrapper(AllPromoGroupsTable);
