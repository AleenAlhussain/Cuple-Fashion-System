"use client";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RiWhatsappFill } from "react-icons/ri";
import { DETECTION_LABELS, detectInputType, formatDateTime } from "@/utils/tracking/flow";

// TEMPORARY: chatbot icon replaced with a direct WhatsApp link.
// Flip back to false to restore the tracking chatbot widget.
const SHOW_WHATSAPP_INSTEAD_OF_CHATBOT = true;

const CHAT_COPY = {
  languagePrompt: {
    en: "Please choose your language to start chatting.",
    ar: "يرجى اختيار لغتك لبدء المحادثة.",
  },
  trackTitle: {
    en: "Track status",
    ar: "تحقق من حالة الشحنة",
  },
  trackDescription: {
    en: "Enter your AWB, order number, or UAE mobile to view the latest status.",
    ar: "أدخل رقم AWB أو رقم الطلب أو رقم الجوال الإماراتي لتعرف آخر حالة.",
  },
  trackLabel: {
    en: "Enter AWB, Order Number, or Mobile",
    ar: "اكتب رقم التتبع (AWB) أو رقم الطلب أو رقم الجوال",
  },
  trackPlaceholder: {
    en: "AWB: 48666535024 | Order: #12345 | Mobile: 05xxxxxxxx",
    ar: "AWB: 48666535024 | طلب: #12345 | جوال: 05xxxxxxxx",
  },
  trackExamples: {
    en: "Examples: AWB 48666535024, Order #12345, Mobile 05xxxxxxxx.",
    ar: "أمثلة: AWB 48666535024، طلب #12345، جوال 05xxxxxxxx.",
  },
  trackButton: {
    en: "Track status",
    ar: "تحقق من الحالة",
  },
  invalidInput: {
    en: "Please enter a valid AWB, order number, or UAE mobile.",
    ar: "يرجى إدخال رقم AWB أو طلب أو جوال إماراتي صالح.",
  },
  resolverError: {
    en: "Unable to resolve that entry. Please check the value and try again.",
    ar: "تعذر التحقق من البيانات المدخلة؛ الرجاء التأكد وإعادة المحاولة.",
  },
  lookUpLoading: {
    en: "Resolving your entry...",
    ar: "جارٍ التحقق من الإدخال...",
  },
  moreOrdersHint: {
    en: "Showing the three most recent shipments for this number.",
    ar: "نعرض أحدث ثلاثة شحنات مرتبطة بهذا الرقم.",
  },
  tryAgainLater: {
    en: "Try again later",
    ar: "أعد المحاولة لاحقًا",
  },
  contactSupport: {
    en: "Contact customer service",
    ar: "تواصل مع خدمة العملاء",
  },
  refundCta: {
    en: "Request refund",
    ar: "طلب استرجاع",
  },
  exchangeCta: {
    en: "Request exchange",
    ar: "طلب تبديل",
  },
  supportCta: {
    en: "Contact customer service",
    ar: "تواصل مع خدمة العملاء",
  },
  etaButton: {
    en: "When will it arrive",
    ar: "متى يوصل؟",
  },
  etaHintPrefix: {
    en: "Last update",
    ar: "آخر تحديث",
  },
  etaHintFallback: {
    en: "Tracking updates will appear here as soon as we hear from the carrier.",
    ar: "سيتم عرض التحديثات حالما يصلنا رد من الناقل.",
  },
  lastUpdateUnavailable: {
    en: "Last update unavailable",
    ar: "آخر تحديث غير متاح",
  },
  trackingNotFound: {
    en: "No tracking result was found for that entry.",
    ar: "لم يتم العثور على بيانات تتبع لهذا المدخل.",
  },
  trackingFetchError: {
    en: "Failed to fetch tracking details. Please try again.",
    ar: "فشل جلب بيانات التتبع. يرجى المحاولة لاحقاً.",
  },
  awbLabel: {
    en: "AWB",
    ar: "رقم التتبع",
  },
  orderLabel: {
    en: "Order",
    ar: "رقم الطلب",
  },
  statusLabel: {
    en: "Status",
    ar: "الحالة",
  },
  lastUpdateLabel: {
    en: "Last update",
    ar: "آخر تحديث",
  },
  chatTitle: {
    en: "Chat with Cuple",
    ar: "تواصل مع كابلي",
  },
  supportWhatsAppText: {
    en: "Hello, I need help with my order.",
    ar: "مرحبا، أحتاج مساعدة بخصوص طلبي.",
  },
};

