import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Btn from "../../../elements/buttons/Btn";
import useCreate from "../../../utils/hooks/useCreate";
import { OrderAPI } from "../../../utils/axiosUtils/API";

const PlaceOrder = ({ values, addToCartData }) => {
  const { t } = useTranslation("common");
  const router = useRouter();

  const itemsPayload = useMemo(() => {
    const sourceItems = addToCartData?.items?.length ? addToCartData.items : values?.products || [];
    return sourceItems
      .map((item) => ({
        product_id: item?.product_id ?? item?.product?.id,
        variant_id: item?.product_variant_id ?? item?.variant?.id ?? item?.variation_id ?? null,
        quantity: item?.quantity ?? 1,
      }))
      .filter((item) => item.product_id);
  }, [addToCartData?.items, values?.products]);

  const { mutate: createOrder, isLoading } = useCreate(
    OrderAPI,
    false,
    false,
    t("OrderCreatedSuccessfully") || "Order created successfully",
    (res) => {
      const id = res?.data?.data?.id;
      if (id) {
        router.push(`/order/details/${id}`);
      }
    }
  );

  const handleClick = () => {
    const payload = {
      consumer_id: values?.consumer_id,
      shipping_address_id: values?.shipping_address_id,

      // Fallback: if billing not selected, use shipping
      billing_address_id: values?.billing_address_id || values?.shipping_address_id,

      payment_method: values?.payment_method,
      coupon_code: values?.coupon || null,
      customer_notes: values?.customer_notes || null,
      items: itemsPayload,
    };

    createOrder(payload);
  };

  const disabled =
    !values?.consumer_id ||
    !values?.shipping_address_id ||
    !values?.payment_method ||
    !itemsPayload.length ||
    isLoading;

  return (
    <Btn className="btn btn-theme payment-btn mt-4" onClick={handleClick} disabled={disabled}>
      {t("PlaceOrder")}
    </Btn>
  );
};

export default PlaceOrder;
