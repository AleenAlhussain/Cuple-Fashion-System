"use client";
import OrderDetailsContain from "@/components/orders/details";
import { useParams } from "next/navigation";

const OrderDetails = () => {
  const params = useParams();
  return params?.updateId && <OrderDetailsContain updateId={params?.updateId} />;
};

export default OrderDetails;
