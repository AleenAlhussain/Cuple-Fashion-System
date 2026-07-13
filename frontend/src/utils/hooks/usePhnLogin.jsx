import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import useAxios from "@/utils/api/helpers/useAxios";
import { LoginPhnAPI } from "@/utils/constants";

const onlyDigits = (value) => (value ?? "").toString().replace(/\D+/g, "");

const buildWhatsappPhone = (countryCodeValue, phoneValue) => {
  const countryCode = onlyDigits(countryCodeValue);
  let phone = onlyDigits(phoneValue);

  if (!phone) {
    return { country_code: countryCode, phone: "" };
  }

  if (phone.startsWith("00")) {
    phone = phone.slice(2);
  }

  if (countryCode && phone.startsWith(countryCode)) {
    phone = phone.slice(countryCode.length);
  }

  phone = phone.replace(/^0+/, "");
  const fullPhone = countryCode ? `${countryCode}${phone}` : phone;

  return {
    country_code: countryCode,
    phone: fullPhone,
  };
};

const useHandlePhnLogin = (setShowBoxMessage, setState) => {
  const axios = useAxios();

  return useMutation({
    mutationFn: (data) => {
      const payload = buildWhatsappPhone(data?.country_code, data?.phone);
      return axios({ url: LoginPhnAPI, method: "post", data: payload });
    },
    onSuccess: (responseData, requestData = {}) => {
      if (responseData?.status === 200 || responseData?.status === 201) {
        const payload = buildWhatsappPhone(requestData?.country_code, requestData?.phone);
        Cookies.remove("ue");
        Cookies.set("uc", payload.country_code || "");
        Cookies.set("up", payload.phone || "");
        Cookies.set("upts", String(Date.now()));
        setState("otp");
        return;
      }

      setShowBoxMessage(responseData?.data?.message || "Unable to send WhatsApp code right now.");
    },
    onError: (error) => {
      const message = error?.response?.data?.message || "Unable to send WhatsApp code right now.";
      setShowBoxMessage(message);
    },
  });
};

export default useHandlePhnLogin;
