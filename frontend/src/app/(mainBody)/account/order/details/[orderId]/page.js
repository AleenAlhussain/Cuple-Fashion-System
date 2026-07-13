'use client'
import OrderDetailsContain from "@/components/pages/account/orders/details";
import { useParams } from "next/navigation";

const OrderDetails = () => {
  const params = useParams()
  return <>{params?.orderId && <OrderDetailsContain params={params?.orderId} />}</>;
};

export default OrderDetails;
