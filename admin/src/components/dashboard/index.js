import ProductStockReportTable from "./productStockReport/ProductStockReportTable";
import RecentOrderTable from "./recentOrders/RecentOrderTable";
import TopDashSection from "./TopDashSection";

const MainDashboard = () => {
  return (
    <>
      <TopDashSection   />
      <section>
        <RecentOrderTable />
        <ProductStockReportTable  />
      </section>
    </>
  );
};

export default MainDashboard;
