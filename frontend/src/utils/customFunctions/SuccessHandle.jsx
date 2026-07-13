import MessageCreate from "./MessageCreate";
import { ToastNotification } from "./ToastNotification";

const SuccessHandle = (resData, router, path, message, setCouponError, pathName,setShowBoxMessage) => {
  if (resData.status === 201 || resData.status === 200) {
    path && router && router.push(path ? path : pathName.slice(0, pathName.slice(1).indexOf("/") + 1));
    {
      message !== 'No' && ToastNotification("success", message ? message : (router && MessageCreate(pathName)));
    }
  } else if (resData.response?.data?.message || resData?.data?.errors?.[0]?.message) {
    const errorMsg = resData.response?.data?.message || resData?.data?.errors?.[0]?.message;
    setCouponError && setCouponError(errorMsg);
    if (message !== 'No') {
      ToastNotification("error", errorMsg);
    }
    setShowBoxMessage && setShowBoxMessage(errorMsg);
  } else { message !== 'No' && ToastNotification("error"); }
};

export default SuccessHandle;
