'use client'
import AllExchangeTable from "@/components/exchange/AllExchangeTable";
import { ExchangeAPI } from "@/utils/axiosUtils/API";
import { Col } from "reactstrap";

const Exchange = () => {
    return (
        <Col sm="12">
            <AllExchangeTable onlyTitle={true} url={ExchangeAPI} moduleName="Exchange" />
        </Col>
    );
}

export default Exchange