const SUPPORT_WHATSAPP_NUMBER = "971504673789";

const Chatbot = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLanguage, setChatLanguage] = useState(null);
  const [queryValue, setQueryValue] = useState("");
  const [detectedType, setDetectedType] = useState(null);
  const [inputError, setInputError] = useState("");
  const [resolverMessage, setResolverMessage] = useState("");
  const [resolverChoices, setResolverChoices] = useState([]);
  const [resolverHasMore, setResolverHasMore] = useState(false);
  const [resolverLoading, setResolverLoading] = useState(false);
  const [resolverErrorCode, setResolverErrorCode] = useState("");
  const [trackingAwb, setTrackingAwb] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [resolvedOrder, setResolvedOrder] = useState(null);
  const [showEtaHint, setShowEtaHint] = useState(false);

  const { t } = useTranslation("common");
  const locale = chatLanguage === "ar" ? "ar" : "en";

  const getCopy = useCallback(
    (key) => {
      const copy = CHAT_COPY[key];
      if (!copy) return "";
      return chatLanguage === "ar" ? copy.ar || copy.en : copy.en;
    },
    [chatLanguage]
  );

  const resetFlow = useCallback(() => {
    setQueryValue("");
    setDetectedType(null);
    setInputError("");
    setResolverMessage("");
    setResolverChoices([]);
    setResolverHasMore(false);
    setResolverLoading(false);
    setResolverErrorCode("");
    setTrackingAwb("");
    setTrackingLoading(false);
    setTrackingResult(null);
    setTrackingError("");
    setResolvedOrder(null);
    setShowEtaHint(false);
  }, []);

  const resetChatState = useCallback(() => {
    resetFlow();
    setChatLanguage(null);
  }, [resetFlow]);

  const handleChatClick = useCallback(() => {
    resetChatState();
    setIsChatOpen(true);
  }, [resetChatState]);

  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const handleLanguageSelect = useCallback(
    (language) => {
      setChatLanguage(language);
      resetFlow();
    },
    [resetFlow]
  );

  const handleQueryChange = useCallback((value) => {
    setQueryValue(value);
    const type = detectInputType(value);
    setDetectedType(type);
  }, []);

  const fetchTracking = useCallback(
    async (awb) => {
      const cleanAwb = (awb || "").trim();
      if (!cleanAwb) return null;
      const base = process.env.NEXT_PUBLIC_API_URL;
      if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");
      const url = `${base}/website/shipping/aramex/track?awb=${encodeURIComponent(cleanAwb)}&locale=${locale}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Tracking request failed");
      }
      const json = await res.json();
      if (!json?.success) {
        return null;
      }
      return json.data ?? null;
    },
    [locale]
  );

  const handleTrackAwb = useCallback(
    async (awb) => {
      setTrackingError("");
      setTrackingResult(null);
      setTrackingLoading(true);
      setShowEtaHint(false);
      try {
        const result = await fetchTracking(awb);
        if (!result) {
          setTrackingError(getCopy("trackingNotFound"));
          return null;
        }
        setTrackingResult(result);
        return result;
      } catch (error) {
        setTrackingError(getCopy("trackingFetchError"));
        return null;
      } finally {
        setTrackingLoading(false);
      }
    },
    [fetchTracking, getCopy]
  );

  const handleTrackSubmit = useCallback(async () => {
    setInputError("");
    setResolverErrorCode("");
    setResolverMessage("");
    setResolverChoices([]);
    setResolverHasMore(false);
    setTrackingError("");
    setTrackingResult(null);
    setResolvedOrder(null);
    setTrackingAwb("");

    const trimmed = queryValue.trim();
    const detection = detectInputType(trimmed);
    setDetectedType(detection);

    if (!trimmed || !detection || detection === "unknown") {
      setInputError(getCopy("invalidInput"));
      return;
    }

    try {
      setResolverLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL;
      if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");
      const url = `${base}/website/track/resolve?query=${encodeURIComponent(trimmed)}&locale=${locale}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || json.success === false) {
        setResolverErrorCode(json?.code || "");
        setInputError(json?.message || getCopy("resolverError"));
        return;
      }

      const data = json.data ?? {};
      if (data.type === "mobile") {
        setResolverChoices(data.choices ?? []);
        setResolverMessage(data.message || getCopy("trackDescription"));
        setResolverHasMore(Boolean(data.has_more));
        return;
      }

      const awb = data.awb;
      if (!awb) {
        setInputError(getCopy("resolverError"));
        return;
      }

      setResolverChoices([]);
      setResolverMessage("");
      setResolverHasMore(false);
      setResolverErrorCode("");
      setResolvedOrder({
        order_id: data.order_id ?? null,
        order_number: data.order_number ?? null,
        awb,
      });
      setTrackingAwb(awb);
      setDetectedType(data.type || detection);
      await handleTrackAwb(awb);
    } catch (error) {
      setResolverErrorCode("");
      setInputError(getCopy("resolverError"));
    } finally {
      setResolverLoading(false);
    }
  }, [queryValue, locale, handleTrackAwb, getCopy]);

  const handleChoiceSelect = useCallback(
    (choice) => {
      const awb = choice?.awb || choice?.tracking_number;
      if (!awb) return;
      setResolverMessage("");
      setResolverChoices([]);
      setResolverHasMore(false);
      setResolverLoading(true);
      setResolverErrorCode("");
      setDetectedType("order");
      setTrackingAwb(awb);
      setResolvedOrder({
        order_id: choice?.order_id ?? null,
        order_number: choice?.order_number ?? null,
        awb,
      });
      handleTrackAwb(awb).finally(() => setResolverLoading(false));
    },
    [handleTrackAwb]
  );

  const detectionLabel = useMemo(() => {
    if (!detectedType) return "";
    const label = DETECTION_LABELS[detectedType];
    if (!label) return "";
    return chatLanguage === "ar" ? label.ar : label.en;
  }, [detectedType, chatLanguage]);

  const supportOrderNumber = useMemo(() => {
    if (resolvedOrder?.order_number) {
      return String(resolvedOrder.order_number).trim();
    }

    if (detectedType === "order") {
      return queryValue.replace(/^#/, "").trim();
    }

    return "";
  }, [resolvedOrder?.order_number, detectedType, queryValue]);

  const supportWhatsAppHref = useMemo(() => {
    const messageLines = [getCopy("supportWhatsAppText")];
    if (supportOrderNumber) {
      messageLines.push(`${getCopy("orderLabel")}: ${supportOrderNumber}`);
    }

    const message = messageLines.filter(Boolean).join("\n");
    const query = message ? `?text=${encodeURIComponent(message)}` : "";
    return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}${query}`;
  }, [getCopy, supportOrderNumber]);

  const lastUpdateValue = useMemo(() => {
    if (!trackingResult) return null;
    return (
      trackingResult.timeline?.[0]?.date || trackingResult.customer_status?.occurred_at || null
    );
  }, [trackingResult]);

  const formatEtaHint = useCallback(() => {
    if (!trackingResult) return "";
    if (lastUpdateValue) {
      const statusMessage = trackingResult.customer_status?.message;
      return `${getCopy("etaHintPrefix")} ${formatDateTime(lastUpdateValue)}${
        statusMessage ? ` · ${statusMessage}` : ""
      }`;
    }
    return getCopy("etaHintFallback");
  }, [trackingResult, lastUpdateValue, getCopy]);

  const renderChoiceCards = () => {
    if (!resolverChoices.length) return null;
    return (
      <div className="chatbot-choice-list">
        {resolverMessage && <p className="chatbot-choice-note">{resolverMessage}</p>}
        {resolverChoices.map((choice) => (
          <button
            key={choice.order_id}
            type="button"
            className="chatbot-choice-item"
            onClick={() => handleChoiceSelect(choice)}
          >
            <div className="chatbot-choice-row">
              <strong>#{choice.order_number}</strong>
              <span>
                {choice.currency} {choice.total}
              </span>
            </div>
            <p className="chatbot-choice-meta">
              {choice.date}
              {choice.masked_address ? ` · ${choice.masked_address}` : ""}
            </p>
          </button>
        ))}
        {resolverHasMore && <p className="chatbot-choice-note">{getCopy("moreOrdersHint")}</p>}
      </div>
    );
  };

  const renderActionButtons = (stage) => {
    const delivered = stage === "DELIVERED";
    const inTransit = ["IN_TRANSIT", "OUT_FOR_DELIVERY", "PROCESSING"].includes(stage);
    if (!delivered && !inTransit) return null;

    const orderNumber = resolvedOrder?.order_number;
    const orderLink = orderNumber ? `/account/order/details/${orderNumber}` : "/account/orders";

    return (
      <div className="chatbot-card__actions chatbot-card__actions--wrap">
        {delivered && orderNumber && (
          <>
            <a
              className="chatbot-chip"
              href={`${orderLink}#refund`}
              target="_blank"
              rel="noreferrer"
            >
              {getCopy("refundCta")}
            </a>
            <a
              className="chatbot-chip"
              href={`${orderLink}#exchange`}
              target="_blank"
              rel="noreferrer"
            >
              {getCopy("exchangeCta")}
            </a>
          </>
        )}
        <a className="chatbot-chip" href={supportWhatsAppHref} target="_blank" rel="noreferrer">
          {getCopy("supportCta")}
        </a>
        {inTransit && (
          <div className="chatbot-eta-group">
            <button type="button" className="chatbot-chip" onClick={() => setShowEtaHint((prev) => !prev)}>
              {getCopy("etaButton")}
            </button>
            {showEtaHint && <p className="chatbot-eta-hint">{formatEtaHint()}</p>}
          </div>
        )}
      </div>
    );
  };

  const renderTrackingCard = () => {
    if (!trackingResult || !trackingResult.customer_status) return null;
    const stage = trackingResult.customer_status.stage;
    const lastUpdateLabel = lastUpdateValue
      ? formatDateTime(lastUpdateValue)
      : getCopy("lastUpdateUnavailable");

    return (
      <div className="chatbot-success" style={{ textAlign: chatLanguage === "ar" ? "right" : "left" }}>
        <div className="mb-1">
          <strong>{getCopy("awbLabel")}:</strong>{" "}
          {trackingResult.tracking_payload?.WaybillNumber || trackingAwb}
        </div>
        {resolvedOrder?.order_number && (
          <div className="mb-1">
            <strong>{getCopy("orderLabel")}:</strong>{" "}
            {resolvedOrder.order_number}
          </div>
        )}
        <div className="mb-1">
          <strong>{getCopy("statusLabel")}:</strong>{" "}
          {trackingResult.customer_status.title}
        </div>
        <p className="mb-1 text-muted">{trackingResult.customer_status.message}</p>
        {trackingResult.is_fallback && (
          <p className="mb-1 small text-warning">{t("TrackingFallbackInfo")}</p>
        )}
        <div className="small text-muted">
          <strong>{t("TrackingCarrierCodeLabel")}:</strong>{" "}
          {trackingResult.aramex_status_code ?? "-"} | <strong>{t("TrackingCarrierStatusLabel")}:</strong>{" "}
          {trackingResult.aramex?.name ?? "-"} | <strong>{t("TrackingCarrierLocationLabel")}:</strong>{" "}
          {trackingResult.aramex?.location ?? "-"}
        </div>
        <div className="small text-muted">
          <strong>{getCopy("lastUpdateLabel")}:</strong>{" "}
          {lastUpdateLabel}
        </div>
        {renderActionButtons(stage)}
      </div>
    );
  };
  if (SHOW_WHATSAPP_INSTEAD_OF_CHATBOT) {
    return (
      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noreferrer"
        className="chat-flat-btn whatsapp-flat-btn"
        aria-label="Chat with us on WhatsApp"
      >
        <RiWhatsappFill />
      </a>
    );
  }

  if (!isChatOpen) {
    return (
      <button type="button" className="chat-flat-btn" onClick={handleChatClick} aria-label={getCopy("chatTitle") || "Chat with Cuple"}>
        <img src="/assets/images/icon/Chatbot.png" alt="Chatbot" className="chat-icon-img" />
      </button>
    );
  }

  return (
    <div className={`chatbot-overlay ${chatLanguage === "ar" ? "rtl" : ""}`} role="dialog" aria-modal="true" aria-label={getCopy("chatTitle") || "Chat with Cuple"}>
      <div className="chatbot-backdrop" onClick={handleCloseChat}></div>
      <div className="chatbot-card">
        <div className="chatbot-card__header">
          <div className="chatbot-card__title">
            <i className="fas fa-comment-dots" aria-hidden="true"></i>
            <span>{getCopy("chatTitle")}</span>
          </div>
          <button type="button" className="chatbot-card__close" onClick={handleCloseChat} aria-label="Close chat">
            &times;
          </button>
        </div>
        <div className="chatbot-card__body">
          <p className="chatbot-card__prompt">{getCopy("languagePrompt")}</p>
          <div className="chatbot-card__actions">
            <button type="button" className={`chatbot-chip ${chatLanguage === "en" ? "active" : ""}`} onClick={() => handleLanguageSelect("en")}>English</button>
            <button type="button" className={`chatbot-chip ${chatLanguage === "ar" ? "active" : ""}`} onClick={() => handleLanguageSelect("ar")}>العربية</button>
          </div>
          {chatLanguage && (
            <>
              <div className="chatbot-divider" />
              <p className="chatbot-card__prompt">{getCopy("trackTitle")}</p>
              <p className="chatbot-track-description">{getCopy("trackDescription")}</p>
              <label className="chatbot-track-label">{getCopy("trackLabel")}</label>
              <input
                type="text"
                className="chatbot-input"
                placeholder={getCopy("trackPlaceholder")}
                value={queryValue}
                onChange={(e) => handleQueryChange(e.target.value)}
              />
              <p className="chatbot-track-examples">{getCopy("trackExamples")}</p>
              {detectionLabel && <p className="chatbot-detection">{detectionLabel}</p>}
              {inputError && <p className="chatbot-error">{inputError}</p>}
              <button type="button" className="chatbot-submit" onClick={handleTrackSubmit} disabled={resolverLoading || trackingLoading}>
                {resolverLoading ? getCopy("lookUpLoading") : getCopy("trackButton")}
              </button>
              {resolverLoading && <p className="chatbot-success">{getCopy("lookUpLoading")}</p>}
              {resolverErrorCode === "order_missing_tracking" && (
                <div className="chatbot-cta-group">
                  <button type="button" className="chatbot-chip chatbot-chip--disabled" disabled>
                    {getCopy("tryAgainLater")}
                  </button>
                  <a className="chatbot-chip" href={supportWhatsAppHref} target="_blank" rel="noreferrer">
                    {getCopy("contactSupport")}
                  </a>
                </div>
              )}
              {renderChoiceCards()}
              {trackingLoading && <p className="chatbot-success">{getCopy("lookUpLoading")}</p>}
              {trackingError && <p className="chatbot-error">{trackingError}</p>}
              {renderTrackingCard()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
