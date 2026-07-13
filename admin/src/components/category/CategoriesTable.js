import Image from "next/image";
import { dateFormat } from "../../utils/customFunctions/DateFormat";
import TableWrapper from "../../utils/hoc/TableWrapper";
import ShowTable from "../table/ShowTable";

const AllCategoriesTable = ({ data, ...props }) => {
  const formatData = (data) => {
    return data.map((item) => ({
      id: item.id,
      Name: item.name,
      Image: <Image src={item.media?.filter((item) => item.collection_name == "image")[0]?.original_url || "/assets/images/placeholder.png"} height="100" width="100" alt={item.name} />,
      Icon: <Image src={item.media?.filter((item) => item.collection_name == "icon")[0]?.original_url || "/assets/images/placeholder.png"} height="100" width="100" alt={item.name} />,
      CreateAt: dateFormat(item.created_at),
      status: item.status,
    }));
  };
  if (!data) return null;
  return <ShowTable {...props} data={formatData(data)} />;
};

export default TableWrapper(AllCategoriesTable);
