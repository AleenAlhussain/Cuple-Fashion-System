import React, { useEffect } from "react";
import { useSettings } from "@/utils/hooks/useSettings";

const DeliverySection = ({ setFieldValue }) => {
  const { settingData } = useSettings();

  useEffect(() => {
    const title = settingData?.delivery?.default?.title;
    const desc = settingData?.delivery?.default?.description;

    if (title && desc) {
      setFieldValue("delivery_description", `${title} | ${desc}`);
      setFieldValue("isTimeSlot", false);
      setFieldValue("delivery_interval", null);

      // ✅ Force provider to Aramex (hidden)
      setFieldValue("shipping_provider", "aramex");
      setFieldValue("shipping_service", "DOM"); // مثال: DOM أو Express حسب ما بدك
    }
  }, [settingData, setFieldValue]);

  return null;
};

export default DeliverySection;
