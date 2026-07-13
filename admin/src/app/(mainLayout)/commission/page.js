'use client'
import { Col } from "reactstrap"
import { commissions } from "@/utils/axiosUtils/API"
import AllCommissionTable from "@/components/commission"

const Commission = () => {
    return (
        <Col sm="12">
            <AllCommissionTable moduleName="Commission" url={commissions} dateRange={true} />
        </Col>
    )
}

export default Commission