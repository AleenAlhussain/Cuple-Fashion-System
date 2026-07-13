"use client";
import OrderEditPage from "@/components/orders/OrderEditPage";
import { useParams } from "next/navigation";

const OrderEdit = () => {
  const params = useParams();
  return params?.id && <OrderEditPage orderId={params.id} />;
};

export default OrderEdit;
