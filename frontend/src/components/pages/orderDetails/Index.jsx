"use client";
import NoDataFound from "@/components/widgets/NoDataFound";
import WrapperComponent from "@/components/widgets/WrapperComponent";
import Loader from "@/layout/loader";
import useAxios from "@/utils/api/helpers/useAxios";

import Breadcrumb from "@/utils/commonComponents/breadcrumb";
import useFetchQuery from "@/utils/hooks/useFetchQuery";;
import { useRouter, useSearchParams } from "next/navigation";
import { Col, TabContent, TabPane } from "reactstrap";
import TrackOrderDetails from "./TrackOrderDetails";

const OrderDetailsTracking = () => {
  const search = useSearchParams();
  let orderNumber = search.get("order_number");
  let emailPhone = search.get("email_or_phone");

  const router = useRouter();
  const { data, isLoading } = useFetchQuery([TrackingAPI], () => axios({ url: TrackingAPI, params: { order_number: orderNumber, email_or_phone: emailPhone } }, router), {
    enabled: true,
    refetchOnWindowFocus: false,
    select: (res) => res?.data,
  });

  if (isLoading) return <Loader />;
  return (
    <>
      <Breadcrumb title={"OrderDetails"} subNavigation={[{ name: "OrderDetails" }]} />
      <WrapperComponent classes={{ sectionClass: "user-dashboard-section dashboard-section section-b-space", fluidClass: 'container' }} customCol={true}>
        <div className="faq-content">
          <div className="tab-pane">
            <Col xxl={12} lg={8}>
              {data ? (
                <div className="dashboard-right-sidebar">
                  <TabContent>
                    <TabPane className="show active">
                      <TrackOrderDetails data={data} isLoading={isLoading} orderNumber={orderNumber} />
                    </TabPane>
                  </TabContent>
                </div>
              ) : (
                <NoDataFound customClass="no-data-added" imageUrl={`/assets/svg/empty-items.svg`} title="NoOrderFound" height="300" width="300" />
              )}
            </Col>
          </div>
        </div>
      </WrapperComponent>
    </>
  );
};

export default OrderDetailsTracking;
