export const filterPills = [
  {
    label: "Pending",
    value: "pending",
    countKey: "total_pending_orders",
    color: 'pending',
  },
  {
    label: "Confirmed",
    value: "confirmed",
    countKey: "total_confirmed_orders",
    color: 'confirmed',
  },
  {
    value: "processing",
    label: "Processing",
    countKey: "total_processing_orders",
    color: 'processing',
  },
  {
    value: "cancelled",
    label: "Cancelled",
    countKey: "total_cancelled_orders",
    color: 'cancel',
  },
  {
    value: "shipped",
    label: "Shipped",
    countKey: "total_shipped_orders",
    color: 'shipped',
  },
  {
    value: "out-for-delivery",
    label: "Out for delivery",
    countKey: "total_out_of_delivery_orders",
    color: 'out-delivery',
  },
  {
    value: "delivered",
    label: "Delivered",
    countKey: "total_delivered_orders",
    color: 'completed',
  },
  {
    value: "trashed",
    label: "Trash",
    countKey: "total_trashed_orders",
    color: 'trash',
  },
];
