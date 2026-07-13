import { useEffect, useState } from 'react';
import { Col, Row } from 'reactstrap';
import request from '../../../utils/axiosUtils';
import { OrderAPI, OrderStatusAPI } from '../../../utils/axiosUtils/API';
import useCreate from '../../../utils/hooks/useCreate';
import usePermissionCheck from '../../../utils/hooks/usePermissionCheck';
import Loader from '../../commonComponent/Loader';
import OrderDetailsTable from './OrderDetailsTable';
import OrderNumberTable from './OrderNumberTable';
import RightSidebar from './RightSidebar';
import TrackingPanel from './TrackingPanel';
import { useTranslation } from "react-i18next";
import { useRouter } from 'next/navigation';
import useCustomQuery from '@/utils/hooks/useCustomQuery';

const OrderDetailsContain = ({ updateId }) => {
    const { t } = useTranslation('common');
    const [edit] = usePermissionCheck(["edit"]);
    const [orderStatus, setOrderStatus] = useState("")
    const router = useRouter()

    // Getting Data from Order API for Order_Number
    const { data, isLoading, refetch } = useCustomQuery(["order/" + updateId], () => request({ url: `${OrderAPI}/${updateId}` }, router), { refetchOnWindowFocus: false, select: (res) => { return res.data?.data } });

    // Getting Data from Order Status API
    const { data: orderStatusData, refetch: orderStatusRefetch, isLoading: orderStatusLoader } = useCustomQuery([OrderStatusAPI], () => request({ url: OrderStatusAPI }, router), { enabled: false, refetchOnWindowFocus: false, select: (data) => data?.data?.data });

    // Update Status in Order API
    const { data: orderStatusUpdate, mutate } = useCreate(OrderAPI, data?.id, false, "No");

    useEffect(() => {
        if (data) {
            setOrderStatus(data?.order_status)
        }
    }, [isLoading])

    useEffect(() => {
        refetch()
        orderStatusRefetch()
    }, [])
    useEffect(() => {
        if (!isLoading && !data) {
            router.push('/404')
        }
    }, [isLoading, data])

    if (isLoading || orderStatusLoader) return <Loader />;
    return (
        <Row className='pb-4'>
            <Col xxl="9">
                {!data?.sub_orders?.length > 0 && <div className="mb-4">
                    <div className="tracking-panel">
                        <TrackingPanel order={data} orderStatusData={orderStatusData} orderStatus={orderStatus} mutate={mutate} />
                    </div>
                </div>}
                <Col sm="12">
                    <OrderNumberTable refetch={refetch} moduleName={`${t('OrderNumber')}: #${data?.order_number}`} data={data} orderStatusData={orderStatusData} setOrderStatus={setOrderStatus} orderStatus={orderStatus} mutate={mutate} orderStatusUpdate={orderStatusUpdate} edit={edit} />
                </Col>
                {data?.sub_orders?.length > 0 &&
                    <Col sm="12">
                        <OrderDetailsTable moduleName={`OrderDetails`} data={data} />
                    </Col>
                }
            </Col>
            <Col xxl="3">
                <RightSidebar data={data} />
            </Col>
        </Row>
    )
}

export default OrderDetailsContain