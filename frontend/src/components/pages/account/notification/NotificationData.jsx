import Link from "next/link";
import NoDataFound from "@/components/widgets/NoDataFound";
import Loader from "@/layout/loader";
import useAxios from "@/utils/api/helpers/useAxios";
import { showMonthWiseDateAndTime } from "@/utils/customFunctions/DateFormat";
import useFetchQuery from "@/utils/hooks/useFetchQuery";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiTimeLine } from "react-icons/ri";
import { Card, CardBody } from "reactstrap";
import AccountHeading from "../common/AccountHeading";
import GiftBoxModal from "@/components/giftBox/GiftBoxModal";
import { placeHolderImage } from "@/components/widgets/Placeholder";
import { useAuthState, useCartState, useGiftBoxState } from "@/states";
import Image from "next/image";

const NotificationAPI = "/notifications";
const FILTER_TABS = [
  { key: "all", label: "FilterAll" },
  { key: "offers", label: "FilterOffers" },
  { key: "orders", label: "FilterOrders" },
  { key: "refunds", label: "FilterRefunds" },
  { key: "exchanges", label: "FilterExchanges" },
];

const STATUS_VARIANTS = [
  {
    matcher: (context) => /refund|return/.test(context),
    icon: "💳",
    color: "#1e6cf5",
  },
  {
    matcher: (context) => /exchange/.test(context),
    icon: "💳",
    color: "#1e6cf5",
  },
  {
    matcher: (context) => /approved|completed/.test(context),
    icon: "✔️",
    color: "#3eb65c",
  },
  {
    matcher: (context) => /submitted|pending|processing/.test(context),
    icon: "⏳",
    color: "#f5a623",
  },
  {
    matcher: (context) => /rejected|declined|failed/.test(context),
    icon: "❌",
    color: "#d64545",
  },
];

const DEFAULT_VARIANT = {
  icon: "ℹ️",
  color: "var(--theme-color)",
};

const getContextFromNotification = (notification) => {
  const pieces = [
    notification?.data?.status,
    notification?.data?.title,
    notification?.data?.message,
  ];
  return pieces.filter(Boolean).join(" ").toLowerCase();
};

const getStatusVariant = (notification) => {
  const context = getContextFromNotification(notification);
  return STATUS_VARIANTS.find((variant) => variant.matcher(context)) ?? DEFAULT_VARIANT;
};

const capitalizeWords = (value) =>
  value
    ? value
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ")
    : "";

const formatStatusText = (notification) => {
  if (notification?.type === "discount_offer" && notification?.data?.rule_name) {
    return notification.data.rule_name;
  }
  const rawStatus = notification?.data?.status;
  if (rawStatus) return capitalizeWords(rawStatus);
  if (notification?.data?.title) {
    return notification.data.title;
  }
  if (notification?.data?.message) {
    return notification.data.message;
  }
  return "Updated";
};

const getOrderKey = (notification) => {
  const orderNumber =
    notification?.data?.order_number ??
    notification?.data?.order?.order_number ??
    notification?.data?.order?.number;
  return orderNumber ? `order-${orderNumber}` : `notification-${notification?.id}`;
};

const getOrderNumber = (notification) =>
  notification?.data?.order_number ??
  notification?.data?.order?.order_number ??
  notification?.data?.order?.number;

const getProductName = (notification) =>
  notification?.data?.product_name ??
  notification?.data?.product_title ??
  notification?.data?.product?.name ??
  notification?.data?.product?.title;

const getNotificationCategory = (notification) => {
  const context = getContextFromNotification(notification);
  if (notification?.type === "discount_offer" || context.includes("offer")) return "offers";
  if (context.includes("exchange")) return "exchanges";
  if (context.includes("refund") || context.includes("return")) return "refunds";
  return "orders";
};

