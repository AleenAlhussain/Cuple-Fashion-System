"use client";
import CouponForm from "@/components/coupon/CouponForm";
import { coupon } from "@/utils/axiosUtils/API";
import useUpdate from "@/utils/hooks/useUpdate";
import { useParams } from "next/navigation";

const CouponUpdate = () => {
  const params = useParams();
  const { mutate, isLoading } = useUpdate(coupon, params?.updateId, coupon);

  return params?.updateId && <CouponForm mutate={mutate} updateId={params?.updateId} loading={isLoading} title={"UpdateCoupon"} buttonName="Update" />;
};

export default CouponUpdate;
