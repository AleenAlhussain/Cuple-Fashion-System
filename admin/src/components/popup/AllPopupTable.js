import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";
import usePermissionCheck from "../../utils/hooks/usePermissionCheck";

const AllPopupTable = ({ data, ...props }) => {
  const [edit, destroy] = usePermissionCheck(["edit", "destroy"]);

  // Map popup types to readable labels
  const getTypeLabel = (type) => {
    const types = {
      'collection': 'New Collection',
      'offer': 'Special Offer',
      'coupon': 'Coupon',
      'newsletter': 'Newsletter'
    };
    return types[type] || type;
  };

  // Transform data to add readable type labels
  const transformedData = data?.map(item => ({
    ...item,
    type_label: getTypeLabel(item.type)
  })) || [];

  const headerObj = {
    checkBox: true,
    isOption: edit === false && destroy === false ? false : true,
    noEdit: edit ? false : true,
    isSerialNo: false,
    optionHead: { title: "Action" },
    column: [
      { title: "Title", apiKey: "title", sorting: true, sortBy: "desc" },
      { title: "Type", apiKey: "type_label", sorting: false },
      { title: "Display", apiKey: "display_frequency", sorting: false },
      { title: "Delay (sec)", apiKey: "delay_seconds", sorting: false },
      { title: "Priority", apiKey: "priority", sorting: true, sortBy: "desc" },
      { title: "Start Date", apiKey: "start_date", sorting: true, sortBy: "desc", type: "date" },
      { title: "End Date", apiKey: "end_date", sorting: true, sortBy: "desc", type: "date" },
      { title: "Status", apiKey: "is_active", type: "switch" }
    ],
    data: transformedData
  };

  if (!data) return null;

  return (
    <ShowTable {...props} headerData={headerObj} />
  );
};

export default TableWrapper(AllPopupTable);
