'use client'
import AllRefundTable from "@/components/refund/AllRefundTable";
import { RefundAPI } from "@/utils/axiosUtils/API";
import { Col } from "reactstrap";

const Refund = () => {
    return (
        <Col sm="12">
            <AllRefundTable onlyTitle={true} url={RefundAPI} moduleName="Refund" />
        </Col>
    );
}

export default Refund