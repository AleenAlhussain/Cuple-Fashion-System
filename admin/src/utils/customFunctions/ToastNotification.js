import { toast } from "react-toastify";

export const ToastNotification = (type, message, options = {}) => {
  switch (type) {
    case "success":
      toast.success(message, options);
      break;
    case "error":
      toast.error(
        message || "Something went wrong , check api integration",
        options
      );
      break;
    case "warn":
      toast.warn(message, options);
      break;
    case "info":
      toast.info(message, options);
      break;
    default:
      toast(message, options);
  }
  return true;
};
