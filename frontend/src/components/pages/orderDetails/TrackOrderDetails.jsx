import Loader from "@/layout/loader";
import ConsumerDetails from "./common/ConsumerDetails";
import StatusDetail from "./common/StatusDetails";
import SubTable from "./common/SubTable";
import TableDetails from "./common/TableDetails";
import TitleDetails from "./common/TitleDetails";

const TrackOrderDetails = ({ data,isLoading, orderNumber }) => {
  
  if (isLoading) return <Loader />;
  return (
    <>
      <TitleDetails params={orderNumber} data={data} />
      <StatusDetail data={data} />
      <TableDetails data={data} />
      <ConsumerDetails data={data} />
      {data?.sub_orders?.length ? <SubTable data={data?.sub_orders} /> : null}
      
    </>
  );
};

export default TrackOrderDetails;
