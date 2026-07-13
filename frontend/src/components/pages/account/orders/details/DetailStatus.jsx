import useAxios from "@/utils/api/helpers/useAxios";

import { showMonthWiseDate } from "@/utils/customFunctions/DateFormat";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import Image from "next/image";
import cancelledImage from "../../../../../../public/assets/svg/tracking/cancelled.svg";
import deliveredImage from "../../../../../../public/assets/svg/tracking/delivered.svg";
import outfordeliveryImage from "../../../../../../public/assets/svg/tracking/out-for-delivery.svg";
import pendingImage from "../../../../../../public/assets/svg/tracking/pending.svg";
import processingImage from "../../../../../../public/assets/svg/tracking/processing.svg";
import shippedImage from "../../../../../../public/assets/svg/tracking/shipped.svg";

const OrderStatusAPI = "/order-statuses";

const DetailStatus = ({ data }) => {
  const axios = useAxios();
  const { data: orderStatus } = useFetchQuery([OrderStatusAPI], () => axios({ url: OrderStatusAPI }), {
    enabled: true,
    refetchOnWindowFocus: false,
    select: (res) => res?.data?.data,
  });

  const imageObj = {
    pending: pendingImage,
    confirmed: processingImage,
    processing: processingImage,
    shipped: shippedImage,
    "out-for-delivery": outfordeliveryImage,
    outfordelivery: outfordeliveryImage,
    delivered: deliveredImage,
    cancelled: cancelledImage,
  };

  const ModifyWord = (value) => {
    return value
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getClassName = (elem) => {
    if ((elem?.sequence >= data?.order_status?.sequence && data?.order_status?.slug === "cancelled") || elem?.slug === "cancelled" || (data?.is_digital_only && (elem?.slug === "shipped" || elem?.slug === "out-for-delivery"))) {
      return "d-none";
    }
    if (elem?.sequence <= data?.order_status?.sequence) {
      return "active";
    }
    return "";
  };

  return (
    <div className="mb-4">
      <div className="tracking-panel">
        {data && !data?.sub_orders?.length ? (
          <ul>
            {orderStatus?.length > 0 &&
              orderStatus?.map((elem, i) => (
                <li key={i} className={getClassName(elem)}>
                  <div className="panel-content">
                    <div className="icon">
                      {elem?.slug && imageObj[elem?.slug] && (
                        <Image
                          src={imageObj[elem?.slug]}
                          className="img-fluid"
                          alt={elem?.slug}
                          height={44}
                          width={44}
                        />
                      )}
                    </div>
                    <div>
                      <div className="status">{ModifyWord(elem?.name)}</div>
                       <div className="panel-content">{showMonthWiseDate(data?.created_at)}</div>
                    </div>
                  </div>
                </li>
              ))}
            {data?.order_status?.slug === "cancelled" && (
              <li className="active cancelled-box">
                <div className="panel-content">
                  <div className="icon">
                    {imageObj[data?.order_status?.slug] && (
                      <Image
                        src={imageObj[data?.order_status?.slug] || cancelledImage}
                        className="img-fluid"
                        alt="image"
                        height={44}
                        width={44}
                      />
                    )}
                  </div>
                  <div className="status">{ModifyWord(data?.order_status.name)}</div>
                </div>
              </li>
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
};

export default DetailStatus;
