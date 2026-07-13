import { useRouter } from "next/navigation";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RiTimeLine } from "react-icons/ri";
import BadgeContext from "../../helper/badgeContext";
import request from "../../utils/axiosUtils";
import { NotificationsAPI } from "../../utils/axiosUtils/API";
import { dateFormat } from "../../utils/customFunctions/DateFormat";
import Loader from "../commonComponent/Loader";
import useCustomQuery from "@/utils/hooks/useCustomQuery";

const NotificationsData = () => {
  const router = useRouter();
  const { t } = useTranslation("common");
  const { setNotification } = useContext(BadgeContext);
  const { data, isLoading, refetch } = useCustomQuery([NotificationsAPI], () => request({ url: NotificationsAPI }, router), { enabled: false, select: (res) => res.data.data });
  useEffect(() => {
    refetch();
    setNotification(null);
  }, []);
  if (isLoading) return <Loader />;
  return (
    <ul className="notification-setting">
      {data?.map((notification, index) => (
        <li key={index} className={!notification.read_at ? "unread" : ""}>
          <h4>{t(notification.data.message)}</h4>
          <h5>
            <RiTimeLine /> {dateFormat(notification.created_at)}
          </h5>
        </li>
      ))}
    </ul>
  );
};

export default NotificationsData;
