'use client'
import AllCouponTable from "@/components/coupon/AllCouponTable";
import { coupon } from "@/utils/axiosUtils/API";
import { useState } from "react";
import { Col } from "reactstrap";

const AllCoupon = () => {
  const [isCheck, setIsCheck] = useState([]);
  return (
    <Col sm="12">
      <AllCouponTable url={coupon} moduleName="Coupon" isCheck={isCheck} setIsCheck={setIsCheck} />
    </Col>
  );
};

export default AllCoupon;
