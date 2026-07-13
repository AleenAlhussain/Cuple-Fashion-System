import { Approved, store } from "../../utils/axiosUtils/API";
import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";

const AllRoles = ({ data, ...props }) => {
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);
  const headerObj = {
    checkBox: true,
    isSerialNo: false,
    isOption: edit == false && destroy == false ? false : true,
    noEdit: edit ? false : true,
    optionHead: { title: "Action" ,show:"seller/store" },
    column: [
      { title: "Logo", apiKey: "store_logo", type: 'image',NameWithRound: true},
      { title: "StoreName", apiKey: "store_name", sorting: true, sortBy: "desc" },
      { title: "Name", apiKey: "name" },
      { title: "CreateAt", apiKey: "created_at", sorting: true, sortBy: "desc", type: "date" },
      { title: "Approved", apiKey: "is_approved", type: 'switch', url: `${store}${Approved}` }
    ],
    data: data || []
  };
  headerObj.data.filter((element) => element.name = element?.vendor?.name)
  if (!data) return null;

  return <>
    <ShowTable {...props} headerData={headerObj} />
  </>
};

export default TableWrapper(AllRoles);