const NotificationData = () => {
  const { t } = useTranslation("common");
  const [filter, setFilter] = useState("all");
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const { token, user } = useAuthState();
  const { offer, selection, has_used_offer_before, setSelection } = useGiftBoxState();
  const applyGiftBoxSelection = useCartState((state) => state.applyGiftBoxSelection);
  const axios = useAxios();
  const {
    data,
    isLoading,
    refetch,
  } = useFetchQuery(
    [NotificationAPI],
    () => axios({ url: NotificationAPI }),
    {
      enabled: true,
      refetchOnWindowFocus: false,
      select: (res) => res?.data?.data,
    }
  );

  const filteredNotifications = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((notification) => getNotificationCategory(notification) === filter);
  }, [data, filter]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map();
    filteredNotifications.forEach((notification) => {
      const key = getOrderKey(notification);
      groups.set(key, [...(groups.get(key) ?? []), notification]);
    });
    const result = Array.from(groups.values()).map((group) =>
      group
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    );
    result.sort(
      (a, b) => new Date(b[0].created_at) - new Date(a[0].created_at)
    );
    return result;
  }, [filteredNotifications]);

  const unreadCount = useMemo(
    () => data?.filter((notification) => !notification.read_at).length ?? 0,
    [data]
  );

  const handleMarkAllAsRead = async () => {
    if (!data?.length) return;
    const unreadIds = data.filter((notification) => !notification.read_at).map((notification) => notification.id);
    if (!unreadIds.length) return;
    setIsMarkingAll(true);
    try {
      await axios.put("/notifications/mark-as-read", {
        ids: unreadIds,
      });
      refetch();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const isGiftBoxActive =
    Boolean(offer?.offer_id) && Boolean(offer?.is_active);

  const giftStatusLabel =
    selection?.status === "applied" ? t("Applied") : t("WaitingForCheckout");

  const handleGiftConfirm = async ({ categoryId, productId }) => {
    if (!token || !offer?.offer_id) return;
    try {
      const response = await axios({
        url: "/gift-box/select",
        method: "post",
        data: {
          offer_id: offer.offer_id,
          category_id: categoryId,
          product_id: productId,
        },
      });

      if (response?.status === 200 || response?.status === 201) {
        const payload = response?.data?.data;
        if (payload) {
          setSelection(payload);
          applyGiftBoxSelection();
        }
      }
    } finally {
      setShowGiftModal(false);
    }
  };

  if (isLoading)
    return (
      <div className="box-loader">
        <Loader classes={"blur-bg"} />
      </div>
    );

  return (
    <Card className="mt-0 notification-card-wrap">
      <CardBody>
        <div className="notification-page-head">
          <AccountHeading title="Notifications" classes={"top-sec"} />
          <div className="notification-toolbar">
            <div className="notification-filters">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`notification-filter ${filter === tab.key ? "is-active" : ""}`}
                  onClick={() => setFilter(tab.key)}
                  type="button"
                >
                  {t(tab.label)}
                </button>
              ))}
            </div>
            {Boolean(unreadCount) && (
              <button
                className="notification-mark-read"
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
              >
                {t("MarkAllAsRead")}
              </button>
            )}
          </div>
        </div>

        {isGiftBoxActive && user && (
          <div className="giftbox-notification">
            <div className="counter-box giftbox-card">
              <div className="giftbox-card__media">
                <Image
                  src={
                    selection?.product?.product_thumbnail?.original_url ||
                    selection?.product?.primary_image ||
                    placeHolderImage
                  }
                  alt={selection?.product?.name || "Gift Box item"}
                  width={72}
                  height={72}
                />
              </div>
              <div className="giftbox-card__content">
                <span className="giftbox-badge">{t("GiftBox")}</span>
                <h5>{selection?.product?.name || t("SelectedItem")}</h5>
                {selection ? (
                  <p className="giftbox-status">{giftStatusLabel}</p>
                ) : (
                  <p className="giftbox-status">{t("PickYourGift")}</p>
                )}
                {selection?.discount_value != null && (
                  <p className="giftbox-discount">
                    {selection?.discount_type === "percentage"
                      ? `${selection.discount_value}% ${t("Discount").toLowerCase()}`
                      : selection?.discount_type === "fixed"
                      ? `${selection.discount_value} AED ${t("Discount").toLowerCase()}`
                      : `${t("SpecialPrice")} ${selection.discount_value} AED`}
                  </p>
                )}
              </div>
              {!selection && !has_used_offer_before && (
                <div className="giftbox-card__action">
                  <button
                    className="notification-mark-read"
                    type="button"
                    onClick={() => setShowGiftModal(true)}
                  >
                    {t("PickYourGift")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {groupedNotifications.length ? (
          <div className="notification-feed">
            {groupedNotifications.map((group) => {
              const latestNotification = group[0];
              const variant = getStatusVariant(latestNotification);
              const isUnread = group.some((notification) => !notification.read_at);
              const statusText = formatStatusText(latestNotification);
              const orderNumber = getOrderNumber(latestNotification);
              const productName = getProductName(latestNotification);
              const timelineSteps = group.slice(0, 3);

              const previousStatuses = group
                .slice(1, 4)
                .map((notification) => formatStatusText(notification));

              return (
                <article
                  key={getOrderKey(latestNotification)}
                  className={`notification-card ${isUnread ? "unread" : ""}`}
                >
                  <div className="notification-card__icon-wrapper">
                    <span
                      className="notification-card__icon"
                      style={{ backgroundColor: variant.color }}
                    >
                      {variant.icon}
                    </span>
                    <span className="notification-card__vertical-line" />
                  </div>
                  <div className="notification-card__content">
                    <div className="notification-card__header">
                      <h4>
                        {orderNumber
                          ? `${t("Order")} #${orderNumber} ${statusText}`
                          : statusText}
                      </h4>
                      <span className="notification-card__timestamp">
                        <RiTimeLine /> {showMonthWiseDateAndTime(latestNotification?.created_at)}
                      </span>
                    </div>
                    <div className="notification-card__details">
                      {latestNotification?.data?.title && (
                        <p className="notification-card__brief">{latestNotification.data.title}</p>
                      )}

                      {productName && (
                        <p className="notification-card__product">{productName}</p>
                      )}

                      {previousStatuses.length > 0 && (
                        <p className="notification-card__previous">
                          {`${t("Previously") || "Previously"}: ${previousStatuses.join(" • ")}`}
                        </p>
                      )}
                    </div>

                    <div className="notification-card__timeline">
                      {timelineSteps.map((step, index) => (
                        <span
                          key={`${step.id}-${index}`}
                          className="notification-card__timeline-step"
                        >
                          <span
                            className="notification-card__timeline-dot"
                            style={{
                              backgroundColor:
                                index === 0 ? variant.color : "#c7c7c7",
                            }}
                          />
                          <span>{formatStatusText(step)}</span>
                        </span>
                      ))}
                    </div>

                    {latestNotification?.data?.link && (
                      <Link
                        className="notification-card__link"
                        href={latestNotification.data.link}
                      >
                        {t("ViewDetails")}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <NoDataFound
            imageUrl={`/assets/svg/empty-items.svg`}
            customClass="no-data-added"
            title="NoNotificationsFound"
            description="NoNotificationDescription"
            height="300"
            width="300"
          />
        )}
      </CardBody>
      {isGiftBoxActive && (
        <GiftBoxModal
          isOpen={showGiftModal}
          offer={offer}
          onClose={() => setShowGiftModal(false)}
          onConfirm={handleGiftConfirm}
        />
      )}
    </Card>
  );
};

export default NotificationData;
