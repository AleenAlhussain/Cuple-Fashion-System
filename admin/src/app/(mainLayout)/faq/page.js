'use client'
import { FaqAPI } from "@/utils/axiosUtils/API";
import { useState } from "react";
import { Col } from "reactstrap";
import AllFaqTable from "@/components/faq/index";

const FaqComponent = () => {
    const [isCheck, setIsCheck] = useState([]);
    return (
        <Col sm="12">
            <AllFaqTable url={FaqAPI} moduleName="Faq" isCheck={isCheck} setIsCheck={setIsCheck} />
        </Col>
    )
}
export default FaqComponent
